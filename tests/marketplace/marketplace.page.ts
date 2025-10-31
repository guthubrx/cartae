/**
 * Marketplace Page Object
 * Page Object Model pour les tests E2E du Marketplace
 */

import { Page, Locator, expect } from '@playwright/test';

export class MarketplacePage {
  readonly page: Page;

  // Locators principaux
  readonly marketplaceTab: Locator;

  readonly searchInput: Locator;

  readonly categoryFilter: Locator;

  readonly sourceFilter: Locator;

  readonly pricingFilter: Locator;

  readonly sortDropdown: Locator;

  readonly pluginCards: Locator;

  readonly featuredSection: Locator;

  readonly trendingSection: Locator;

  readonly loadingSpinner: Locator;

  readonly emptyState: Locator;

  readonly errorMessage: Locator;

  // Pagination
  readonly nextPageButton: Locator;

  readonly prevPageButton: Locator;

  readonly currentPageInfo: Locator;

  // Stats
  readonly totalPluginsCount: Locator;

  readonly filteredPluginsCount: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.marketplaceTab = page.getByRole('tab', { name: /marketplace/i });

    // Recherche et filtres
    this.searchInput = page.getByPlaceholder(/rechercher/i);
    this.categoryFilter = page.getByLabel(/catégorie/i);
    this.sourceFilter = page.getByLabel(/source/i);
    this.pricingFilter = page.getByLabel(/pricing|tarif/i);
    this.sortDropdown = page.getByLabel(/trier|sort/i);

    // Contenu
    this.pluginCards = page.locator('[data-testid="plugin-card"]');
    this.featuredSection = page.locator('[data-testid="featured-plugins"]');
    this.trendingSection = page.locator('[data-testid="trending-plugins"]');

    // États
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.emptyState = page.locator('[data-testid="empty-state"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');

    // Pagination
    this.nextPageButton = page.getByRole('button', { name: /suivant|next/i });
    this.prevPageButton = page.getByRole('button', { name: /précédent|previous/i });
    this.currentPageInfo = page.locator('[data-testid="page-info"]');

    // Stats
    this.totalPluginsCount = page.locator('[data-testid="total-plugins"]');
    this.filteredPluginsCount = page.locator('[data-testid="filtered-plugins"]');
  }

  /**
   * Naviguer vers le Marketplace
   */
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');

    // Cliquer sur l'onglet Settings ou Plugins
    const settingsButton = this.page.getByRole('button', { name: /settings|paramètres/i });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
    }

    // Cliquer sur le tab Marketplace
    await this.marketplaceTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Attendre le chargement des plugins
   */
  async waitForPluginsLoaded(): Promise<void> {
    // Attendre que le spinner disparaisse
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});

    // Attendre que les cartes de plugins soient visibles
    await this.pluginCards
      .first()
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
  }

  /**
   * Rechercher un plugin
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.waitForPluginsLoaded();
  }

  /**
   * Filtrer par catégorie
   */
  async filterByCategory(category: string): Promise<void> {
    await this.categoryFilter.selectOption(category);
    await this.waitForPluginsLoaded();
  }

  /**
   * Filtrer par source
   */
  async filterBySource(source: string): Promise<void> {
    await this.sourceFilter.selectOption(source);
    await this.waitForPluginsLoaded();
  }

  /**
   * Filtrer par pricing
   */
  async filterByPricing(pricing: string): Promise<void> {
    await this.pricingFilter.selectOption(pricing);
    await this.waitForPluginsLoaded();
  }

  /**
   * Trier les plugins
   */
  async sortBy(sortOption: string): Promise<void> {
    await this.sortDropdown.selectOption(sortOption);
    await this.waitForPluginsLoaded();
  }

  /**
   * Obtenir le nombre de plugins affichés
   */
  async getPluginCount(): Promise<number> {
    return this.pluginCards.count();
  }

  /**
   * Obtenir les titres des plugins affichés
   */
  async getPluginTitles(): Promise<string[]> {
    const titles: string[] = [];
    const count = await this.getPluginCount();

    for (let i = 0; i < count; i++) {
      const card = this.pluginCards.nth(i);
      const titleElement = card.locator('[data-testid="plugin-name"]');
      const title = await titleElement.textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Cliquer sur un plugin par son index
   */
  async clickPluginByIndex(index: number): Promise<void> {
    await this.pluginCards.nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Cliquer sur un plugin par son nom
   */
  async clickPluginByName(name: string): Promise<void> {
    const plugin = this.page.locator(`[data-testid="plugin-card"]:has-text("${name}")`);
    await plugin.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Vérifier qu'un plugin est affiché
   */
  async hasPlugin(name: string): Promise<boolean> {
    const plugin = this.page.locator(`[data-testid="plugin-card"]:has-text("${name}")`);
    return plugin.isVisible();
  }

  /**
   * Naviguer vers la page suivante
   */
  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
    await this.waitForPluginsLoaded();
  }

  /**
   * Naviguer vers la page précédente
   */
  async goToPreviousPage(): Promise<void> {
    await this.prevPageButton.click();
    await this.waitForPluginsLoaded();
  }

  /**
   * Vérifier l'état vide (aucun résultat)
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Vérifier s'il y a une erreur
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Obtenir le message d'erreur
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Prendre un screenshot du marketplace
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/marketplace-${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Vérifier les plugins featured
   */
  async getFeaturedPlugins(): Promise<string[]> {
    const featuredCards = this.featuredSection.locator('[data-testid="plugin-card"]');
    const count = await featuredCards.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const titleElement = featuredCards.nth(i).locator('[data-testid="plugin-name"]');
      const title = await titleElement.textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Vérifier les plugins trending
   */
  async getTrendingPlugins(): Promise<string[]> {
    const trendingCards = this.trendingSection.locator('[data-testid="plugin-card"]');
    const count = await trendingCards.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const titleElement = trendingCards.nth(i).locator('[data-testid="plugin-name"]');
      const title = await titleElement.textContent();
      if (title) {
        titles.push(title.trim());
      }
    }

    return titles;
  }

  /**
   * Reset tous les filtres
   */
  async resetFilters(): Promise<void> {
    await this.searchInput.clear();
    await this.categoryFilter.selectOption('all');
    await this.sourceFilter.selectOption('all');
    await this.pricingFilter.selectOption('all');
    await this.waitForPluginsLoaded();
  }
}
