import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './pwa-e2e',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4174', ...devices['Pixel 7'] },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174', reuseExistingServer: false },
})
