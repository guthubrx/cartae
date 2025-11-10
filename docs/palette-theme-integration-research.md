# Recherche: Meilleures Pratiques - Palettes de Couleurs Light/Dark

**Date:** Session 69 - Recherche préliminaire
**Objectif:** Analyser les meilleures pratiques pour intégrer les palettes adaptatives dans un système de theming

---

## 📚 Sources de Référence

### 1. Material Design 3 (Google)

**Approche:**
- **Token-based color system**: Utilisation de tokens sémantiques plutôt que de valeurs absolues
- **Dynamic color**: Adaptation automatique selon le contexte (light/dark), génération algorithmique depuis une couleur source (wallpaper user)
- **HCT Color Space**: Système de couleur perceptuel (Hue, Chroma, Tone) aligné avec perception humaine, contrairement à HSL
- **Tonal Palettes**: Chaque couleur clé génère une palette de 13 tonalités (0-100, noir à blanc)
- **5 Key Colors**: Primary, Secondary, Tertiary, Neutral, Error - chacun avec palette tonale complète
- **Surface colors**: Hiérarchie de surfaces (surface, surface-variant, surface-container)
- **Contrast requirements**: WCAG AA minimum respecté automatiquement, avec des niveaux de contraste définis

**Structure:**
```typescript
interface MaterialColorTokens {
  // 5 Key Colors avec palettes tonales (13 tones chacune)
  primary: ColorScheme;      // Base color, main components (buttons, active states)
  secondary: ColorScheme;    // Less prominent components (filter chips)
  tertiary: ColorScheme;     // Contrasting accents, balance primary/secondary
  error: ColorScheme;        // Error states et messages
  neutral: ColorScheme;      // Backgrounds, surfaces
  neutralVariant: ColorScheme;
}

interface ColorScheme {
  light: ColorValues;
  dark: ColorValues;
}

interface ColorValues {
  color: string;           // Couleur principale
  onColor: string;         // Couleur du texte sur cette couleur (contraste garanti)
  colorContainer: string;  // Variant conteneur (moins saturé)
  onColorContainer: string; // Texte sur conteneur
}

// HCT Color Space (perceptually accurate)
interface HCTColor {
  hue: number;        // 0-360
  chroma: number;     // Colorfulness (saturation perceptuelle)
  tone: number;       // 0-100 (lightness perceptuelle)
}
```

**Principes Clés:**
- **Tonal Palettes**: Chaque key color → 13 tones (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100)
- **Dynamic Color**: Génération automatique palette complète depuis 1 couleur source (wallpaper)
- **Perceptual Accuracy**: HCT garantit lightness/chroma alignés avec perception humaine
- **Accessibilité intégrée**: Tous les rôles de couleur respectent WCAG AA automatiquement
- **On-colors automatiques**: Chaque couleur a un "on" color calculé pour contraste optimal
- **Container variants**: Versions moins saturées pour conteneurs (backgrounds légers)

**Exemple Palette Tonale (Primary):**
```
Primary-0:   #000000 (noir pur)
Primary-10:  #1a0033 (très sombre)
Primary-20:  #330066
Primary-30:  #4d0099
Primary-40:  #6600cc (couleur primaire sombre)
Primary-50:  #8000ff
Primary-60:  #9933ff
Primary-70:  #b366ff
Primary-80:  #cc99ff (couleur primaire claire)
Primary-90:  #e6ccff
Primary-95:  #f2e6ff
Primary-99:  #fdfbff
Primary-100: #ffffff (blanc pur)
```

**Light Theme utilise:** Primary-40, Secondary-40, Tertiary-40 (tons moyens-foncés)
**Dark Theme utilise:** Primary-80, Secondary-80, Tertiary-80 (tons clairs)

**Référence:** https://m3.material.io/styles/color/the-color-system/tokens

---

### 2. Apple Human Interface Guidelines

**Approche:**
- **Semantic colors**: Utilisation de couleurs sémantiques (label, fill, background, separator)
- **System colors**: Couleurs système prédéfinies qui s'adaptent automatiquement (blue, green, red, etc.)
- **Base & Elevated layers**: Deux sets de couleurs de fond pour perception de profondeur en Dark Mode
- **Adaptive colors**: Toutes les couleurs système s'adaptent automatiquement Light/Dark
- **Contrast requirements**: Ratio minimum **7:1** (plus strict que WCAG AA 4.5:1), surtout pour petit texte
- **OLED optimization**: Dark Mode optimisé pour économie batterie sur écrans OLED
- **Liquid Glass (2025)**: Nouvelle esthétique avec translucence, profondeur, fluidité

