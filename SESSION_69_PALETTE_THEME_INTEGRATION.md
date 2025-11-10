# Session 69: Palette Light/Dark Theme Integration + Status/Menu Bar Restore

**Date:** À commencer
**Durée Estimée:** 8-10h
**LOC Estimés:** ~2,500
**Status:** ⏳ À faire
**Dépendances:** Sessions 55A-D, 56, 57 (Theme Foundations)
**Branche:** `session-69-palette-theme-integration`

---

## 🎯 Objectifs

1. **Intégrer les palettes light/dark dans le système de theming unifié**
   - Rechercher et appliquer les meilleures pratiques de design systems modernes
   - Créer un système cohérent de palettes adaptatives
   - Intégrer avec le système Obsidian Theme existant

2. **Restaurer MenuBar et StatusBar dans DockableLayoutV2**
   - Ajouter MenuBar en haut
   - Ajouter StatusBar en bas
   - S'assurer que le layout fonctionne correctement avec ces composants

3. **Améliorer le système de couleurs pour les nœuds**
   - Utiliser les palettes adaptatives selon le thème
   - Améliorer la lisibilité des couleurs

---

## 📋 Recherches Préliminaires - Meilleures Pratiques

### Design Systems Références
- **Material Design 3**: Token-based color system avec semantic colors
- **Apple Human Interface Guidelines**: Adaptive colors avec light/dark variants
- **Fluent Design (Microsoft)**: Theme-aware color system
- **Obsidian Themes**: Palette structure avec variants

### Principes Clés
1. **Semantic Color Naming**: Utiliser des noms sémantiques (primary, secondary, surface) plutôt que des valeurs absolues
2. **Contrast Ratios**: Respecter WCAG 2.1 AA (4.5:1) minimum, AAA (7:1) pour les textes importants
3. **Color Token System**: Variables CSS hiérarchiques (base → semantic → component)
4. **Adaptive Palettes**: Couleurs qui s'adaptent automatiquement selon le contexte (light/dark)
5. **Canvas Background**: Séparer le fond de carte du fond de l'interface

---

## 📋 Livrables

### 1. Recherche et Documentation (~2h, ~200 LOC)

**Fichier: `docs/palette-theme-integration-research.md`**
- Analyse des meilleures pratiques (Material Design 3, Apple HIG, Fluent Design, Obsidian)
- Comparaison des approches de palettes adaptatives
- Recommandations pour notre système
- Exemples de structures de palettes light/dark

### 2. Extension du Système de Palette (~3h, ~800 LOC)

**Fichier: `apps/web/src/themes/colorPalettes.ts` (modifications)**
- [ ] Améliorer l'interface `ColorPalette` avec:
  - Support complet des variantes light/dark
  - Canvas background adaptatif
  - Semantic color mapping (primary, secondary, accent, etc.)
  - Metadata pour les palettes (tags, category, compatibility)
- [ ] Créer fonction `getPaletteForTheme()` qui retourne la palette complète adaptée
- [ ] Créer fonction `getSemanticColors()` pour mapper les couleurs de palette vers les couleurs sémantiques
- [ ] Créer fonction `validatePaletteContrast()` pour vérifier les ratios WCAG
- [ ] Documentation complète des nouvelles fonctions

**Fichier: `apps/web/src/themes/paletteThemeMapper.ts` (nouveau)**
- [ ] Mapper les palettes vers les variables CSS du thème
- [ ] Gérer les transitions entre light/dark
- [ ] Appliquer les couleurs sémantiques aux composants

### 3. Mise à Jour des Palettes Existentes (~2h, ~400 LOC)

**Fichier: `apps/web/src/plugins/official/color-palettes-collection/index.ts` (modifications)**
- [ ] Ajouter variantes light/dark à toutes les palettes principales (Vibrant, Pastel, Earth, Neon, Ocean, etc.)
- [ ] Ajouter canvas background adaptatif pour chaque palette
- [ ] Créer des palettes "Adaptive" qui s'adaptent automatiquement
- [ ] Documenter chaque palette avec metadata

**Exemple de structure:**
```typescript
{
  id: 'vibrant-adaptive',
  name: 'Vibrant Adaptive',
  description: 'Couleurs vives adaptées au thème',
  colors: [...], // Fallback
  variants: {
    light: [...], // Couleurs plus intenses pour light
    dark: [...],  // Couleurs plus claires pour dark
  },
  canvasBackground: {
    light: '#ffffff',
    dark: '#1e293b',
  },
  semantic: {
    primary: { light: '#3b82f6', dark: '#60a5fa' },
    secondary: { light: '#8b5cf6', dark: '#a78bfa' },
    // ...
  },
  metadata: {
    tags: ['vibrant', 'adaptive', 'modern'],
    category: 'colorful',
    contrast: 'high',
    wcagLevel: 'AA',
  },
}
```

### 4. Intégration avec le Système de Thème (~2h, ~600 LOC)

**Fichier: `apps/web/src/core/theme/ThemeManager.ts` (modifications)**
- [ ] Intégrer les palettes adaptatives dans ThemeManager
- [ ] Synchroniser les changements de palette avec les changements de thème
- [ ] Appliquer les couleurs sémantiques aux variables CSS
- [ ] Gérer les transitions fluides

