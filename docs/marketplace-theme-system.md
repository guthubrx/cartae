# Marketplace Theme System

**Session 61 - Marketplace UI Theme Customization**

Système de personnalisation des thèmes pour l'interface du Marketplace Cartae.

---

## 🎯 Vue d'Ensemble

Le système de thèmes marketplace permet aux utilisateurs de :

- **Choisir** parmi 4 thèmes prédéfinis (Light, Dark, Minimal, Colorful)
- **Créer** des thèmes personnalisés avec color picker
- **Personnaliser** le layout (grille, liste, colonnes, tailles)
- **Sauvegarder** les préférences (IndexedDB + localStorage fallback)
- **Synchroniser** avec le système de thèmes Obsidian (optionnel)

---

## 📦 Packages Modifiés

### 1. `@cartae/design` - Types & Interfaces

**Fichiers créés :**
- `src/marketplace-theme-types.ts` (~200 LOC)

**Exports :**
```typescript
import type {
  MarketplaceTheme,
  MarketplaceLayoutConfig,
  MarketplaceThemeTemplate,
  MarketplaceThemeConfig,
  MarketplaceLayoutMode,
  SidebarPosition,
  SearchPosition,
  CreateMarketplaceThemeOptions,
  MarketplaceThemeEvent,
} from '@cartae/design';
```

### 2. `@cartae/ui` - Hook & Thèmes

**Fichiers créés :**
- `src/hooks/useMarketplaceTheme.ts` (~600 LOC)
- `src/data/marketplace-themes.ts` (~400 LOC)

**Exports :**
```typescript
import {
  useMarketplaceTheme,
  marketplaceDefaultThemes,
  marketplaceLightTheme,
  marketplaceDarkTheme,
  marketplaceMinimalTheme,
  marketplaceColorfulTheme,
} from '@cartae/ui';
```

### 3. `@cartae/plugin-marketplace` - Composants UI

**Fichiers créés :**
- `src/components/MarketplaceThemePanel.tsx` (~400 LOC)
- `src/components/MarketplaceLayoutSettings.tsx` (~350 LOC)
- `src/components/AdminThemeTemplates.tsx` (~50 LOC - placeholder)
- `src/styles/marketplace-theme.css` (~300 LOC)

**Exports :**
```typescript
import {
  MarketplaceThemePanel,
  MarketplaceLayoutSettings,
  AdminThemeTemplates,
} from '@cartae/plugin-marketplace';
```

---

## 🚀 Utilisation

### Hook `useMarketplaceTheme`

```typescript
import { useMarketplaceTheme } from '@cartae/ui';

function MyComponent() {
  const {
    // State
    currentTheme,
    layoutConfig,
    availableThemes,
    customThemes,
    isLoading,
    error,

    // Theme operations
    changeTheme,
    createCustomTheme,
    deleteCustomTheme,
    resetToDefault,

    // Layout operations
    updateLayout,
    resetLayout,

    // Preferences
    toggleAutoDarkMode,
    toggleReduceMotion,
    toggleHighContrast,
    toggleSyncWithObsidian,
    setFontSizeScale,

    // Events
    addEventListener,
  } = useMarketplaceTheme();

  // Changer de thème
  const handleThemeChange = async () => {
    await changeTheme('marketplace-dark');
  };

  // Créer un thème personnalisé
  const handleCreateTheme = async () => {
    const newTheme = await createCustomTheme({
      name: 'Mon Thème',
      description: 'Thème personnalisé',
      baseThemeId: 'marketplace-light',
      customColors: {
        cardBackground: '#f0f0f0',
        cardBorder: '#cccccc',
      },
    });
  };

  // Changer le layout
  const handleLayoutChange = async () => {
    await updateLayout({
      layoutMode: 'grid-large',
      gridColumns: 2,
      cardSize: 'large',
    });
  };

  return (
    <div>
      <p>Thème actuel : {currentTheme?.name}</p>
      <button onClick={handleThemeChange}>Passer en mode sombre</button>
    </div>
  );
}
```

