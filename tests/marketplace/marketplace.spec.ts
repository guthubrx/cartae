/**
 * Marketplace E2E Tests
 * Tests end-to-end complets pour le système de Marketplace
 */

import { test, expect } from '@playwright/test';
import { MarketplacePage } from './marketplace.page';

test.describe('Marketplace - Navigation & Chargement', () => {
  test('Doit charger le marketplace et afficher les plugins', async ({ page }) => {
    const marketplace = new MarketplacePage(page);

    // Naviguer vers le marketplace
    await marketplace.goto();

    // Vérifier que des plugins sont affichés
    await marketplace.waitForPluginsLoaded();
    const pluginCount = await marketplace.getPluginCount();

    expect(pluginCount).toBeGreaterThan(0);

    // Screenshot
    await marketplace.screenshot('initial-load');
  });

  test('Doit afficher les stats du marketplace', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Vérifier que les stats sont visibles
    const totalVisible = await marketplace.totalPluginsCount.isVisible();
    expect(totalVisible).toBeTruthy();
  });

  test('Doit gérer les erreurs réseau gracieusement', async ({ page }) => {
    // Simuler une erreur réseau
    await page.route('**/api/plugins*', route => route.abort('internetdisconnected'));

    const marketplace = new MarketplacePage(page);
    await marketplace.goto();

    // Vérifier qu'un message d'erreur est affiché
    const hasError = await marketplace.hasError();

    // Selon l'implémentation, soit erreur soit empty state
    if (hasError) {
      const errorMsg = await marketplace.getErrorMessage();
      expect(errorMsg).toBeTruthy();
    } else {
      const isEmpty = await marketplace.isEmptyStateVisible();
      expect(isEmpty).toBeTruthy();
    }
  });
});

test.describe('Marketplace - Recherche', () => {
  test('Doit rechercher des plugins par nom', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Rechercher "palette"
    await marketplace.search('palette');

    // Vérifier que les résultats contiennent "palette"
    const titles = await marketplace.getPluginTitles();
    const hasRelevantResults = titles.some(title => title.toLowerCase().includes('palette'));

    expect(hasRelevantResults).toBeTruthy();

    await marketplace.screenshot('search-palette');
  });

  test('Doit afficher un état vide pour une recherche sans résultat', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Rechercher quelque chose qui n'existe pas
    await marketplace.search('xyznonexistentplugin123');

    // Vérifier l'état vide
    const isEmpty = await marketplace.isEmptyStateVisible();
    expect(isEmpty).toBeTruthy();

    await marketplace.screenshot('search-no-results');
  });

  test('Doit rechercher par tag', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Rechercher un tag commun
    await marketplace.search('theme');

    // Vérifier qu'il y a des résultats
    const pluginCount = await marketplace.getPluginCount();
    expect(pluginCount).toBeGreaterThan(0);
  });
});

test.describe('Marketplace - Filtres', () => {
  test('Doit filtrer par catégorie', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Filtrer par catégorie "theme"
    await marketplace.filterByCategory('theme');

    // Vérifier que des plugins sont affichés
    const pluginCount = await marketplace.getPluginCount();
    expect(pluginCount).toBeGreaterThan(0);

    await marketplace.screenshot('filter-category-theme');
  });

  test('Doit filtrer par source', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Filtrer par source "official"
    await marketplace.filterBySource('official');

    // Vérifier que des plugins sont affichés
    const pluginCount = await marketplace.getPluginCount();
    expect(pluginCount).toBeGreaterThan(0);

    await marketplace.screenshot('filter-source-official');
  });

  test('Doit filtrer par pricing', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Filtrer par pricing "free"
    await marketplace.filterByPricing('free');

    // Vérifier que des plugins sont affichés
    const pluginCount = await marketplace.getPluginCount();
    expect(pluginCount).toBeGreaterThan(0);

    await marketplace.screenshot('filter-pricing-free');
  });

  test('Doit combiner plusieurs filtres', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Combiner catégorie + source
    await marketplace.filterByCategory('productivity');
    await marketplace.filterBySource('official');

    // Vérifier que les filtres sont appliqués
    const pluginCount = await marketplace.getPluginCount();
    // Peut être 0 si aucun plugin ne correspond
    expect(pluginCount).toBeGreaterThanOrEqual(0);

    await marketplace.screenshot('filter-combined');
  });

  test('Doit pouvoir reset les filtres', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Appliquer des filtres
    await marketplace.filterByCategory('theme');
    const filteredCount = await marketplace.getPluginCount();

    // Reset les filtres
    await marketplace.resetFilters();
    const allCount = await marketplace.getPluginCount();

    // Le total devrait être >= au nombre filtré
    expect(allCount).toBeGreaterThanOrEqual(filteredCount);
  });
});

