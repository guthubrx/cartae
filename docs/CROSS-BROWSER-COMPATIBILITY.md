# Cross-Browser Compatibility - Cartae Enterprise

## Browsers Supportés

### ✅ Tier 1 (Support Complet)
- Chrome/Edge 120+ (Chromium moderne)
- Firefox 120+
- Safari 17+ (macOS, iOS)

### ⚠️ Tier 2 (Support Partiel)
- Chrome/Edge 100-119
- Firefox 100-119
- Safari 15-16

### ❌ Non Supportés
- Internet Explorer (toutes versions)
- Browsers anciens (< 2 ans)

## Checklist Validation

### Navigation & Routing
- [ ] SPA navigation (React Router)
- [ ] Back/Forward browser (history API)
- [ ] Deep links (URL routing)
- [ ] Lazy loading routes (dynamic imports)

### UI & Styling
- [ ] Tailwind CSS classes render correctement
- [ ] Dark mode toggle
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Flexbox layouts
- [ ] CSS Grid layouts
- [ ] Custom properties (CSS variables)
- [ ] Animations CSS/JS
- [ ] Shadows et effets visuels

### JavaScript Features
- [ ] Optional chaining (?.)
- [ ] Nullish coalescing (??)
- [ ] Async/await
- [ ] Promises
- [ ] ES Modules (import/export)
- [ ] Array methods (flatMap, etc.)
- [ ] BigInt (si utilisé)
- [ ] Dynamic imports

### Data Storage
- [ ] IndexedDB (Dexie)
- [ ] LocalStorage
- [ ] SessionStorage
- [ ] Cookies

### Performance
- [ ] Code splitting (lazy imports)
- [ ] Suspense boundaries
- [ ] Web Workers (si utilisés)
- [ ] Service Workers (si utilisés)
- [ ] Virtual scrolling (grandes listes)

### Security
- [ ] Vault encryption (WebCrypto API)
- [ ] HTTPS required features
- [ ] Content Security Policy
- [ ] Secure cookies

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen readers (NVDA, VoiceOver)
- [ ] ARIA labels
- [ ] Focus management
- [ ] High contrast mode

### Forms & Inputs
- [ ] Input validation
- [ ] File uploads
- [ ] Date pickers
- [ ] Autocomplete
- [ ] Copy/Paste
- [ ] Rich text editing (si utilisé)

### Network
- [ ] Fetch API
- [ ] WebSockets (si utilisés)
- [ ] CORS headers
- [ ] Rate limiting (429 responses)
- [ ] Offline mode (si implémenté)

### Multimedia
- [ ] Images (PNG, JPG, SVG, WebP)
- [ ] Icons (Lucide React)
- [ ] Fonts (WOFF2)
- [ ] Lazy loading images

## Tests Manuels

### Chrome (Desktop)
1. Ouvrir https://app.cartae.io (ou http://localhost:5173 en dev)
2. Login avec credentials test
3. Naviguer toutes pages principales
4. Tester features critiques (plugins, vault, etc.)
5. Vérifier console (0 erreurs)
6. DevTools > Lighthouse audit (Performance > 90)
7. Tester dark mode toggle
8. Tester responsive (DevTools > Device Toolbar)

### Firefox (Desktop)
1-7. Mêmes étapes que Chrome
8. DevTools > Console (0 erreurs)
9. Tester Ctrl+R reload

### Safari (macOS)
1-7. Mêmes étapes
8. Web Inspector > Console (0 erreurs)
9. Tester Cmd+R reload
10. Tester scrolling (doit être fluide)

### Edge (Desktop)
1-7. Mêmes étapes
8. F12 > Console (0 erreurs)
9. Tester intégration Windows (si applicable)

### Mobile (Safari iOS)
1. Ouvrir sur iPhone/iPad
2. Tester responsive breakpoints
3. Tester touch gestures (swipe, pinch, tap)
4. Tester clavier virtuel
5. Vérifier scrolling performant
6. Tester orientation (portrait/landscape)
7. Tester Safe Area (notch iPhone)

### Mobile (Chrome Android)
1-7. Mêmes étapes sur Android
8. Tester navigation gesture Android
9. Tester clavier Android

## Polyfills & Fallbacks

### Pas de polyfills nécessaires (ES2020 natif)
- Chrome 120+, Firefox 120+, Safari 17+ supportent ES2020 nativement
- Vite + esbuild transpilent vers ES2020 (target dans vite.config.ts)
- React 18 supporte nativement tous browsers modernes

### Fallbacks CSS
- Tailwind CSS génère vendor prefixes automatiquement
- Flexbox/Grid supportés nativement dans tous browsers modernes
- PostCSS traite autoprefixer automatiquement

