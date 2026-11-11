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
    command: 'python3 scripts/dev.py --port 5511 --strict-port',
    url: 'http://127.0.0.1:5511/dashboard',
    stderr: 'ignore',
    reuseExistingServer: false,
  },
});
