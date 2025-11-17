import { defineConfig } from '@playwright/test';

/**
 * Configuration Playwright pour tests E2E API
 *
 * Tests HTTP API (pas de browser) via `request` fixture
 * Base URL configurable via env var API_BASE_URL
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:8787',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'api-e2e',
      testMatch: /.*\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:8787',
      },
    },
  ],

  // Webserver local pour tests (optionnel)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:8787',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
