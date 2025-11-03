/**
 * Marketplace E2E Tests - Playwright
 * Tests de bout en bout du marketplace: discovery, ratings, installation
 */

import { test, expect } from '@playwright/test';

// Configuration
const REGISTRY_URL = process.env.TEST_REGISTRY_URL || 'http://localhost:3000/marketplace';
const TIMEOUT = 30000;

test.describe('Marketplace - Plugin Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REGISTRY_URL, { timeout: TIMEOUT });
  });

  test('devrait afficher la liste des plugins', async ({ page }) => {
    // Wait for plugins to load
    await page.waitForSelector('[data-testid="plugin-card"]', { timeout: TIMEOUT });

    // Count plugins
    const pluginCards = await page.$$('[data-testid="plugin-card"]');
    expect(pluginCards.length).toBeGreaterThan(0);
  });

  test('devrait pouvoir rechercher un plugin', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test-plugin');
    await searchInput.press('Enter');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify search results
    const results = await page.$$('[data-testid="plugin-card"]');
    if (results.length > 0) {
      const firstCard = page.locator('[data-testid="plugin-card"]').first();
      const cardText = await firstCard.textContent();
      expect(cardText?.toLowerCase()).toContain('test');
    }
  });

  test('devrait pouvoir filtrer par catégorie', async ({ page }) => {
    const categoryFilter = page.locator('select[name="category"]');
    await categoryFilter.selectOption('productivity');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify category badge
    const pluginCard = page.locator('[data-testid="plugin-card"]').first();
    await expect(pluginCard).toContainText('productivity', { ignoreCase: true });
  });

  test('devrait afficher les plugins featured', async ({ page }) => {
    const featuredSection = page.locator('[data-testid="featured-plugins"]');
    await expect(featuredSection).toBeVisible();

    // Check carousel navigation
    const nextButton = featuredSection.locator('button[aria-label*="Next"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('devrait afficher les plugins trending', async ({ page }) => {
    const trendingSection = page.locator('[data-testid="trending-plugins"]');
    await expect(trendingSection).toBeVisible();

    // Verify rank badges (Gold for #1)
    const firstPlugin = trendingSection.locator('[data-testid="plugin-card"]').first();
    const rankBadge = firstPlugin.locator('.bg-yellow-500');
    await expect(rankBadge).toBeVisible();
  });
});

test.describe('Marketplace - Plugin Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REGISTRY_URL, { timeout: TIMEOUT });
  });

  test('devrait ouvrir la page détails d\'un plugin', async ({ page }) => {
    // Click on first plugin
    const firstPlugin = page.locator('[data-testid="plugin-card"]').first();
    await firstPlugin.click();

    // Wait for details page
    await page.waitForSelector('[data-testid="plugin-details"]', { timeout: TIMEOUT });

    // Verify details elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="install-button"]')).toBeVisible();
  });

  test('devrait naviguer entre les onglets (Overview, Reviews, Changelog)', async ({ page }) => {
    // Open details
    const firstPlugin = page.locator('[data-testid="plugin-card"]').first();
    await firstPlugin.click();
    await page.waitForSelector('[data-testid="plugin-details"]', { timeout: TIMEOUT });

    // Click Reviews tab
    const reviewsTab = page.locator('button:has-text("Reviews")');
    await reviewsTab.click();
    await expect(page.locator('[data-testid="rating-stats"]')).toBeVisible();

    // Click Changelog tab
    const changelogTab = page.locator('button:has-text("Changelog")');
    await changelogTab.click();
    await expect(page.locator('text=/Version \\d/')).toBeVisible();
  });

  test('devrait afficher les screenshots avec navigation', async ({ page }) => {
    // Open details
    const firstPlugin = page.locator('[data-testid="plugin-card"]').first();
    await firstPlugin.click();
    await page.waitForSelector('[data-testid="plugin-details"]', { timeout: TIMEOUT });

    // Check screenshots if present
    const screenshotsSection = page.locator('[data-testid="screenshots"]');
    if (await screenshotsSection.isVisible()) {
      const nextButton = screenshotsSection.locator('button[aria-label*="Next"]');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(300);
      }
    }
  });
});

