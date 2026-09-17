import { defineConfig, devices } from '@playwright/test';

/**
 * Stage 5's runner. One spec per Scenario in the frozen contract, driven through the UI.
 *
 * `webServer` starts `ng serve` and waits for it, so a cold `npm run e2e` works without
 * anyone remembering to start the app first. reuseExistingServer means it attaches to a
 * server you already have running rather than failing on the port.
 *
 * The viewport projects exist because the responsive rule treats phone width as a separate
 * assertion, not an afterthought. A scenario about layout has to be checked at both.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'reports/playwright' }]],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Signed-out scenarios, at both viewports the responsive rule asks about.
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /(owner\.spec|auth\.setup)\.ts/,
    },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'] },
      testIgnore: /(owner\.spec|auth\.setup)\.ts/,
    },
    // Run headed, by hand, once: Google will not be automated and should not be.
    { name: 'setup', use: { ...devices['Desktop Chrome'] }, testMatch: /auth\.setup\.ts/ },
    // The owner's scenarios, from the session that setup captured.
    {
      name: 'owner',
      use: { ...devices['Desktop Chrome'], storageState: '.auth/owner.json' },
      testMatch: /owner\.spec\.ts/,
    },
  ],
  // No webServer when a target is named: `ng serve` cannot host this slug at all. The
  // boundary is express middleware in src/server.ts, which ng serve never loads, so a local
  // run of the boundary specs would pass while exercising nothing. Point E2E_BASE_URL at a
  // deployed build instead.
  ...(process.env['E2E_BASE_URL']
    ? {}
    : {
        webServer: {
          command: 'npm start',
          url: 'http://localhost:4200',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
