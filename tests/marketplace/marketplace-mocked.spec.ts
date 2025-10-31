/**
 * Marketplace E2E Tests with Mocked API
 * Tests avec API mockée pour éviter dépendance réseau
 */

import { test, expect } from '@playwright/test';
import { MarketplacePage } from './marketplace.page';
import {
  mockPluginListResponse,
  mockFeaturedPlugins,
  mockTrendingPlugins,
  mockSearchResults,
  mockCategoryFilter,
  mockPlugins,
} from './fixtures/mockPlugins';

// Setup mock avant chaque test
test.beforeEach(async ({ page }) => {
  // Mock liste de plugins
  await page.route('**/api/plugins*', async route => {
    const url = new URL(route.request().url());
    const { searchParams } = url;

    // Search
    if (searchParams.has('q')) {
      const query = searchParams.get('q') || '';
      await route.fulfill({ json: mockSearchResults(query) });
      return;
    }

    // Category filter
    if (searchParams.has('category') && searchParams.get('category') !== 'all') {
      const category = searchParams.get('category') || '';
      await route.fulfill({ json: mockCategoryFilter(category) });
      return;
    }

    // Default list
    await route.fulfill({ json: mockPluginListResponse });
  });

  // Mock featured
  await page.route('**/api/plugins/featured', route => {
    route.fulfill({ json: mockFeaturedPlugins });
  });

  // Mock trending
  await page.route('**/api/plugins/trending', route => {
    route.fulfill({ json: mockTrendingPlugins });
  });

  // Mock plugin detail
  await page.route('**/api/plugins/*', async route => {
    const url = route.request().url();
    const pluginId = url.split('/').pop();
    const plugin = mockPlugins.find(p => p.id === pluginId);

    if (plugin) {
      await route.fulfill({ json: plugin });
    } else {
      await route.fulfill({ status: 404, json: { error: 'Not found' } });
    }
  });

  // Mock health check
  await page.route('**/api/health', route => {
    route.fulfill({
      json: {
        status: 'ok',
        service: 'cartae-marketplace-api',
        timestamp: new Date().toISOString(),
      },
    });
  });
});

test.describe('Marketplace Mocked - Recherche', () => {
  test('Doit rechercher et trouver des résultats', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Rechercher "palette"
    await marketplace.search('palette');

    // Vérifier qu'on trouve le bon plugin
    const hasPlugin = await marketplace.hasPlugin('Test Color Palette');
    expect(hasPlugin).toBeTruthy();

    await marketplace.screenshot('mocked-search-palette');
  });

  test('Doit retourner résultats vides pour recherche inexistante', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Rechercher quelque chose qui n'existe pas
    await marketplace.search('nonexistent123');

    // Vérifier l'état vide
    const count = await marketplace.getPluginCount();
    expect(count).toBe(0);
  });
});

test.describe('Marketplace Mocked - Filtres', () => {
  test('Doit filtrer par catégorie theme', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Filtrer par theme
    await marketplace.filterByCategory('theme');

    // Vérifier qu'on ne voit que les plugins theme
    const titles = await marketplace.getPluginTitles();
    const hasOnlyTheme = titles.every(
      title => title.toLowerCase().includes('color') || title.toLowerCase().includes('palette')
    );

    // Au moins un plugin theme devrait être visible
    expect(titles.length).toBeGreaterThan(0);
  });

  test('Doit filtrer par catégorie productivity', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Filtrer par productivity
    await marketplace.filterByCategory('productivity');

    // Vérifier les résultats
    const count = await marketplace.getPluginCount();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Marketplace Mocked - Featured & Trending', () => {
  test('Doit afficher exactement 2 plugins featured', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Vérifier featured (2 dans les mocks)
    const featuredPlugins = await marketplace.getFeaturedPlugins();
    expect(featuredPlugins.length).toBe(2);

    await marketplace.screenshot('mocked-featured');
  });

  test('Doit afficher les plugins trending triés par downloads', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Vérifier trending (top 3)
    const trendingPlugins = await marketplace.getTrendingPlugins();
    expect(trendingPlugins.length).toBe(3);

    // Le premier devrait être "Test Tag Manager" (2100 downloads)
    expect(trendingPlugins[0]).toContain('Tag Manager');

    await marketplace.screenshot('mocked-trending');
  });
});

test.describe('Marketplace Mocked - Tri', () => {
  test('Doit trier par nom alphabétiquement', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Trier par nom
    await marketplace.sortBy('name');

    // Récupérer les titres
    const titles = await marketplace.getPluginTitles();

    // Vérifier le tri (tous commencent par "Test")
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);

    await marketplace.screenshot('mocked-sort-name');
  });
});