### Composants UI

```typescript
import {
  MarketplaceThemePanel,
  MarketplaceLayoutSettings,
} from '@cartae/plugin-marketplace';

function SettingsPage() {
  return (
    <div>
      {/* Panneau de personnalisation des thèmes */}
      <MarketplaceThemePanel showAdvanced />

      {/* Paramètres de layout */}
      <MarketplaceLayoutSettings />
    </div>
  );
}
```

### Variables CSS

Le système utilise des variables CSS qui peuvent être personnalisées :

```css
/* Importer le CSS */
@import '@cartae/plugin-marketplace/src/styles/marketplace-theme.css';

/* Utiliser les variables */
.my-card {
  background-color: var(--marketplace-card-background);
  border: 1px solid var(--marketplace-card-border);
  border-radius: var(--marketplace-card-border-radius);
  box-shadow: var(--marketplace-card-shadow);
}

.my-card:hover {
  background-color: var(--marketplace-card-background-hover);
  box-shadow: var(--marketplace-card-shadow-hover);
}
```

---

## 🎨 Thèmes Prédéfinis

### 1. Marketplace Light
- Professionnel et clean
- Couleurs : Blue-500, Indigo-500, Cyan-500
- Layout : Grid normal, 3 colonnes
- Idéal pour : Usage quotidien