**Structure:**
```typescript
interface AppleColorSystem {
  // Couleurs sémantiques (labels, text)
  label: { light: string; dark: string };           // Texte principal
  secondaryLabel: { light: string; dark: string };  // Texte secondaire
  tertiaryLabel: { light: string; dark: string };   // Texte tertiaire
  quaternaryLabel: { light: string; dark: string }; // Texte désactivé

  // Couleurs sémantiques (fills, backgrounds)
  fill: { light: string; dark: string };              // Fill principal
  secondaryFill: { light: string; dark: string };     // Fill secondaire
  tertiaryFill: { light: string; dark: string };      // Fill tertiaire
  quaternaryFill: { light: string; dark: string };    // Fill désactivé

  // Backgrounds avec système Base/Elevated (Dark Mode depth)
  systemBackground: {
    light: string;  // #ffffff
    dark: string;   // #000000 (base - plus sombre, recule visuellement)
  };
  secondarySystemBackground: {
    light: string;  // #f2f2f7
    dark: string;   // #1c1c1e (elevated - plus clair, avance visuellement)
  };
  tertiarySystemBackground: {
    light: string;
    dark: string;   // #2c2c2e (plus elevated encore)
  };

  // Couleurs système (accents adaptatifs)
  systemBlue: { light: '#007AFF'; dark: '#0A84FF' };
  systemGreen: { light: '#34C759'; dark: '#30D158' };
  systemRed: { light: '#FF3B30'; dark: '#FF453A' };
  systemOrange: { light: '#FF9500'; dark: '#FF9F0A' };
  systemYellow: { light: '#FFCC00'; dark: '#FFD60A' };
  systemPurple: { light: '#AF52DE'; dark: '#BF5AF2' };
  systemPink: { light: '#FF2D55'; dark: '#FF375F' };
  systemTeal: { light: '#5AC8FA'; dark: '#64D2FF' };
  systemIndigo: { light: '#5856D6'; dark: '#5E5CE6' };

  // Separators
  separator: { light: string; dark: string };
  opaqueSeparator: { light: string; dark: string };
}
```

