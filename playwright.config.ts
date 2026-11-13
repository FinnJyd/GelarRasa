import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:5511',
    headless: true,
    launchOptions: process.env['PRANA_BROWSER_PATH'] ? { executablePath: process.env['PRANA_BROWSER_PATH'] } : {},
  },
  webServer: {
    command: process.env['PRANA_TEST_MODE'] === 'production'
      ? 'bun run preview -- --port 5511 --strictPort'
      : 'bun run dev -- --port 5511 --strictPort',
    url: 'http://127.0.0.1:5511/dashboard',
    stderr: 'ignore',
    reuseExistingServer: false,
  },
});
