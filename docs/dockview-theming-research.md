# Dockview Theming Research

## 1. Available CSS Variables

Dockview expose plus de 20 variables CSS (préfixées `--dv-`) pour contrôler l'apparence des composants. Ces variables sont organisées en catégories logiques :

### Couleurs & Arrière-plans (Colors & Backgrounds)

- `--dv-group-view-background-color` : Couleur de fond des conteneurs principaux
- `--dv-tabs-and-actions-container-background-color` : Couleur de fond de la barre d'onglets
- `--dv-activegroup-visiblepanel-tab-background-color` : Onglet actif visible
- `--dv-activegroup-hiddenpanel-tab-background-color` : Onglet masqué (groupe actif)
- `--dv-inactivegroup-visiblepanel-tab-background-color` : Onglet actif (groupe inactif)
- `--dv-inactivegroup-hiddenpanel-tab-background-color` : Onglet masqué (groupe inactif)
- `--dv-drag-over-background-color` : Feedback visuel lors du drag-and-drop
- `--dv-icon-hover-background-color` : État hover des icônes
- `--dv-scrollbar-background-color` : Apparence des scrollbars

### Couleurs de Texte (Text Colors)

- `--dv-activegroup-visiblepanel-tab-color` : Texte onglet actif
- `--dv-activegroup-hiddenpanel-tab-color` : Texte onglet masqué (groupe actif)
- `--dv-inactivegroup-visiblepanel-tab-color` : Texte onglet (groupe inactif)
- `--dv-inactivegroup-hiddenpanel-tab-color` : Texte onglet masqué (groupe inactif)

### Bordures & Séparateurs (Borders & Separators)

- `--dv-separator-border` : Lignes de séparation entre panneaux
- `--dv-paneview-header-border-color` : Soulignement des headers
- `--dv-drag-over-border-color` : Bordure lors du drag feedback
- `--dv-tab-divider-color` : Séparateurs entre onglets

### Dimensions (Sizing)

- `--dv-tabs-and-actions-container-height` : Hauteur de la barre d'onglets
- `--dv-tabs-and-actions-container-font-size` : Taille de police globale
- `--dv-tab-font-size` : Taille de police des onglets individuels
- `--dv-tab-margin` : Espacement autour des onglets
- `--dv-border-radius` : Arrondi des coins

### Effets & Styling Avancé (Effects & Styling)

- `--dv-floating-box-shadow` : Ombre portée des éléments flottants
- `--dv-paneview-active-outline-color` : Indicateur de focus
- `--dv-sash-color` : Couleur des poignées de redimensionnement
- `--dv-active-sash-color` : Couleur des poignées actives
- `--dv-active-sash-transition-duration` : Durée des animations
- `--dv-active-sash-transition-delay` : Délai des animations
- `--dv-overlay-z-index` : Profondeur de stacking des overlays

---

## 2. Theming Strategies

Dockview propose **deux approches complémentaires** pour la personnalisation :

### A. CSS Variables (Approche Recommandée)

**Principe** : Surcharger les variables `--dv-*` dans une classe CSS custom.

**Avantages** :

- ✅ Maintenabilité élevée (modifications centralisées)
- ✅ Compatible avec les mises à jour de Dockview (API stable)
- ✅ Support natif du theme switching (light/dark)
- ✅ Performance optimale (pas de recalcul de styles)

**Exemple** :

```css
.cartae-dockview-theme {
  --dv-group-view-background-color: #ffffff;
  --dv-tabs-and-actions-container-background-color: #f5f5f5;
  --dv-activegroup-visiblepanel-tab-color: #3b82f6;
  /* ... */
}
```

### B. Class Selectors (Approche Avancée)

**Principe** : Cibler directement les classes internes de Dockview (ex: `.dv-tab`, `.dv-group-view`).

**Inconvénients** :

- ⚠️ Classes internes sujettes à changement entre versions
- ⚠️ Risque de conflits avec les styles par défaut
- ⚠️ Nécessite une connaissance approfondie du DOM interne

**Utilisation** : Réservé aux customizations impossibles via CSS variables (ex: animations complexes, pseudo-elements spécifiques).

### Recommandation

**Privilégier CSS Variables (approche A)** pour 95% des besoins de theming. Utiliser les class selectors uniquement pour les cas limites non couverts par les variables.

---

## 3. Color Mapping (Cartae → Dockview)

### Cartae Design System (Source)

Basé sur un **flat design avec accent color unique** :

