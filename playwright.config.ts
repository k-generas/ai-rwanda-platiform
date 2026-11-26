import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const preinstalledShell = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(fs.existsSync(preinstalledShell)
      ? { launchOptions: { executablePath: preinstalledShell } }
      : {})
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
    }
  ]
});