### Feature Detection
```javascript
// WebCrypto API (Vault encryption)
if (!window.crypto || !window.crypto.subtle) {
  alert('Votre navigateur ne supporte pas le chiffrement. Veuillez le mettre à jour.');
}

// IndexedDB (Dexie)
if (!window.indexedDB) {
  alert('Votre navigateur ne supporte pas IndexedDB.');
}

// Service Workers (optionnel)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## Browserslist Configuration

### package.json (racine monorepo)
```json
{
  "browserslist": [
    "chrome >= 100",
    "firefox >= 100",
    "safari >= 15",
    "edge >= 100",
    "not dead",
    "not ie 11"
  ]
}
```

### Vérifier compatibilité
```bash
# Installer browserslist (si pas déjà installé)
pnpm add -D browserslist

# Lister browsers supportés
pnpm exec browserslist
```

## Tests Automatisés (Playwright)

### Configuration Playwright (playwright.config.ts)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Lancer tests cross-browser
```bash
# Tous browsers
pnpm exec playwright test

# Browser spécifique
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit
pnpm exec playwright test --project=edge

# Mobile
pnpm exec playwright test --project="Mobile Chrome"
pnpm exec playwright test --project="Mobile Safari"

# Rapport HTML
pnpm exec playwright show-report
```

### Example Test Cross-Browser
```typescript
import { test, expect } from '@playwright/test';

test.describe('Cross-browser compatibility', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should support dark mode', async ({ page }) => {
    await page.goto('/');
    const darkModeToggle = page.locator('[aria-label="Toggle dark mode"]');
    await darkModeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should handle IndexedDB', async ({ page }) => {
    const hasIndexedDB = await page.evaluate(() => {
      return Boolean(window.indexedDB);
    });
    expect(hasIndexedDB).toBe(true);
  });

  test('should support WebCrypto', async ({ page }) => {
    const hasWebCrypto = await page.evaluate(() => {
      return Boolean(window.crypto && window.crypto.subtle);
    });
    expect(hasWebCrypto).toBe(true);
  });
});
```

## Known Issues & Workarounds

### Safari iOS < 17 (non supporté, mais utilisateurs potentiels)
**Problème:** `scrollIntoView({ behavior: 'smooth' })` non supporté
**Workaround:**
```typescript
// Fallback pour Safari iOS ancien
const scrollIntoViewSafe = (element: HTMLElement) => {
  if ('scrollBehavior' in document.documentElement.style) {
    element.scrollIntoView({ behavior: 'smooth' });
  } else {
    element.scrollIntoView(); // Non smooth
  }
};
```

### Firefox < 120 (support partiel)
**Problème:** `:has()` selector CSS non supporté
**Workaround:** Utiliser classes Tailwind au lieu de `:has()`
```css
/* ❌ Éviter */
.parent:has(.child) { ... }

/* ✅ Utiliser */
.parent.has-child { ... }
```

### Edge Legacy (non supporté)
- Edge basé Chromium uniquement (version 79+)
- Edge Legacy (EdgeHTML) n'est plus supporté par Microsoft

### WebP Images (Safari < 14)
**Problème:** Format WebP non supporté
**Workaround:** Fournir fallback PNG/JPG
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="Fallback">
</picture>
```

### IndexedDB Storage Limits
**Problème:** Quotas différents selon browsers
**Workaround:**
```typescript
// Vérifier quota disponible
const checkQuota = async () => {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    console.log(`Using ${usage} of ${quota} bytes`);
    return { usage, quota };
  }
  return null;
};
```

## Outils Recommandés

### Tests Automatisés
- **Playwright** (multi-browser, headless) - Déjà configuré
- **BrowserStack** (tests réels sur devices physiques)
- **Sauce Labs** (tests cloud multi-plateformes)

### Tests Manuels
- **Chrome DevTools** (Lighthouse, Network, Performance)
- **Firefox DevTools** (Accessibility Inspector)
- **Safari Web Inspector** (Responsive Design Mode)
- **Edge DevTools** (Memory profiler)