**Principes Clés:**
- **Base vs Elevated (Dark Mode only)**: Base colors = plus sombres (fond recule), Elevated = plus clairs (interface avance)
- **Layering visuel**: Système permet empiler interfaces sombres avec perception de profondeur claire
- **System Colors obligatoires**: Utiliser `label`, `systemBackground`, `separator` au lieu de hardcoded values
- **Contraste 7:1**: Plus strict que WCAG AA (4.5:1), assure lisibilité même petit texte
- **Never hardcode**: Éviter valeurs fixes, toujours utiliser system colors adaptatifs
- **Test both modes**: Tester app en Light ET Dark systématiquement, transition seamless obligatoire
- **OLED battery saving**: Dark Mode utilise noir pur (#000000) pour économie batterie OLED

**Exemple Depth System (Dark Mode):**
```
Layer 0 (Background):           #000000 (base - noir pur, recule)
Layer 1 (Cards, Panels):        #1c1c1e (elevated - gris très sombre, avance)
Layer 2 (Modals, Popovers):     #2c2c2e (more elevated - gris sombre, avance encore)
Layer 3 (Tooltips):             #3a3a3c (most elevated)
```

**2025 Update - Liquid Glass:**
- Translucence (vitrification, glass-morphism)
- Depth (layering visuel accentué)
- Fluid responsiveness (animations fluides cross-platform)
- Plus grande refonte visuelle depuis 2013

**Référence:** https://developer.apple.com/design/human-interface-guidelines/color

---

### 3. Fluent Design System (Microsoft)

**Approche:**
- **Design Tokens (2-tier system)**: Global tokens (raw values) + Alias tokens (semantic meaning)
- **3 Color Palettes**: Neutral, Shared, Brand - chacune avec rôle spécifique
- **Adaptive theming**: Support Light, Dark, High-Contrast, et branded elements
- **JavaScript-driven**: Système vit entièrement en JS, émet CSS custom properties
- **WCAG compliance**: Contraste automatique garanti, texte toujours lisible
- **Cross-platform consistency**: Design tokens partagés entre plateformes Microsoft 365

**Architecture Design Tokens:**

**1. Global Tokens** (context-agnostic, raw values)
```typescript
interface GlobalTokens {
  colorNeutralGray10: '#fafafa';
  colorNeutralGray20: '#f5f5f5';
  colorNeutralGray30: '#e5e5e5';
  // ... jusqu'à gray160
  colorBrandPrimary: '#0078d4';  // Raw hex values
  colorSharedRed10: '#fef0f0';
  // ...
}
```

**2. Alias Tokens** (context-specific, semantic)
```typescript
interface AliasTokens {
  colorBackgroundPrimary: 'var(--colorNeutralGray10)';
  colorTextPrimary: 'var(--colorNeutralGray160)';
  colorAccentPrimary: 'var(--colorBrandPrimary)';
  // Semantic names → reference global tokens
}
```

**Structure des 3 Palettes:**

```typescript
interface FluentColorSystem {
  theme: 'light' | 'dark' | 'highContrast' | 'branded';

  // 1. NEUTRAL PALETTE - Foundation (grays)
  neutral: {
    gray10: string;   // Lightest
    gray20: string;
    // ... progression de 10 en 10
    gray160: string;  // Darkest
    // Usages: surfaces, text, layout, state changes
  };

  // 2. SHARED PALETTE - Cross-app recognition
  shared: {
    red: SharedColor;      // Alerts, errors
    orange: SharedColor;   // Warnings
    yellow: SharedColor;   // Cautions
    green: SharedColor;    // Success
    blue: SharedColor;     // Info
    purple: SharedColor;   // Creative
    pink: SharedColor;     // Social
    // Utilisés pour: avatars, badges, status, accents
    // Cohérents entre Microsoft 365 apps (reconnaissance mentale rapide)
  };

  // 3. BRAND PALETTE - Product identity
  brand: {
    teamsBlue: string;    // Microsoft Teams
    excelGreen: string;   // Excel
    wordBlue: string;     // Word
    outlookBlue: string;  // Outlook
    powerpointRed: string; // PowerPoint
    // Ancre utilisateur dans expérience produit spécifique
  };

  // Semantic mappings (via alias tokens)
  semantic: {
    background: string;       // → colorNeutralGray10 (light) / gray160 (dark)
    foreground: string;       // → colorNeutralGray160 (light) / gray10 (dark)
    accent: string;          // → colorBrandPrimary
    surface: string;
    border: string;
    // ...
  };
}

interface SharedColor {
  shade10: string;  // Lightest
  shade20: string;
  shade30: string;
  primary: string;  // Main color (shade50)
  shade60: string;
  shade70: string;
  shade80: string;  // Darkest
  // Dark mode: saturation/brightness adjusted pour réduire eye strain
}
```

**Principes Clés:**
- **Two-tier tokens**: Global (raw) → Alias (semantic) = easier color choice sans chercher hex codes
- **Neutral = Foundation**: Grays pour tous les éléments structurels (surfaces, text, layouts)
- **Shared = Recognition**: Couleurs cohérentes cross-apps (badge rouge = même dans Word, Excel, Teams)
- **Brand = Identity**: Couleurs produit spécifiques (Teams blue ≠ Outlook blue)
- **Dark Mode adjustment**: Shared colors adjustés en saturation/brightness (moins eye strain)
- **Accessibility-first**: Ne jamais rely sur couleur seule, toujours pairer avec text/graphics/icons
- **WCAG contrast**: Contraste garanti pour low vision / color-blindness users
- **Personalization**: Support pour customization user (accessibility needs)

**Exemple Workflow:**
```typescript
// ❌ Mauvais: Hardcoded
background-color: #0078d4;

// ✅ Bon: Global token
background-color: var(--colorBrandPrimary);

// ✅✅ Meilleur: Alias token (semantic)
background-color: var(--colorAccentPrimary);
```

**High-Contrast Mode:**
- Contraste maximal (noir/blanc purs)
- Couleurs vives pour accents
- Borders épaisses
- Spécifiquement pour accessibilité

**Référence:** https://fluent2.microsoft.design/

---

### 4. Obsidian Themes

**Approche:**
- **CSS Variables**: Utilisation extensive de variables CSS (hierarchical system)
- **Class-based switching**: Classes `.theme-light` et `.theme-dark` sur `document.body`
- **LocalStorage persistence**: Préférence thème stockée dans `localStorage.getItem('site-theme')`
- **Cascading hierarchy**: Foundation variables → Component variables → Editor variables
- **6 Primary categories**: Color, Typography, Layout, Spacing, Elevation, Animation
- **HSL Color System**: Accents définis en HSL (H/S/L séparés) pour faciliter ajustements
- **Compatibility**: Compatibilité totale avec thèmes Obsidian community (1000+ thèmes)
- **Flexibility**: Flexibilité maximale pour créateurs de thèmes

**Theme Switching Mechanism:**
```typescript
// Detection + Application du thème
const theme = localStorage.getItem('site-theme'); // 'light' | 'dark' | null
const bodyClassList = document.body.classList;

if (theme && theme !== 'light') {
  bodyClassList.remove('theme-light');
  bodyClassList.add('theme-' + theme);  // 'theme-dark'
} else {
  bodyClassList.add('theme-light');     // Default
}

// Au changement thème utilisateur
function setTheme(newTheme: 'light' | 'dark') {
  localStorage.setItem('site-theme', newTheme);
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${newTheme}`);
}
```

**Structure CSS Variables (exemple):**
```css
/* ===== THEME LIGHT ===== */
.theme-light {
  /* Foundation colors - Base palette */
  --color-base-00: #ffffff;    /* Pure white, main background */
  --color-base-10: #f5f5f5;    /* Very light gray */
  --color-base-20: #e5e5e5;    /* Light gray, borders */
  --color-base-30: #d0d0d0;
  --color-base-40: #b0b0b0;
  --color-base-50: #909090;    /* Mid gray */
  --color-base-60: #707070;
  --color-base-70: #505050;
  --color-base-80: #303030;    /* Dark gray, text */
  --color-base-90: #171717;
  --color-base-100: #0f0f0f;   /* Near black */

  /* Accent colors - HSL system (modifiable per theme) */
  --accent-h: 217;    /* Hue (0-360) */
  --accent-s: 89%;    /* Saturation */
  --accent-l: 61%;    /* Lightness */
  --accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l));

  /* Semantic colors (derived from base) */
  --background-primary: var(--color-base-00);
  --background-secondary: var(--color-base-10);
  --text-normal: var(--color-base-100);
  --text-muted: var(--color-base-60);
  --interactive-accent: var(--accent);
  /* ... 80+ variables */
}

