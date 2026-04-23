import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const AUTH_FILE = path.resolve(__dirname, 'storage', 'auth.json');

export default defineConfig({
  testDir: './tests/generated',
  globalSetup: './playwright.global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',

  use: {
    /* 認証済み storageState を全テストに適用 */
    storageState: AUTH_FILE,
    baseURL: 'https://development.pocket-heroes.net',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