### Validation CSS
- **Can I Use** (https://caniuse.com) - Vérifier support features
- **Autoprefixer** (intégré Tailwind) - Vendor prefixes automatiques
- **Browserslist** (https://browserslist.dev) - Tester queries

### Monitoring Production
- **Sentry** (erreurs navigateurs, stack traces)
- **Google Analytics** (statistiques browsers/devices)
- **LogRocket** (session replay cross-browser)

### Debugging
- **BrowserStack** (debugging réel sur devices)
- **Responsively** (app multi-browser preview)
- **ngrok** (tester sur devices mobiles locaux)

## Support Matrix

| Feature | Chrome 120+ | Firefox 120+ | Safari 17+ | Edge 120+ |
|---------|-------------|--------------|------------|-----------|
| ES2020 | ✅ | ✅ | ✅ | ✅ |
| CSS Grid | ✅ | ✅ | ✅ | ✅ |
| Flexbox | ✅ | ✅ | ✅ | ✅ |
| Custom Properties | ✅ | ✅ | ✅ | ✅ |
| WebCrypto | ✅ | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| LocalStorage | ✅ | ✅ | ✅ | ✅ |
| Service Workers | ✅ | ✅ | ✅ | ✅ |
| Web Workers | ✅ | ✅ | ✅ | ✅ |
| Suspense | ✅ | ✅ | ✅ | ✅ |
| Dynamic Import | ✅ | ✅ | ✅ | ✅ |
| Optional Chaining | ✅ | ✅ | ✅ | ✅ |
| Nullish Coalescing | ✅ | ✅ | ✅ | ✅ |
| BigInt | ✅ | ✅ | ✅ | ✅ |
| WebP | ✅ | ✅ | ✅ | ✅ |
| WOFF2 | ✅ | ✅ | ✅ | ✅ |
| CSS Container Queries | ✅ | ✅ | ✅ | ✅ |
| CSS :has() | ✅ | ✅ | ✅ | ✅ |

### Versions Minimales Testées

| Browser | Version | Date Release | Notes |
|---------|---------|--------------|-------|
| Chrome | 100 | Mars 2022 | Tier 2 support |
| Chrome | 120 | Décembre 2023 | Tier 1 support |
| Firefox | 100 | Mai 2022 | Tier 2 support |
| Firefox | 120 | Novembre 2023 | Tier 1 support |
| Safari | 15 | Septembre 2021 | Tier 2 support |
| Safari | 17 | Septembre 2023 | Tier 1 support |
| Edge | 100 | Avril 2022 | Tier 2 support |
| Edge | 120 | Décembre 2023 | Tier 1 support |

## Process de Validation

### 1. Pre-Release Checklist
- [ ] Lancer tous tests Playwright cross-browser
- [ ] Tests manuels sur Chrome, Firefox, Safari, Edge
- [ ] Tests manuels sur iOS Safari + Android Chrome
- [ ] Lighthouse audit (Performance > 90, Accessibility > 95)
- [ ] Vérifier console (0 erreurs)
- [ ] Tester dark mode sur tous browsers
- [ ] Tester responsive breakpoints
- [ ] Vérifier feature detection (browserSupport.ts)

### 2. Release Validation
- [ ] Deploy staging → tester sur browsers réels
- [ ] BrowserStack tests (si disponible)
- [ ] Vérifier Sentry (0 erreurs navigateurs)
- [ ] Monitorer Google Analytics (browser stats)

### 3. Post-Release Monitoring
- [ ] Surveiller Sentry (erreurs browser-specific)
- [ ] Analyser GA (browsers utilisés)
- [ ] Collecter feedback utilisateurs (bugs browsers)
- [ ] Mettre à jour support matrix si nécessaire

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Cross-Browser Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm exec playwright install --with-deps

      - name: Run Playwright tests (all browsers)
        run: pnpm exec playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Resources & Documentation

### Official Docs
- [Can I Use](https://caniuse.com) - Feature support tables
- [MDN Browser Compatibility](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Page_structures/Compatibility_tables)
- [Playwright Documentation](https://playwright.dev)
- [Browserslist](https://github.com/browserslist/browserslist)

### Browser Docs
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Firefox DevTools](https://firefox-source-docs.mozilla.org/devtools-user/)
- [Safari Web Inspector](https://webkit.org/web-inspector/)
- [Edge DevTools](https://docs.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/)

### Testing Services
- [BrowserStack](https://www.browserstack.com)
- [Sauce Labs](https://saucelabs.com)
- [LambdaTest](https://www.lambdatest.com)

## Support Contact

**Issues cross-browser:** Ouvrir issue GitHub avec label `browser-compatibility`
**Template:**
```markdown
### Browser Info
- Browser: [Chrome/Firefox/Safari/Edge]
- Version: [120+]
- OS: [Windows/macOS/iOS/Android]

### Expected Behavior
[Description]

### Actual Behavior
[Description]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]

### Screenshots
[Si applicable]

### Console Errors
[Copier erreurs console]
```

---

**Last Updated:** 2025-11-17
**Version:** 1.0.0
**Maintainer:** Cartae Engineering Team