/* ===== THEME DARK ===== */
.theme-dark {
  /* Foundation colors - Inverted base palette */
  --color-base-00: #0f0f0f;    /* Near black, main background */
  --color-base-10: #171717;    /* Very dark gray */
  --color-base-20: #262626;    /* Dark gray, elevated surfaces */
  --color-base-30: #3a3a3a;
  --color-base-40: #505050;
  --color-base-50: #707070;    /* Mid gray */
  --color-base-60: #909090;
  --color-base-70: #b0b0b0;
  --color-base-80: #d0d0d0;    /* Light gray, text */
  --color-base-90: #e5e5e5;
  --color-base-100: #f5f5f5;   /* Near white */

  /* Accent colors - Mêmes HSL (mais peut être ajusté pour dark) */
  --accent-h: 217;
  --accent-s: 89%;
  --accent-l: 61%;    /* Peut être augmenté en dark pour meilleure visibilité */
  --accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l));

  /* Semantic colors (derived from base - inversé) */
  --background-primary: var(--color-base-00);
  --background-secondary: var(--color-base-10);
  --text-normal: var(--color-base-100);
  --text-muted: var(--color-base-60);
  --interactive-accent: var(--accent);
  /* ... */
}
```

**Cascading Hierarchy (ordre d'application):**
```
1. Foundation Variables (base colors, accent HSL)
     ↓
2. Component Variables (buttons, inputs, cards)
     ↓ (inherit foundation)
3. Editor Variables (markdown, code blocks)
     ↓ (inherit foundation + component)