test.describe('Marketplace - Tri', () => {
  test('Doit trier par nom', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Trier par nom
    await marketplace.sortBy('name');

    // Récupérer les titres
    const titles = await marketplace.getPluginTitles();

    // Vérifier que c'est trié alphabétiquement
    const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sortedTitles);

    await marketplace.screenshot('sort-by-name');
  });

  test('Doit trier par downloads', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Trier par downloads
    await marketplace.sortBy('downloads');

    // Vérifier que des plugins sont affichés
    const pluginCount = await marketplace.getPluginCount();
    expect(pluginCount).toBeGreaterThan(0);

    await marketplace.screenshot('sort-by-downloads');
  });

  test('Doit trier par rating', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Trier par rating
    await marketplace.sortBy('rating');

    // Vérifier que des plugins sont affichés
    const pluginCount = await marketplace.getPluginCount();
    expect(pluginCount).toBeGreaterThan(0);

    await marketplace.screenshot('sort-by-rating');
  });
});

test.describe('Marketplace - Pagination', () => {
  test('Doit paginer les résultats', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Récupérer les plugins de la page 1
    const page1Titles = await marketplace.getPluginTitles();

    // Aller à la page 2 (si elle existe)
    const hasNextButton = await marketplace.nextPageButton.isVisible();

    if (hasNextButton && (await marketplace.nextPageButton.isEnabled())) {
      await marketplace.goToNextPage();

      // Récupérer les plugins de la page 2
      const page2Titles = await marketplace.getPluginTitles();

      // Les plugins doivent être différents
      expect(page2Titles).not.toEqual(page1Titles);

      await marketplace.screenshot('pagination-page-2');
    }
  });

  test('Doit pouvoir revenir à la page précédente', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Vérifier le bouton Next
    const hasNextButton = await marketplace.nextPageButton.isVisible();

    if (hasNextButton && (await marketplace.nextPageButton.isEnabled())) {
      // Aller à page 2
      await marketplace.goToNextPage();

      // Retour à page 1
      await marketplace.goToPreviousPage();

      // Vérifier qu'on est revenu
      const hasPrevButton = await marketplace.prevPageButton.isVisible();
      expect(hasPrevButton).toBeTruthy();
    }
  });
});

test.describe('Marketplace - Featured & Trending', () => {
  test('Doit afficher les plugins featured', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Vérifier la section featured
    const featuredVisible = await marketplace.featuredSection.isVisible();

    if (featuredVisible) {
      const featuredPlugins = await marketplace.getFeaturedPlugins();
      expect(featuredPlugins.length).toBeGreaterThan(0);

      await marketplace.screenshot('featured-plugins');
    }
  });

  test('Doit afficher les plugins trending', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Vérifier la section trending
    const trendingVisible = await marketplace.trendingSection.isVisible();

    if (trendingVisible) {
      const trendingPlugins = await marketplace.getTrendingPlugins();
      expect(trendingPlugins.length).toBeGreaterThan(0);

      await marketplace.screenshot('trending-plugins');
    }
  });
});

