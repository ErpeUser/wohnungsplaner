import { defineConfig, devices } from '@playwright/test';

const livePreview = process.env.VISUAL_USE_LIVE_PREVIEW === '1';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: './artifacts/visual/latest/test-results',
  reporter: [['list'], ['./scripts/visual-reporter.ts']],
  use: {
    baseURL: livePreview ? 'http://127.0.0.1:3001' : 'http://127.0.0.1:3100',
    actionTimeout: 60_000,
    navigationTimeout: 30_000,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } } }],
  webServer: livePreview ? undefined : {
    command: 'node scripts/visual-server.mjs',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 240_000,
    env: { PORT: '3100', HOST: '127.0.0.1', PLANNER_REVIEW_ENABLED: '1', PLANNER_WRITE_PID: '0' },
  },
});
