import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_FILE = path.resolve(__dirname, 'storage', 'auth.json');

export default defineConfig({
  testDir: './tests/generated',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',

  use: {
    /* 認証済み storageState があれば全テストに適用 (無ければ未認証で実行) */
    ...(fs.existsSync(AUTH_FILE) ? { storageState: AUTH_FILE } : {}),
    baseURL: process.env.QA_BASE_URL ?? 'https://hotel-example-site.takeyaqa.dev',
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