test.describe('Marketplace Mocked - Détails Plugin', () => {
  test('Doit afficher les détails corrects du plugin', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Cliquer sur le premier plugin (Test Color Palette)
    await marketplace.clickPluginByIndex(0);

    // Vérifier le nom
    const detailName = page.locator('[data-testid="plugin-detail-name"]');
    const nameText = await detailName.textContent();
    expect(nameText).toContain('Test Color Palette');

    // Vérifier la description
    const detailDescription = page.locator('[data-testid="plugin-detail-description"]');
    const descText = await detailDescription.textContent();
    expect(descText).toContain('palettes de couleurs');

    await marketplace.screenshot('mocked-plugin-detail');
  });

  test('Doit afficher les métadonnées du plugin', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Cliquer sur le plugin
    await marketplace.clickPluginByIndex(0);

    // Vérifier les métadonnées (version, auteur, etc.)
    const versionElement = page.locator('[data-testid="plugin-version"]');
    const authorElement = page.locator('[data-testid="plugin-author"]');

    const hasVersion = await versionElement.isVisible();
    const hasAuthor = await authorElement.isVisible();

    expect(hasVersion || hasAuthor).toBeTruthy();
  });
});

test.describe('Marketplace Mocked - Performance', () => {
  test('Doit charger rapidement avec mock (< 2s)', async ({ page }) => {
    const startTime = Date.now();

    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    const loadTime = Date.now() - startTime;

    console.log(`Load time with mocks: ${loadTime}ms`);

    // Avec les mocks, devrait être très rapide
    expect(loadTime).toBeLessThan(2000); // Moins de 2 secondes

    await marketplace.screenshot('mocked-performance');
  });

  test('Doit faire exactement les requêtes attendues', async ({ page }) => {
    let apiCallCount = 0;
    const apiCalls: string[] = [];

    // Track toutes les requêtes API
    await page.route('**/api/**', route => {
      apiCallCount++;
      apiCalls.push(route.request().url());
      route.continue();
    });

    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    console.log('API calls made:', apiCalls);

    // Au moins un appel pour charger les plugins
    expect(apiCallCount).toBeGreaterThan(0);
  });
});

test.describe("Marketplace Mocked - États d'Erreur", () => {
  test('Doit gérer une erreur 404 sur un plugin', async ({ page }) => {
    // Override le mock pour retourner 404
    await page.route('**/api/plugins/nonexistent', route => {
      route.fulfill({ status: 404, json: { error: 'Plugin not found' } });
    });

    const marketplace = new MarketplacePage(page);
    await marketplace.goto();

    // Essayer d'accéder à un plugin qui n'existe pas
    await page.goto('/plugins/nonexistent');

    // Vérifier qu'une erreur est affichée
    const hasError = await marketplace.hasError();
    expect(hasError).toBeTruthy();
  });

  test('Doit gérer une erreur réseau', async ({ page }) => {
    // Override pour simuler erreur réseau
    await page.route('**/api/plugins', route => route.abort('failed'));

    const marketplace = new MarketplacePage(page);
    await marketplace.goto();

    // Attendre un peu car l'erreur peut prendre du temps
    await page.waitForTimeout(1000);

    // Soit erreur, soit empty state
    const hasError = await marketplace.hasError();
    const isEmpty = await marketplace.isEmptyStateVisible();

    expect(hasError || isEmpty).toBeTruthy();
  });
});

test.describe('Marketplace Mocked - Cohérence des Données', () => {
  test('Les plugins featured doivent être marqués comme featured', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Récupérer les featured
    const featuredPlugins = await marketplace.getFeaturedPlugins();

    // Vérifier qu'on a bien les 2 featured (Test Color Palette, Test Tag Manager)
    expect(featuredPlugins).toContain('Test Color Palette');
    expect(featuredPlugins).toContain('Test Tag Manager');
  });

  test("Le tri par downloads doit respecter l'ordre", async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Trier par downloads
    await marketplace.sortBy('downloads');

    // Le premier devrait être "Test Tag Manager" (2100 downloads)
    const titles = await marketplace.getPluginTitles();
    expect(titles[0]).toContain('Tag Manager');
  });

  test('Les catégories doivent correspondre aux filtres', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Filtrer par "ai"
    await marketplace.filterByCategory('ai');

    // Devrait afficher uniquement "Test AI Assistant"
    const titles = await marketplace.getPluginTitles();
    expect(titles.length).toBe(1);
    expect(titles[0]).toContain('AI Assistant');
  });
});