**Fichier: `apps/web/src/hooks/usePaletteTheme.ts` (nouveau)**
- [ ] Hook pour gérer les palettes adaptatives
- [ ] Synchronisation avec le thème actif
- [ ] Application automatique des couleurs

**Fichier: `apps/web/src/utils/nodeColors.ts` (modifications)**
- [ ] Utiliser les palettes adaptatives dans `getNodeColor()`
- [ ] Améliorer la lisibilité avec les nouvelles palettes
- [ ] Utiliser les couleurs sémantiques quand disponibles

### 5. Restauration MenuBar et StatusBar (~1h, ~300 LOC)

**Fichier: `apps/web/src/layouts/DockableLayoutV2.tsx` (modifications)**
- [ ] Importer MenuBar et StatusBar
- [ ] Ajouter MenuBar en haut du layout (avant DockviewReact)
- [ ] Ajouter StatusBar en bas du layout (après DockviewReact)
- [ ] Ajuster le CSS pour que Dockview prenne l'espace restant
- [ ] Tester que tout fonctionne correctement

**Fichier: `apps/web/src/layouts/DockableLayoutV2.css` (modifications)**
- [ ] Styles pour MenuBar dans DockableLayoutV2
- [ ] Styles pour StatusBar dans DockableLayoutV2
- [ ] Ajuster les hauteurs pour que Dockview s'adapte
- [ ] Assurer la cohérence avec le thème actif

### 6. Tests et Validation (~1h, ~200 LOC)

**Fichiers de tests:**
- [ ] Tests unitaires pour les nouvelles fonctions de palette
- [ ] Tests d'intégration pour le système de thème
- [ ] Tests visuels pour les transitions light/dark
- [ ] Tests de contraste WCAG

**Checklist de validation:**
- [ ] Toutes les palettes ont des variantes light/dark
- [ ] Le fond de carte s'adapte selon le thème
- [ ] Les couleurs des nœuds sont lisibles dans les deux modes
- [ ] MenuBar et StatusBar sont visibles et fonctionnels
- [ ] Les transitions sont fluides
- [ ] Le contraste respecte WCAG AA minimum
- [ ] Performance: pas de lag lors du changement de thème

---

## 🔧 Architecture Technique

### Structure des Palettes Adaptatives

```typescript
interface AdaptiveColorPalette {
  id: string;
  name: string;
  description: string;
  
  // Couleurs par défaut (fallback)
  colors: string[];
  
  // Variantes light/dark
  variants?: {
    light: string[];
    dark: string[];
  };
  
  // Fond de carte adaptatif
  canvasBackground?: {
    light: string;
    dark: string;
  };
  
  // Couleurs sémantiques (optionnel, pour mapping avancé)
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
  
  // Metadata
  metadata?: {
    tags: string[];
    category: 'colorful' | 'neutral' | 'pastel' | 'vibrant' | 'earth' | 'ocean';
    contrast: 'low' | 'medium' | 'high';
    wcagLevel: 'AA' | 'AAA';
    compatibleThemes: string[]; // IDs de thèmes compatibles
  };
}
```

### Intégration avec Obsidian Themes

1. Les palettes s'intègrent avec les variables CSS Obsidian
2. Les couleurs sémantiques sont mappées vers les variables Obsidian
3. Le système respecte la hiérarchie: Obsidian Theme → Palette → Component

### Workflow de Changement de Thème

1. Utilisateur change de thème (light ↔ dark)
2. ThemeManager détecte le changement
3. ThemeManager récupère la palette active
4. ThemeManager applique les variantes light/dark appropriées
5. Les couleurs sémantiques sont mappées vers les variables CSS
6. Tous les composants sont mis à jour automatiquement

---

## ✅ Checklist Validation

### Palette System
- [ ] Interface `ColorPalette` étendue avec toutes les nouvelles propriétés
- [ ] Fonction `getPaletteForTheme()` fonctionnelle
- [ ] Fonction `getSemanticColors()` fonctionnelle
- [ ] Fonction `validatePaletteContrast()` fonctionnelle
- [ ] Toutes les palettes principales ont des variantes light/dark
- [ ] Toutes les palettes ont un canvas background adaptatif
- [ ] Documentation complète

### Theme Integration
- [ ] ThemeManager intègre les palettes adaptatives
- [ ] Hook `usePaletteTheme` fonctionnel
- [ ] Synchronisation thème ↔ palette automatique
- [ ] Transitions fluides entre light/dark
- [ ] Variables CSS mises à jour correctement

### UI Components
- [ ] MenuBar visible et fonctionnel dans DockableLayoutV2
- [ ] StatusBar visible et fonctionnel dans DockableLayoutV2
- [ ] Layout s'adapte correctement avec MenuBar/StatusBar
- [ ] Styles cohérents avec le thème actif

### Accessibility
- [ ] Contraste minimum WCAG AA (4.5:1) pour tous les textes
- [ ] Contraste WCAG AAA (7:1) pour les textes importants
- [ ] Tests de contraste validés
- [ ] Documentation des niveaux de contraste

### Performance
- [ ] Changement de thème < 200ms
- [ ] Pas de re-render inutile
- [ ] Cache efficace des palettes

---

## 🚀 Next Session

→ Session 70: [À définir selon les besoins]

---

**Dépend de:** Sessions 55A-D, 56, 57 (Theme Foundations)  
**Débloque:** Amélioration continue du système de theming  
**Durée réelle estimée:** 8-10h pour bien faire les choses

