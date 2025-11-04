# Recherche: Meilleures Pratiques - Palettes de Couleurs Light/Dark

**Date:** Session 69 - Recherche préliminaire
**Objectif:** Analyser les meilleures pratiques pour intégrer les palettes adaptatives dans un système de theming

---

## 📚 Sources de Référence

### 1. Material Design 3 (Google)

**Approche:**
- **Token-based color system**: Utilisation de tokens sémantiques plutôt que de valeurs absolues
- **Dynamic color**: Adaptation automatique selon le contexte (light/dark)
- **Surface colors**: Hiérarchie de surfaces (surface, surface-variant, surface-container)
- **Contrast requirements**: WCAG AA minimum, avec des niveaux de contraste définis

**Structure:**
```typescript
interface MaterialColorTokens {
  primary: ColorScheme;
  secondary: ColorScheme;
  tertiary: ColorScheme;
  error: ColorScheme;
  neutral: ColorScheme;
  neutralVariant: ColorScheme;
}

interface ColorScheme {
  light: ColorValues;
  dark: ColorValues;
}

interface ColorValues {
  color: string;
  onColor: string; // Couleur du texte sur cette couleur
  colorContainer: string;
  onColorContainer: string;
}
```

**Principes:**
- Chaque couleur a une couleur "on" (texte) associée
- Les surfaces sont hiérarchisées (surface, surface-variant, etc.)
- Les couleurs s'adaptent automatiquement selon le mode

**Référence:** https://m3.material.io/styles/color/the-color-system/tokens

---

### 2. Apple Human Interface Guidelines

**Approche:**
- **Semantic colors**: Utilisation de couleurs sémantiques (label, fill, background)
- **Adaptive colors**: Couleurs qui s'adaptent automatiquement
- **System colors**: Couleurs système prédéfinies (blue, green, red, etc.)
- **Contrast ratios**: Guidelines strictes pour l'accessibilité

**Structure:**
```typescript
interface AppleColorSystem {
  // Couleurs sémantiques
  label: { light: string; dark: string };
  secondaryLabel: { light: string; dark: string };
  tertiaryLabel: { light: string; dark: string };
  fill: { light: string; dark: string };
  secondaryFill: { light: string; dark: string };
  background: { light: string; dark: string };
  secondaryBackground: { light: string; dark: string };
  
  // Couleurs système
  systemBlue: { light: string; dark: string };
  systemGreen: { light: string; dark: string };
  systemRed: { light: string; dark: string };
  // ...
}
```

**Principes:**
- Séparation claire entre couleurs sémantiques et couleurs système
- Adaptation automatique selon le mode
- Respect des guidelines d'accessibilité Apple

**Référence:** https://developer.apple.com/design/human-interface-guidelines/color

---

### 3. Fluent Design System (Microsoft)

**Approche:**
- **Theme-aware colors**: Couleurs qui s'adaptent au thème
- **Color palette**: Palette de couleurs prédéfinie avec variantes
- **Semantic colors**: Mapping sémantique des couleurs
- **Contrast themes**: Support pour les thèmes à haut contraste

**Structure:**
```typescript
interface FluentColorSystem {
  theme: 'light' | 'dark' | 'highContrast';
  palette: {
    neutral: string[];
    accent: string[];
    danger: string[];
    warning: string[];
    success: string[];
  };
  semantic: {
    background: string;
    foreground: string;
    accent: string;
    // ...
  };
}
```

**Principes:**
- Support pour les thèmes à haut contraste
- Palette de couleurs cohérente
- Adaptation automatique selon le thème

**Référence:** https://fluent2.microsoft.design/

---

### 4. Obsidian Themes

**Approche:**
- **CSS Variables**: Utilisation extensive de variables CSS
- **Palette structure**: Palettes avec variantes light/dark optionnelles
- **Compatibility**: Compatibilité avec les thèmes Obsidian existants
- **Flexibility**: Flexibilité maximale pour les créateurs de thèmes

**Structure (exemple):**
```css
.theme-light {
  --color-base-00: #ffffff;
  --color-base-10: #f5f5f5;
  --color-base-20: #e5e5e5;
  /* ... */
  --accent-h: 217;
  --accent-s: 89%;
  --accent-l: 61%;
  --accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
}

.theme-dark {
  --color-base-00: #0f0f0f;
  --color-base-10: #171717;
  --color-base-20: #262626;
  /* ... */
  --accent-h: 217;
  --accent-s: 89%;
  --accent-l: 61%;
  --accent: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
}
```

**Principes:**
- Variables CSS hiérarchiques
- Système HSL pour les couleurs d'accent
- Compatibilité avec les thèmes tiers
- Flexibilité maximale

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