### 2. Marketplace Dark
- Élégant et sobre
- Couleurs : Blue-400, Indigo-400, Cyan-400
- Background : Near-black (#0f0f0f)
- Idéal pour : Travail de nuit

### 3. Marketplace Minimal
- Focalisé sur le contenu
- Couleurs : Noir & blanc, accents subtils
- Layout : Liste compacte
- Idéal pour : Minimalistes

### 4. Marketplace Colorful
- Vibrant et énergique
- Couleurs : Violet-500, Pink-500, gradients
- Layout : Grid large, 2 colonnes
- Idéal pour : Créatifs

---

## 🔧 Configuration Layout

### Modes d'Affichage

- `grid-compact` : Grille dense, cartes petites
- `grid-normal` : Grille équilibrée (défaut)
- `grid-large` : Grandes cartes avec détails
- `list` : Vue liste verticale
- `minimal` : Vue ultra-minimaliste

### Nombre de Colonnes

- 1, 2, 3, ou 4 colonnes (seulement en mode grille)
- Responsive automatique :
  - Mobile : 1 colonne
  - Tablet : 2 colonnes
  - Desktop : 3-4 colonnes (configurable)

### Tailles de Cartes

- `compact` : Plus d'items visibles
- `normal` : Équilibrée (défaut)
- `large` : Plus de détails

### Positions

**Sidebar :**
- `left` : Gauche (défaut)
- `right` : Droite
- `hidden` : Masquée

**Recherche :**
- `top-sticky` : Reste visible en scrollant (défaut)
- `top-fixed` : Toujours en haut
- `floating` : Barre flottante
- `sidebar` : Dans la sidebar

### Options d'Affichage

- `showPreviews` : Images de prévisualisation
- `showStats` : Statistiques de téléchargement
- `showRatings` : Évaluations et notes

---

## 💾 Persistence

Le système sauvegarde automatiquement :

1. **IndexedDB** (primaire)
   - Base : `CartaeMarketplaceTheme`
   - Store : `themes`
   - Clé : `cartae-marketplace-theme`

2. **LocalStorage** (fallback)
   - Utilisé si IndexedDB échoue
   - Même clé : `cartae-marketplace-theme`

**Données sauvegardées :**
```typescript
{
  config: {
    currentTheme: string;
    layoutConfig: MarketplaceLayoutConfig;
    availableThemes: MarketplaceTheme[];
    customThemes: MarketplaceTheme[];
    installedTemplates: MarketplaceThemeTemplate[];
    userPreferences: {
      autoDarkMode: boolean;
      reduceMotion: boolean;
      highContrast: boolean;
      fontSizeScale: number;
      syncWithObsidian: boolean;
    };
  };
  version: string;
  lastUpdated: string;
}
```

---

## 🎭 Intégration Obsidian

Le système s'intègre avec le système de thèmes Obsidian (Sessions 55-59) :

### Variables Partagées

```css
/* Le marketplace utilise les variables Obsidian comme base */
--marketplace-primary: var(--accent, #3b82f6);
--marketplace-background: var(--background-primary, #ffffff);
--marketplace-text: var(--text-normal, #111827);
--marketplace-border: var(--border-normal, #e5e7eb);
```

### Synchronisation

```typescript
// Activer la synchronisation avec Obsidian
await toggleSyncWithObsidian();

// Le thème marketplace suivra automatiquement le thème Obsidian
```

---

## ♿ Accessibilité

### Reduced Motion
```typescript
await toggleReduceMotion();
```
Désactive toutes les transitions/animations.

### High Contrast
```typescript
await toggleHighContrast();
```
Augmente le contraste des bordures et textes.

### Font Size Scaling
```typescript
await setFontSizeScale(1.2); // 120% de la taille de base
```
Échelle la taille de police globale.

---

## 📊 Événements

Écouter les changements de thème/layout :

```typescript
const unsubscribe = addEventListener((event) => {
  switch (event.type) {
    case 'theme-changed':
      console.log('Nouveau thème :', event.themeId);
      break;

    case 'layout-changed':
      console.log('Layout modifié :', event.layoutConfig);
      break;

    case 'theme-created':
      console.log('Thème créé :', event.theme.name);
      break;

    case 'theme-deleted':
      console.log('Thème supprimé :', event.themeId);
      break;
  }
});

// Cleanup
unsubscribe();
```

---

## 🔮 Fonctionnalités Futures

### AdminThemeTemplates (À Implémenter)

Le composant `AdminThemeTemplates` est un **placeholder** qui nécessite :

1. **Backend API**
   - Endpoints CRUD pour templates
   - Authentification admin
   - Modération des templates community

2. **Database Schema**
   - Table `marketplace_theme_templates`
   - Relations avec users/ratings

3. **Système de Distribution**
   - Push automatique aux utilisateurs
   - Système de versions
   - Rollback mechanism

4. **Analytics**
   - Tracking installations
   - Ratings des templates
   - Popularité & trending

Voir : `packages/design/src/marketplace-theme-types.ts` → interface `MarketplaceThemeTemplate`

---

## 📈 Statistiques Session 61

| Métrique | Valeur |
|----------|--------|
| **LOC Total** | ~2,000 |
| **Fichiers Créés** | 8 |
| **Packages Modifiés** | 3 |
| **Thèmes Prédéfinis** | 4 |
| **Modes de Layout** | 5 |
| **Variables CSS** | 60+ |
| **Composants React** | 3 |
| **Hooks React** | 1 |
| **Types TypeScript** | 10+ |

---

## 🔗 Références

- **Session 55-59** : Obsidian Theme Foundations
- **Session 57** : UI Theme Marketplace
- **Session 60** : Marketplace Enhancements
- **Session 61** : Marketplace UI Theme System (ce document)

---

## ✅ Checklist Validation

- [x] Types marketplace créés
- [x] 4 thèmes prédéfinis implémentés
- [x] Hook `useMarketplaceTheme` fonctionnel
- [x] Composant `MarketplaceThemePanel` avec color picker
- [x] Composant `MarketplaceLayoutSettings` complet
- [x] Variables CSS marketplace + intégration Obsidian
- [x] Persistence IndexedDB + localStorage
- [x] Events system implémenté
- [x] Responsive design
- [x] Accessibilité (reduced motion, high contrast, font scale)
- [x] Documentation complète
- [ ] Tests E2E (à venir)
- [ ] Tests unitaires (à venir)
- [ ] AdminThemeTemplates backend (à venir)

---

**Auteur :** Claude Code Session 61
**Date :** 4 Novembre 2025
**Status :** ✅ Complétée