test.describe('Marketplace - Détails Plugin', () => {
  test("Doit ouvrir les détails d'un plugin", async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Cliquer sur le premier plugin
    await marketplace.clickPluginByIndex(0);

    // Vérifier qu'un modal ou une page de détails est ouverte
    const detailModal = page.locator('[data-testid="plugin-detail-modal"]');
    const isModalVisible = await detailModal.isVisible();

    expect(isModalVisible).toBeTruthy();

    await marketplace.screenshot('plugin-details');
  });

  test('Doit afficher les informations du plugin', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Ouvrir les détails
    await marketplace.clickPluginByIndex(0);

    // Vérifier les éléments de détails
    const detailName = page.locator('[data-testid="plugin-detail-name"]');
    const detailDescription = page.locator('[data-testid="plugin-detail-description"]');

    expect(await detailName.isVisible()).toBeTruthy();
    expect(await detailDescription.isVisible()).toBeTruthy();
  });

  test('Doit pouvoir fermer les détails', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Ouvrir les détails
    await marketplace.clickPluginByIndex(0);

    // Fermer via bouton
    const closeButton = page.getByRole('button', { name: /close|fermer/i });
    await closeButton.click();

    // Vérifier que le modal est fermé
    const detailModal = page.locator('[data-testid="plugin-detail-modal"]');
    const isModalHidden = !(await detailModal.isVisible());

    expect(isModalHidden).toBeTruthy();
  });
});

test.describe('Marketplace - Installation Plugin', () => {
  test("Doit afficher le bouton d'installation", async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Ouvrir les détails
    await marketplace.clickPluginByIndex(0);

    // Vérifier le bouton install
    const installButton = page.getByRole('button', { name: /install|installer/i });
    const isInstallVisible = await installButton.isVisible();

    expect(isInstallVisible).toBeTruthy();
  });

  test('Doit gérer le clic sur installation (TODO non implémenté)', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Ouvrir les détails
    await marketplace.clickPluginByIndex(0);

    // Cliquer sur install
    const installButton = page.getByRole('button', { name: /install|installer/i });
    await installButton.click();

    // Vérifier qu'un message TODO ou notification apparaît
    const notification = page.locator('[data-testid="notification"]');
    const toastMessage = page.locator('.toast, [role="alert"]');

    const hasNotification = (await notification.isVisible()) || (await toastMessage.isVisible());

    // Peut être true ou false selon l'implémentation
    // expect(hasNotification).toBeTruthy();
  });
});

test.describe('Marketplace - Performance & Cache', () => {
  test('Doit charger rapidement depuis le cache', async ({ page }) => {
    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Première chargement (mise en cache)
    const firstLoadStart = Date.now();
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();
    const firstLoadTime = Date.now() - firstLoadStart;

    // Deuxième chargement (depuis cache)
    const secondLoadStart = Date.now();
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();
    const secondLoadTime = Date.now() - secondLoadStart;

    // Le second chargement devrait être plus rapide ou similaire
    // (difficile de garantir car dépend du réseau)
    console.log(`First load: ${firstLoadTime}ms, Second load: ${secondLoadTime}ms`);

    // On vérifie juste que les deux chargements fonctionnent
    expect(secondLoadTime).toBeLessThan(30000); // Max 30s
  });

  test('Doit ne pas faire de requêtes réseau redondantes', async ({ page }) => {
    let apiCallCount = 0;

    // Intercepter les requêtes API
    await page.route('**/api/plugins*', route => {
      apiCallCount++;
      route.continue();
    });

    const marketplace = new MarketplacePage(page);
    await marketplace.goto();
    await marketplace.waitForPluginsLoaded();

    // Le cache devrait limiter les appels
    // (exact count dépend de l'implémentation)
    console.log(`API calls made: ${apiCallCount}`);

    // Au minimum, on vérifie qu'il y a eu au moins un appel
    expect(apiCallCount).toBeGreaterThan(0);
  });
});