```typescript
// Neutres
gray: {
  50 - 950;
} // Backgrounds, borders, text
accent: {
  50 - 950;
} // Bleu #3b82f6 (couleur principale)
semantic: {
  (success, warning, error, info);
}

// Tokens sémantiques
background: {
  (DEFAULT, secondary, tertiary);
}
foreground: {
  (DEFAULT, secondary, tertiary, muted);
}
border: {
  (DEFAULT, secondary, focus);
}
state: {
  (hover, active, focus, disabled);
}
```

### Mapping Cartae → Dockview

#### Background Colors

```css
:root {
  /* Conteneurs principaux */
  --dv-group-view-background-color: var(--bg-primary, #ffffff);

  /* Barre d'onglets */
  --dv-tabs-and-actions-container-background-color: var(--bg-secondary, #f5f5f5);

  /* Onglet actif (groupe actif) */
  --dv-activegroup-visiblepanel-tab-background-color: var(--bg-primary, #ffffff);

  /* Onglets inactifs */
  --dv-inactivegroup-visiblepanel-tab-background-color: var(--bg-tertiary, #e5e5e5);
  --dv-activegroup-hiddenpanel-tab-background-color: var(--bg-tertiary, #e5e5e5);
  --dv-inactivegroup-hiddenpanel-tab-background-color: var(--bg-tertiary, #e5e5e5);
}
```

#### Text Colors

```css
:root {
  /* Texte onglet actif */
  --dv-activegroup-visiblepanel-tab-color: var(--accent-color, #3b82f6);

  /* Texte onglets inactifs */
  --dv-inactivegroup-visiblepanel-tab-color: var(--fg-secondary, #525252);
  --dv-activegroup-hiddenpanel-tab-color: var(--fg-tertiary, #737373);
  --dv-inactivegroup-hiddenpanel-tab-color: var(--fg-tertiary, #737373);
}
```

#### Borders & Separators

```css
:root {
  /* Bordures principales */
  --dv-separator-border: 1px solid var(--border-color, #e5e5e5);
  --dv-paneview-header-border-color: var(--border-color, #e5e5e5);

  /* Bordure de focus/drag */
  --dv-drag-over-border-color: var(--accent-color, #3b82f6);
  --dv-paneview-active-outline-color: var(--accent-color, #3b82f6);

  /* Séparateur d'onglets */
  --dv-tab-divider-color: var(--border-secondary, #d4d4d4);
}
```

#### Interactive States

```css
:root {
  /* Hover */
  --dv-icon-hover-background-color: var(--state-hover, #f5f5f5);
  --dv-drag-over-background-color: rgba(59, 130, 246, 0.1); /* accent-50 with opacity */

  /* Sash (resize handles) */
  --dv-sash-color: var(--border-color, #e5e5e5);
  --dv-active-sash-color: var(--accent-color, #3b82f6);
}
```

#### Dimensions & Effects

```css
:root {
  /* Sizing */
  --dv-tabs-and-actions-container-height: 36px;
  --dv-tabs-and-actions-container-font-size: 14px; /* fontSize.sm */
  --dv-tab-font-size: 14px;
  --dv-tab-margin: 4px; /* spacing.1 */
  --dv-border-radius: 6px; /* borderRadius.base */

  /* Shadows */
  --dv-floating-box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); /* boxShadow.md */

  /* Z-index */
  --dv-overlay-z-index: 1300; /* zIndex.overlay */
}
```

---

## 4. Dark/Light Mode Implementation

### Stratégie Recommandée : CSS Variables Dynamiques

Dockview ne gère **pas nativement** le theme switching. Il faut implémenter une couche d'abstraction via les CSS variables de Cartae.

### Architecture Proposée

#### 1. Définir les Modes dans `index.css`

```css
:root {
  /* Light Mode (par défaut) */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e5e5e5;
  --fg: #171717;
  --fg-secondary: #525252;
  --fg-tertiary: #737373;
  --border-color: #e5e5e5;
  --border-secondary: #d4d4d4;
  --accent-color: #3b82f6;
  --state-hover: #f5f5f5;
}

/* Dark Mode */
[data-theme='dark'] {
  --bg-primary: #171717;
  --bg-secondary: #262626;
  --bg-tertiary: #404040;
  --fg: #fafafa;
  --fg-secondary: #a3a3a3;
  --fg-tertiary: #737373;
  --border-color: #404040;
  --border-secondary: #525252;
  --accent-color: #60a5fa; /* Accent plus clair en dark mode */
  --state-hover: #262626;
}
```

#### 2. Créer un Thème Dockview Dynamique

