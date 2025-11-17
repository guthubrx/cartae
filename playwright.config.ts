/**
 * FR: Configuration Playwright pour BigMind
 * EN: Playwright configuration for BigMind
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // FR: Dossier des tests
  // EN: Test directory
  testDir: './tests',
  
  // FR: Nombre de workers parallèles
  // EN: Number of parallel workers
  fullyParallel: true,
  
  // FR: Échec si un test échoue
  // EN: Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // FR: Relancer les tests échoués
  // EN: Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // FR: Nombre de workers
  // EN: Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // FR: Reporter pour les résultats
  // EN: Reporter to use
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  
  // FR: Configuration globale
  // EN: Global setup
  use: {
    // FR: URL de base
    // EN: Base URL
    baseURL: 'http://localhost:3000',
    
    // FR: Capture des traces
    // EN: Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // FR: Capture des screenshots
    // EN: Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // FR: Capture des vidéos
    // EN: Record video on failure
    video: 'retain-on-failure',
    
    // FR: Timeout pour les actions
    // EN: Action timeout
    actionTimeout: 10000,
    
    // FR: Timeout pour la navigation
    // EN: Navigation timeout
    navigationTimeout: 30000,
  },

  // FR: Configuration des projets (navigateurs)
  // EN: Configure projects for major browsers
  projects: [
    // FR: Desktop browsers (Tier 1)
    // EN: Desktop browsers (Tier 1)
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

    // FR: Mobile browsers (tests responsive)
    // EN: Mobile browsers (responsive testing)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // FR: Serveur de développement
  // EN: Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm dev:web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
