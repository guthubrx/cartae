# 🧪 Tests E2E Marketplace

Suite complète de tests end-to-end pour le système de Marketplace de plugins Cartae.

## 📋 Vue d'Ensemble

Cette suite de tests valide :

- ✅ **Navigation** : Chargement initial, tabs, routes
- ✅ **Recherche** : Recherche textuelle, tags, résultats vides
- ✅ **Filtres** : Catégorie, source, pricing, combinaisons
- ✅ **Tri** : Par nom, downloads, rating, date
- ✅ **Pagination** : Navigation pages, états prev/next
- ✅ **Featured & Trending** : Affichage sections spéciales
- ✅ **Détails Plugin** : Modal, informations, fermeture
- ✅ **Installation** : Bouton install, notifications
- ✅ **Performance** : Cache, temps de chargement
- ✅ **Erreurs** : Gestion erreurs réseau, états vides

## 🏗️ Structure

```
tests/marketplace/
├── marketplace.page.ts         # Page Object Model
├── marketplace.spec.ts          # Tests E2E complets (500+ lignes)
├── fixtures/
│   └── mockPlugins.ts           # Données de test
└── README.md                    # Ce fichier
```

## 🚀 Lancer les Tests

### Prérequis

```bash
# Installer Playwright
pnpm install -D @playwright/test

# Installer les navigateurs
pnpm playwright install
```

### Lancer Tous les Tests

```bash
# Mode headless (CI)
pnpm test:e2e

# Mode headed (voir le navigateur)
pnpm playwright test --headed

# Mode UI (interface interactive)
pnpm playwright test --ui
```

### Lancer des Tests Spécifiques

```bash
# Uniquement tests Marketplace
pnpm playwright test marketplace

# Un fichier spécifique
pnpm playwright test marketplace.spec.ts

# Un test spécifique
pnpm playwright test -g "Doit rechercher des plugins par nom"

# Un describe spécifique
pnpm playwright test -g "Marketplace - Recherche"
```

### Navigateurs

```bash
# Chromium uniquement
pnpm playwright test --project=chromium

# Firefox uniquement
pnpm playwright test --project=firefox

# WebKit (Safari) uniquement
pnpm playwright test --project=webkit

# Tous les navigateurs
pnpm playwright test
```

### Mode Debug

```bash
# Debug avec Playwright Inspector
pnpm playwright test --debug

# Debug un test spécifique
pnpm playwright test marketplace.spec.ts --debug -g "recherche"

# Ralentir l'exécution
pnpm playwright test --slow-mo=1000
```

## 📊 Résultats

### Rapports

Les rapports sont générés automatiquement :

```bash
# HTML Report (après execution)
pnpm playwright show-report

# JSON Report
cat test-results/results.json

# JUnit XML (pour CI)
cat test-results/results.xml
```

### Screenshots

Les screenshots sont sauvegardés dans `test-results/` :

```
test-results/
├── marketplace-initial-load.png
├── marketplace-search-palette.png
├── marketplace-filter-category-theme.png
├── marketplace-sort-by-name.png
└── ...
```

### Vidéos

Les vidéos des tests échoués sont dans `test-results/` :

```
test-results/
└── marketplace-spec-chromium/
    └── video.webm
```

## 🧩 Page Object Model

### MarketplacePage

Le Page Object Model encapsule toutes les interactions avec le Marketplace :

```typescript
import { MarketplacePage } from './marketplace.page';

test('Example', async ({ page }) => {
  const marketplace = new MarketplacePage(page);

  // Navigation
  await marketplace.goto();
  await marketplace.waitForPluginsLoaded();

  // Recherche
  await marketplace.search('palette');

  // Filtres
  await marketplace.filterByCategory('theme');
  await marketplace.filterBySource('official');

  // Tri
  await marketplace.sortBy('name');

  // Pagination
  await marketplace.goToNextPage();

  // Assertions
  const pluginCount = await marketplace.getPluginCount();
  expect(pluginCount).toBeGreaterThan(0);
});
```

### Méthodes Disponibles

**Navigation:**

- `goto()` - Naviguer vers le marketplace
- `waitForPluginsLoaded()` - Attendre le chargement

**Recherche:**

- `search(query)` - Rechercher des plugins

**Filtres:**

- `filterByCategory(category)` - Filtrer par catégorie
- `filterBySource(source)` - Filtrer par source
- `filterByPricing(pricing)` - Filtrer par pricing
- `resetFilters()` - Reset tous les filtres

**Tri:**

- `sortBy(option)` - Trier (name, downloads, rating, updated)

**Pagination:**

- `goToNextPage()` - Page suivante
- `goToPreviousPage()` - Page précédente

**Interactions:**

- `clickPluginByIndex(index)` - Cliquer sur un plugin
- `clickPluginByName(name)` - Cliquer par nom
- `hasPlugin(name)` - Vérifier présence

**Getters:**

- `getPluginCount()` - Nombre de plugins affichés
- `getPluginTitles()` - Titres des plugins
- `getFeaturedPlugins()` - Plugins featured
- `getTrendingPlugins()` - Plugins trending

