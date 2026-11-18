import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
// Direct Playwright CLI runs also store browser downloads in the generated tree.
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve(process.cwd(), '../Wohnungsplaner_Generated/downloads/playwright');

const livePreview = process.env.VISUAL_USE_LIVE_PREVIEW === '1';
const cloudChannel = process.env.VISUAL_BROWSER_CHANNEL === 'chrome' || process.env.VISUAL_BROWSER_CHANNEL === 'msedge'
  ? process.env.VISUAL_BROWSER_CHANNEL : undefined;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: '../Wohnungsplaner_Generated/reports/artifacts/visual/latest/test-results',
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
  projects: [{
    name: cloudChannel ?? 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      channel: cloudChannel,
      viewport: { width: 1440, height: 1000 },
      launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    },
  }],
  webServer: livePreview ? undefined : {
    command: 'node scripts/visual-server.mjs',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 240_000,
    env: { PORT: '3100', HOST: '127.0.0.1', PLANNER_REVIEW_ENABLED: '1', PLANNER_WRITE_PID: '0' },
  },
});