```css
/* cartae/apps/web/src/layouts/DockableLayout.css */
.cartae-dockview-theme {
  /* Les variables --dv-* référencent automatiquement les variables Cartae */
  --dv-group-view-background-color: var(--bg-primary);
  --dv-tabs-and-actions-container-background-color: var(--bg-secondary);
  --dv-activegroup-visiblepanel-tab-background-color: var(--bg-primary);
  --dv-activegroup-visiblepanel-tab-color: var(--accent-color);
  --dv-separator-border: 1px solid var(--border-color);
  /* ... mapping complet ci-dessus ... */
}
```

#### 3. Appliquer le Thème à DockableLayout

```tsx
// cartae/apps/web/src/layouts/DockableLayout.tsx
<div className="cartae-dockview-theme" data-theme={currentTheme}>
  <DockviewReact onReady={onReady} className="dockview-theme-custom" />
</div>
```

### Switching Logic

```typescript
// Theme Context ou Store
const [theme, setTheme] = useState<'light' | 'dark'>('light');

// Toggle function
const toggleTheme = () => {
  const newTheme = theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
};
```

### Avantages de Cette Approche

- ✅ **Single source of truth** : Toutes les variables passent par le système Cartae
- ✅ **Switching instantané** : Pas de rechargement, juste un changement de `data-theme`
- ✅ **Cohérence garantie** : Dockview utilise automatiquement les mêmes couleurs que le reste de l'app
- ✅ **Maintenabilité** : Un seul endroit pour changer les couleurs (tokens Cartae)

---

## 5. Recommendations for Session 54F

### Phase 1 : Configuration Initiale

1. **Créer le fichier de thème** : `cartae/apps/web/src/layouts/DockableLayout.css`
2. **Implémenter le mapping complet** Cartae → Dockview (utiliser la section 3 ci-dessus)
3. **Tester avec le light mode** uniquement (valider la cohérence visuelle)

### Phase 2 : Dark Mode Support

4. **Ajouter les variables dark mode** dans `index.css` (via `[data-theme='dark']`)
5. **Créer le ThemeContext** pour gérer le state du thème (light/dark)
6. **Ajouter un toggle button** dans la TopBar ou Settings pour switcher
7. **Tester la transition** (pas de flash, toutes les couleurs switchent)

### Phase 3 : Fine-Tuning

8. **Ajuster les contrastes** (vérifier WCAG AA sur les textes)
9. **Optimiser les focus states** (--dv-paneview-active-outline-color visible)
10. **Tester les drag-and-drop** (--dv-drag-over-\* suffisamment visibles)

### Checklist Technique

- [ ] Variables Cartae exportées depuis `@cartae/design/tokens`
- [ ] Mapping complet Cartae → Dockview dans `.cartae-dockview-theme`
- [ ] Support `[data-theme='dark']` avec fallback sur `prefers-color-scheme`
- [ ] ThemeContext accessible aux composants (Provider dans App.tsx)
- [ ] Toggle button connecté au ThemeContext
- [ ] Persistence du choix utilisateur (localStorage)
- [ ] Tests visuels sur les 4 états d'onglets (active/inactive × visible/hidden)
- [ ] Tests des resize handles (--dv-sash-color) en light/dark
- [ ] Tests des floating panels (--dv-floating-box-shadow) en light/dark

### Risques à Anticiper

- ⚠️ **Flash de contenu** : Charger le thème depuis localStorage AVANT le premier render
- ⚠️ **Contrastes insuffisants** : Tester avec un outil comme Contrast Checker
- ⚠️ **Animations saccadées** : Utiliser `transition: background-color 0.2s ease` sur les éléments concernés
- ⚠️ **Z-index conflicts** : Vérifier que `--dv-overlay-z-index: 1300` ne conflicte pas avec les modales Cartae (zIndex.modal = 1400)

### Performance Tips

- Utiliser `color-scheme: light dark;` sur `:root` pour optimiser le rendering natif du browser
- Éviter les `@media (prefers-color-scheme)` dans les variables Dockview (gérer via `data-theme` uniquement)
- Grouper les transitions CSS pour éviter les reflows multiples

---

## Conclusion

Le theming de Dockview s'intègre naturellement au design system Cartae grâce à une architecture en **deux couches** :

1. **Variables Cartae** (source de vérité) définies dans `index.css` avec support light/dark
2. **Variables Dockview** (mapping) qui référencent les variables Cartae

Cette approche garantit une **cohérence visuelle totale** entre Dockview et le reste de l'application, tout en permettant un **theme switching instantané** sans rechargement. La Session 54F peut se concentrer sur l'implémentation du mapping et du ThemeContext, en suivant les phases proposées pour un déploiement progressif et testé.