4. Plugin Variables (community plugins)
```

**Principes Clés:**
- **Variables hiérarchiques**: Modifier foundation → cascade automatic dans tous les components
- **HSL accent system**: Hue/Saturation/Lightness séparés = adjust lightness facilement en dark mode
- **Inverted base palette**: Light mode: base-00=white → base-100=black; Dark mode: inversé
- **Semantic naming**: `--background-primary` plutôt que `--color-base-00` (plus clair pour users)
- **LocalStorage persistence**: Thème persisté entre sessions
- **Body class switching**: `.theme-light` / `.theme-dark` = simple CSS cascade
- **No JavaScript required (CSS only)**: Thème fonctionne purement en CSS après classe appliquée

**6 Primary Categories:**
1. **Colors**: Base palette, accent, semantic (backgrounds, text, borders)
2. **Typography**: Font families, sizes, weights, line heights
3. **Layout**: Widths, heights, paddings, margins
4. **Spacing**: Consistent spacing scale
5. **Elevation**: Shadows, z-index layers
6. **Animation**: Transition durations, easing functions

**Compatibilité Community Themes:**
- 1000+ thèmes Obsidian utilisent cette structure
- Cartae peut parser thèmes `.css` Obsidian et extraire variables
- Import thème Obsidian → application directe dans Cartae (pas de conversion)
- Fallback gracieux si variable manquante

---

## 🎯 Recommandations pour Cartae

### 1. Structure de Palette Adaptative

**Recommandation: Structure hybride Material Design + Obsidian**

```typescript
interface AdaptiveColorPalette {
  id: string;
  name: string;
  description: string;
  
  // Couleurs de base (fallback)
  colors: string[];
  
  // Variantes light/dark (comme Obsidian)
  variants?: {
    light: string[];
    dark: string[];
  };
  
  // Fond de carte adaptatif
  canvasBackground?: {
    light: string;
    dark: string;
  };
  
  // Couleurs sémantiques (comme Material Design)
  semantic?: {
    primary?: { light: string; dark: string };
    secondary?: { light: string; dark: string };
    accent?: { light: string; dark: string };
    surface?: { light: string; dark: string };
    error?: { light: string; dark: string };
    warning?: { light: string; dark: string };
    success?: { light: string; dark: string };
    info?: { light: string; dark: string };
  };
  
  // Metadata (pour compatibilité et recherche)
  metadata?: {
    tags: string[];
    category: 'colorful' | 'neutral' | 'pastel' | 'vibrant' | 'earth' | 'ocean';
    contrast: 'low' | 'medium' | 'high';
    wcagLevel: 'AA' | 'AAA';
    compatibleThemes: string[];
  };
}
```

### 2. Principes d'Intégration

**1. Hiérarchie de Priorité:**
```
Obsidian Theme Variables → Palette Semantic Colors → Palette Variants → Palette Colors (fallback)
```

**2. Adaptation Automatique:**
- Détection automatique du thème actif (light/dark)
- Application automatique des variantes appropriées
- Synchronisation avec le système de thème Obsidian

**3. Contraste et Accessibilité:**
- Validation automatique des ratios de contraste
- Respect minimum WCAG AA (4.5:1)
- Support pour WCAG AAA (7:1) quand possible
- Calcul automatique de la couleur de texte optimale

**4. Séparation des Responsabilités:**
- **Interface Theme**: Fond de l'interface, textes, bordures
- **Palette Colors**: Couleurs des nœuds (mindmap)
- **Canvas Background**: Fond de la zone de travail (séparé de l'interface)

### 3. Mapping vers les Variables CSS

**Structure proposée:**

```css
:root {
  /* Palette colors (from active palette) */
  --palette-color-0: var(--palette-variant-light-0, var(--palette-color-0-default));
  --palette-color-1: var(--palette-variant-light-1, var(--palette-color-1-default));
  /* ... */
  
  /* Semantic colors (from palette semantic mapping) */
  --palette-primary: var(--palette-semantic-primary-light, var(--palette-color-0));
  --palette-secondary: var(--palette-semantic-secondary-light, var(--palette-color-1));
  /* ... */
  
  /* Canvas background */
  --canvas-background: var(--palette-canvas-light, var(--background-secondary));
}

