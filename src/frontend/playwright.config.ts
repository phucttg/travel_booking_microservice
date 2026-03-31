import { defineConfig, devices } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: baseUrl,
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: `${baseUrl}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