test.describe('Marketplace - Ratings & Reviews', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REGISTRY_URL, { timeout: TIMEOUT });

    // Open first plugin details
    const firstPlugin = page.locator('[data-testid="plugin-card"]').first();
    await firstPlugin.click();
    await page.waitForSelector('[data-testid="plugin-details"]', { timeout: TIMEOUT });

    // Go to Reviews tab
    const reviewsTab = page.locator('button:has-text("Reviews")');
    await reviewsTab.click();
  });

  test('devrait afficher les statistiques de rating', async ({ page }) => {
    const ratingStats = page.locator('[data-testid="rating-stats"]');
    await expect(ratingStats).toBeVisible();

    // Verify average rating
    await expect(ratingStats.locator('text=/\\d\\.\\d/')).toBeVisible();

    // Verify distribution bars
    const distributionBars = ratingStats.locator('.bg-yellow-500');
    expect(await distributionBars.count()).toBeGreaterThan(0);
  });

  test('devrait afficher la liste des reviews', async ({ page }) => {
    const ratingList = page.locator('[data-testid="rating-list"]');
    if (await ratingList.isVisible()) {
      const reviews = await ratingList.locator('[data-testid="rating-card"]').count();
      expect(reviews).toBeGreaterThan(0);
    }
  });

  test('devrait pouvoir ouvrir le formulaire de review', async ({ page }) => {
    const writeReviewButton = page.locator('button:has-text("Write a Review")');
    if (await writeReviewButton.isVisible()) {
      await writeReviewButton.click();

      // Verify form elements
      await expect(page.locator('input[name="author"]')).toBeVisible();
      await expect(page.locator('textarea[name="comment"]')).toBeVisible();
    }
  });

  test('devrait valider le formulaire de review', async ({ page }) => {
    const writeReviewButton = page.locator('button:has-text("Write a Review")');
    if (await writeReviewButton.isVisible()) {
      await writeReviewButton.click();

      // Try to submit without filling
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Expect validation error
      await expect(page.locator('text=/Please/i')).toBeVisible();
    }
  });
});

test.describe('Marketplace - Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Go to admin dashboard (requires auth)
    await page.goto(`${REGISTRY_URL}/admin`, { timeout: TIMEOUT });
  });

  test('devrait afficher access denied si non authentifié', async ({ page }) => {
    await expect(page.locator('text=/Access Denied/i')).toBeVisible();
  });

  // TODO: Add authenticated admin tests with proper login flow
});

test.describe('Marketplace - Performance', () => {
  test('devrait charger la page en moins de 3 secondes', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(REGISTRY_URL, { timeout: TIMEOUT });
    await page.waitForSelector('[data-testid="plugin-card"]', { timeout: TIMEOUT });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('devrait lazy-load les images', async ({ page }) => {
    await page.goto(REGISTRY_URL, { timeout: TIMEOUT });

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Check that new images loaded
    const images = await page.$$('img[loading="lazy"]');
    expect(images.length).toBeGreaterThan(0);
  });

  test('devrait utiliser le cache pour requêtes répétées', async ({ page }) => {
    // First load
    await page.goto(REGISTRY_URL, { timeout: TIMEOUT });
    await page.waitForSelector('[data-testid="plugin-card"]', { timeout: TIMEOUT });

    // Reload and verify faster load (from cache)
    const startTime = Date.now();
    await page.reload();
    await page.waitForSelector('[data-testid="plugin-card"]', { timeout: TIMEOUT });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000); // Cached should be < 2s
  });
});

test.describe('Marketplace - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REGISTRY_URL, { timeout: TIMEOUT });
  });

  test('devrait être navigable au clavier', async ({ page }) => {
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);
  });

  test('devrait avoir des labels ARIA', async ({ page }) => {
    const buttons = await page.$$('button');
    for (const button of buttons.slice(0, 5)) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      expect(ariaLabel || text).toBeTruthy();
    }
  });
});