.theme-dark {
  /* Palette colors (dark variants) */
  --palette-color-0: var(--palette-variant-dark-0, var(--palette-color-0-default));
  /* ... */
  
  /* Semantic colors (dark variants) */
  --palette-primary: var(--palette-semantic-primary-dark, var(--palette-color-0));
  /* ... */
  
  /* Canvas background (dark) */
  --canvas-background: var(--palette-canvas-dark, var(--background-secondary));
}
```

### 4. Bonnes Pratiques Spécifiques

**1. Naming Conventions:**
- Utiliser des noms sémantiques (primary, secondary, accent)
- Préfixer les variables de palette avec `--palette-`
- Préfixer les variables sémantiques avec `--palette-semantic-`
- Préfixer les variables de canvas avec `--canvas-`

**2. Contraste:**
- Toujours calculer le contraste avant d'appliquer une couleur
- Utiliser `getOptimalTextColor()` pour déterminer la couleur de texte
- Valider les ratios avec `getContrastRatio()`
- Documenter les niveaux de contraste dans les metadata

**3. Transitions:**
- Transitions fluides lors du changement de thème (0.2s - 0.3s)
- Éviter les changements brusques de couleur
- Préserver la cohérence visuelle

**4. Performance:**
- Cache des palettes calculées
- Éviter les recalculs inutiles
- Utiliser `useMemo` pour les calculs coûteux

**5. Compatibilité:**
- Rétrocompatibilité avec les palettes existantes (sans variantes)
- Support pour les thèmes Obsidian existants
- Migration automatique si possible

---

## 📊 Comparaison des Approches

| Aspect | Material Design 3 | Apple HIG | Fluent Design | Obsidian | **Cartae (Recommandé)** |
|--------|-------------------|-----------|---------------|----------|------------------------|
| **Structure** | Token-based | Semantic | Theme-aware | CSS Variables | **Hybride (Tokens + CSS Vars)** |
| **Variantes** | Light/Dark | Light/Dark | Light/Dark/HighContrast | Light/Dark (optional) | **Light/Dark (required)** |
| **Sémantique** | Oui (onColor) | Oui (label, fill) | Oui (semantic) | Non | **Oui (semantic mapping)** |
| **Flexibilité** | Moyenne | Moyenne | Moyenne | **Élevée** | **Élevée** |
| **Compatibilité** | Material only | Apple only | Windows only | **Obsidian** | **Obsidian + Custom** |
| **Canvas BG** | Implícite | Implícite | Implícite | **Non** | **Explicite (séparé)** |

---

## ✅ Checklist d'Implémentation

### Phase 1: Structure
- [ ] Définir l'interface `AdaptiveColorPalette` complète
- [ ] Créer les fonctions utilitaires (`getPaletteForTheme`, `getSemanticColors`)
- [ ] Créer le système de validation de contraste

### Phase 2: Migration
- [ ] Migrer les palettes existantes vers la nouvelle structure
- [ ] Ajouter les variantes light/dark pour les palettes principales
- [ ] Ajouter les canvas backgrounds adaptatifs

### Phase 3: Intégration
- [ ] Intégrer avec ThemeManager
- [ ] Créer le hook `usePaletteTheme`
- [ ] Mapper vers les variables CSS

### Phase 4: UI
- [ ] Restaurer MenuBar dans DockableLayoutV2
- [ ] Restaurer StatusBar dans DockableLayoutV2
- [ ] Ajuster les styles CSS

### Phase 5: Tests
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests visuels
- [ ] Tests de contraste WCAG

---

## 📖 Références

1. **Material Design 3**: https://m3.material.io/styles/color/the-color-system/tokens
2. **Apple Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/color
3. **Fluent Design System**: https://fluent2.microsoft.design/
4. **Obsidian Theme Documentation**: https://docs.obsidian.md/Reference/CSS+variables/CSS+variables
5. **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_customize&levels=aaa
6. **CSS Custom Properties Best Practices**: https://css-tricks.com/a-complete-guide-to-custom-properties/

---

**Conclusion:** L'approche recommandée combine la flexibilité d'Obsidian avec la structure sémantique de Material Design, tout en ajoutant la séparation explicite du canvas background. Cette approche offre le meilleur compromis entre flexibilité, compatibilité et maintenabilité.