**États:**

- `isEmptyStateVisible()` - État vide visible
- `hasError()` - Erreur présente
- `getErrorMessage()` - Message d'erreur

**Utility:**

- `screenshot(name)` - Prendre un screenshot

## 📝 Écrire de Nouveaux Tests

### Template de Base

```typescript
import { test, expect } from '@playwright/test';
import { MarketplacePage } from './marketplace.page';

test.describe('Marketplace - Ma Feature', () => {
  test('Doit faire quelque chose', async ({ page }) => {
    const marketplace = new MarketplacePage(page);

    // Setup
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Action
    await marketplace.search('test');

    // Assertion
    const count = await marketplace.getPluginCount();
    expect(count).toBeGreaterThan(0);

    // Screenshot (optionnel)
    await marketplace.screenshot('ma-feature');
  });
});
```

### Bonnes Pratiques

1. **Utiliser le Page Object** : Ne pas interagir directement avec `page`

```typescript
// ❌ Mauvais
await page.locator('[data-testid="plugin-card"]').click();

// ✅ Bon
await marketplace.clickPluginByIndex(0);
```

2. **Attendre le chargement** : Toujours attendre les états asynchrones

```typescript
// ✅ Bon
await marketplace.waitForPluginsLoaded();
const count = await marketplace.getPluginCount();
```

3. **Screenshots pour debug** : Ajouter des screenshots aux points clés

```typescript
await marketplace.screenshot('before-action');
await marketplace.search('test');
await marketplace.screenshot('after-action');
```

4. **Tests isolés** : Chaque test doit être indépendant

```typescript
test.beforeEach(async ({ page }) => {
  const marketplace = new MarketplacePage(page);
  await marketplace.goto();
  await marketplace.waitForPluginsLoaded();
});
```

5. **Assertions claires** : Messages explicites

```typescript
expect(count).toBeGreaterThan(0);
expect(titles).toContain('Palette Manager');
expect(hasError).toBe(false);
```

## 🎯 Tests par Catégorie

### Navigation & Chargement (3 tests)

- Chargement initial
- Affichage stats
- Gestion erreurs réseau

### Recherche (3 tests)

- Recherche par nom
- État vide
- Recherche par tag

### Filtres (6 tests)

- Filtre catégorie
- Filtre source
- Filtre pricing
- Combinaison filtres
- Reset filtres

### Tri (3 tests)

- Tri par nom
- Tri par downloads
- Tri par rating

### Pagination (2 tests)

- Navigation suivant/précédent
- Changement de contenu

### Featured & Trending (2 tests)

- Affichage featured
- Affichage trending

### Détails Plugin (3 tests)

- Ouverture modal
- Affichage informations
- Fermeture modal

### Installation (2 tests)

- Bouton install visible
- Click install (TODO)

### Performance & Cache (2 tests)

- Chargement rapide depuis cache
- Pas de requêtes redondantes

**Total : 26 tests**

## 🐛 Debugging

### Traces Playwright

```bash
# Générer trace
pnpm playwright test --trace on

# Voir la trace
pnpm playwright show-trace test-results/.../trace.zip
```

### Console Logs

Les logs du navigateur sont affichés automatiquement :

```typescript
// Dans le test
page.on('console', msg => console.log('Browser:', msg.text()));
page.on('pageerror', err => console.error('Error:', err));
```

### Pause & Debug

```typescript
test('Debug example', async ({ page }) => {
  const marketplace = new MarketplacePage(page);
  await marketplace.goto();

  // Pause pour inspecter
  await page.pause();

  // Continue le test...
});
```

### Sélecteurs

Utiliser Playwright Inspector pour tester les sélecteurs :

```bash
pnpm playwright codegen http://localhost:3000
```

## 📦 Mock Data

Les fixtures sont disponibles dans `fixtures/mockPlugins.ts` :

```typescript
import {
  mockPlugins,
  mockPluginListResponse,
  mockFeaturedPlugins,
  mockSearchResults,
} from './fixtures/mockPlugins';

// Mock API responses
await page.route('**/api/plugins', route => {
  route.fulfill({ json: mockPluginListResponse });
});

await page.route('**/api/plugins/featured', route => {
  route.fulfill({ json: mockFeaturedPlugins });
});
```

## 🔧 CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: pnpm playwright install --with-deps

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

### Configuration CI

Dans `playwright.config.ts` :

```typescript
{
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
}
```

## 📈 Coverage

Les tests E2E couvrent :

- ✅ Navigation (100%)
- ✅ Recherche (100%)
- ✅ Filtres (100%)
- ✅ Tri (100%)
- ✅ Pagination (100%)
- ✅ Détails plugin (100%)
- ⚠️ Installation (TODO - non implémenté backend)
- ✅ Performance (basique)

## 🔗 Ressources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Debugging](https://playwright.dev/docs/debug)

---

**Tests maintenus avec ❤️ pour Cartae**
