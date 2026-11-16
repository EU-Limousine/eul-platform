import { defineConfig, devices } from '@playwright/test';
import { URLS } from './support/env';

/**
 * EU Limousine UI tests (website + dashboard + the booking → dispatch flow).
 * Needs everything running locally first:  docker compose up -d  and  npx turbo run dev
 * Run from the repo root:                   npx playwright test -c e2e
 * Uses the LOCAL database only (creates test bookings, vehicles and drivers). Never point it at production.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  globalSetup: './support/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One at a time: the API allows 10 logins per minute, and tests share one local database.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    locale: 'en-GB',
    timezoneId: 'Europe/Copenhagen',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  metadata: { website: URLS.website, dashboard: URLS.dashboard, api: URLS.api },
});
