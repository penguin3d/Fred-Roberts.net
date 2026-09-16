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
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
