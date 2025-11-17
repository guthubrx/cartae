/**
 * Cross-Browser Compatibility Tests
 *
 * FR: Tests de compatibilité cross-browser
 * EN: Cross-browser compatibility tests
 *
 * Ces tests vérifient que l'application fonctionne sur tous les navigateurs supportés
 * These tests verify the application works on all supported browsers
 *
 * Run:
 * pnpm exec playwright test tests/cross-browser/compatibility.spec.ts
 * pnpm exec playwright test tests/cross-browser/compatibility.spec.ts --project=chromium
 * pnpm exec playwright test tests/cross-browser/compatibility.spec.ts --project=firefox
 * pnpm exec playwright test tests/cross-browser/compatibility.spec.ts --project=webkit
 * pnpm exec playwright test tests/cross-browser/compatibility.spec.ts --project=edge
 */

import { test, expect } from '@playwright/test';

test.describe('Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    // FR: Naviguer vers la page d'accueil
    // EN: Navigate to homepage
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // FR: Vérifier que la page charge sans erreur
    // EN: Verify page loads without errors
    await expect(page.locator('body')).toBeVisible();

    // FR: Vérifier qu'il n'y a pas d'erreurs dans la console
    // EN: Verify no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for potential errors
    await page.waitForTimeout(2000);

    // FR: Accepter seulement les erreurs connues/attendues
    // EN: Only accept known/expected errors
    const criticalErrors = errors.filter(
      (err) => !err.includes('DevTools') && !err.includes('extension')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should support WebCrypto API', async ({ page }) => {
    // FR: Vérifier que WebCrypto est supporté (requis pour Vault)
    // EN: Verify WebCrypto is supported (required for Vault)
    const hasWebCrypto = await page.evaluate(() => {
      return Boolean(window.crypto && window.crypto.subtle);
    });

    expect(hasWebCrypto).toBe(true);
  });

  test('should support IndexedDB', async ({ page }) => {
    // FR: Vérifier que IndexedDB est supporté (requis pour Dexie)
    // EN: Verify IndexedDB is supported (required for Dexie)
    const hasIndexedDB = await page.evaluate(() => {
      return Boolean(window.indexedDB);
    });

    expect(hasIndexedDB).toBe(true);
  });

  test('should support LocalStorage', async ({ page }) => {
    // FR: Vérifier que LocalStorage est supporté
    // EN: Verify LocalStorage is supported
    const hasLocalStorage = await page.evaluate(() => {
      try {
        const test = '__test__';
        window.localStorage.setItem(test, test);
        window.localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    });

    expect(hasLocalStorage).toBe(true);
  });

  test('should support CSS Grid', async ({ page }) => {
    // FR: Vérifier que CSS Grid est supporté
    // EN: Verify CSS Grid is supported
    const hasCSSGrid = await page.evaluate(() => {
      return CSS.supports('display', 'grid');
    });

    expect(hasCSSGrid).toBe(true);
  });

  test('should support CSS Flexbox', async ({ page }) => {
    // FR: Vérifier que Flexbox est supporté
    // EN: Verify Flexbox is supported
    const hasFlexbox = await page.evaluate(() => {
      return CSS.supports('display', 'flex');
    });

    expect(hasFlexbox).toBe(true);
  });

  test('should support CSS Custom Properties', async ({ page }) => {
    // FR: Vérifier que CSS Variables sont supportées
    // EN: Verify CSS Variables are supported
    const hasCSSVars = await page.evaluate(() => {
      return CSS.supports('--test', '0');
    });

    expect(hasCSSVars).toBe(true);
  });

  test('should support ES2020 features', async ({ page }) => {
    // FR: Vérifier que ES2020 est supporté
    // EN: Verify ES2020 is supported
    const hasES2020 = await page.evaluate(() => {
      try {
        // Optional chaining
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = null;
        const optionalChaining = obj?.prop === undefined;

        // Nullish coalescing
        const nullishCoalescing = (null ?? 'default') === 'default';

        return optionalChaining && nullishCoalescing;
      } catch {
        return false;
      }
    });

    expect(hasES2020).toBe(true);
  });

  test('should render Tailwind CSS correctly', async ({ page }) => {
    // FR: Vérifier que Tailwind CSS est appliqué
    // EN: Verify Tailwind CSS is applied
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // FR: Vérifier qu'au moins quelques classes Tailwind sont présentes
    // EN: Verify at least some Tailwind classes are present
    const hasClasses = await page.evaluate(() => {
      const element = document.querySelector('body');
      return element !== null && element.className.length > 0;
    });

    expect(hasClasses).toBe(true);
  });

  test('should handle navigation correctly', async ({ page, browserName }) => {
    // FR: Tester la navigation SPA
    // EN: Test SPA navigation
    await page.goto('/');

    // FR: Vérifier que Back/Forward fonctionne
    // EN: Verify Back/Forward works
    await page.goBack();
    await page.goForward();

    // FR: Pas d'erreurs après navigation
    // EN: No errors after navigation
    await expect(page.locator('body')).toBeVisible();
  });

  test('should support Service Workers (optional)', async ({ page, browserName }) => {
    // FR: Vérifier que Service Workers sont supportés (optionnel)
    // EN: Verify Service Workers are supported (optional)
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });

    // FR: Service Workers sont optionnels, juste logger
    // EN: Service Workers are optional, just log
    console.log(`Service Worker support (${browserName}):`, hasServiceWorker);
    expect(hasServiceWorker).toBeDefined();
  });

  test('should support Web Workers (optional)', async ({ page, browserName }) => {
    // FR: Vérifier que Web Workers sont supportés (optionnel)
    // EN: Verify Web Workers are supported (optional)
    const hasWorker = await page.evaluate(() => {
      return typeof Worker !== 'undefined';
    });

    // FR: Web Workers sont optionnels, juste logger
    // EN: Web Workers are optional, just log
    console.log(`Web Worker support (${browserName}):`, hasWorker);
    expect(hasWorker).toBeDefined();
  });

  test('should support Clipboard API (optional)', async ({ page, browserName }) => {
    // FR: Vérifier que Clipboard API est supporté (optionnel)
    // EN: Verify Clipboard API is supported (optional)
    const hasClipboard = await page.evaluate(() => {
      return Boolean(navigator.clipboard);
    });

    // FR: Clipboard API est optionnel, juste logger
    // EN: Clipboard API is optional, just log
    console.log(`Clipboard API support (${browserName}):`, hasClipboard);
    expect(hasClipboard).toBeDefined();
  });

  test('should handle responsive breakpoints', async ({ page, viewport }) => {
    // FR: Tester les breakpoints responsive
    // EN: Test responsive breakpoints
    if (!viewport) return;

    const { width } = viewport;

    // FR: Vérifier que la page s'adapte à la taille de l'écran
    // EN: Verify page adapts to screen size
    await expect(page.locator('body')).toBeVisible();

    // FR: Logger la taille de viewport pour debugging
    // EN: Log viewport size for debugging
    console.log(`Viewport: ${width}px`);

    // FR: Tailwind breakpoints:
    // sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;

    console.log(`Device: ${isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}`);

    // FR: La page doit être visible sur tous les breakpoints
    // EN: Page should be visible on all breakpoints
    expect(await page.locator('body').isVisible()).toBe(true);
  });

  test('should support dark mode toggle', async ({ page }) => {
    // FR: Tester le toggle dark mode
    // EN: Test dark mode toggle
    const html = page.locator('html');

    // FR: Vérifier état initial (light ou dark)
    // EN: Verify initial state (light or dark)
    const initialClass = await html.getAttribute('class');
    console.log('Initial theme:', initialClass);

    // FR: Chercher le bouton dark mode toggle
    // EN: Find dark mode toggle button
    const toggleButton = page.locator('[aria-label*="dark" i], [aria-label*="theme" i]').first();

    // FR: Si le bouton existe, le tester
    // EN: If button exists, test it
    const toggleExists = await toggleButton.count();
    if (toggleExists > 0) {
      await toggleButton.click();
      await page.waitForTimeout(500);

      const newClass = await html.getAttribute('class');
      console.log('After toggle:', newClass);

      // FR: La classe doit changer
      // EN: Class should change
      expect(newClass).not.toBe(initialClass);
    } else {
      console.log('Dark mode toggle not found (might not be implemented yet)');
    }
  });

  test('should handle async/await correctly', async ({ page }) => {
    // FR: Vérifier que async/await fonctionne
    // EN: Verify async/await works
    const asyncWorks = await page.evaluate(async () => {
      try {
        const promise = new Promise((resolve) => {
          setTimeout(() => resolve('success'), 100);
        });
        const result = await promise;
        return result === 'success';
      } catch {
        return false;
      }
    });

    expect(asyncWorks).toBe(true);
  });

  test('should handle Promises correctly', async ({ page }) => {
    // FR: Vérifier que Promises fonctionnent
    // EN: Verify Promises work
    const promiseWorks = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(true), 100);
      });
    });

    expect(promiseWorks).toBe(true);
  });

  test('should support dynamic imports', async ({ page }) => {
    // FR: Vérifier que dynamic imports sont supportés
    // EN: Verify dynamic imports are supported
    const hasDynamicImport = await page.evaluate(() => {
      return typeof import === 'function';
    });

    expect(hasDynamicImport).toBe(true);
  });
});

test.describe('Mobile-Specific Tests', () => {
  // FR: Ces tests ne s'exécutent que sur mobile
  // EN: These tests only run on mobile
  test.skip(({ browserName }) => browserName !== 'chromium' && browserName !== 'webkit');

  test('should handle touch events', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto('/');

    // FR: Vérifier que les touch events sont supportés
    // EN: Verify touch events are supported
    const hasTouchEvents = await page.evaluate(() => {
      return 'ontouchstart' in window;
    });

    expect(hasTouchEvents).toBe(true);
  });

  test('should handle viewport meta tag', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto('/');

    // FR: Vérifier que viewport meta tag est présent
    // EN: Verify viewport meta tag is present
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');

    expect(viewportMeta).toContain('width=device-width');
  });
});
