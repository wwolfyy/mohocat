import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import dotenv from 'dotenv';

// Load the committed fake e2e env (NEXT_PUBLIC_* + MOUNTAIN_ID) if the caller
// didn't already inject it. `override: false` means the values set by the
// `dotenv -e .env.test -- firebase emulators:exec` wrapper (incl. the emulator
// host vars) always win. Running `npx playwright test` directly still needs the
// emulators up (see tests/e2e/README.md) — this only backfills the static vars.
dotenv.config({ path: path.resolve(__dirname, '.env.test'), override: false });

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const AUTH_DIR = path.resolve(__dirname, 'tests/e2e/.auth');

export default defineConfig({
  testDir: './tests/e2e',
  // storageState fixtures + seed data live here; never treat them as specs.
  testMatch: /.*\.(setup|spec)\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Signs admin + member in through the real login UI against the Auth emulator
    // and saves storageState per role (also the concrete proof of prerequisite
    // spike S4). Role-scoped suites (member/admin) depend on this.
    { name: 'setup', testMatch: /global\.setup\.ts/ },

    // Anonymous surfaces — the exit-criterion trivial spec lives here. No auth
    // dependency, so a setup hiccup can't mask a green public suite.
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
      testMatch: /public\/.*\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /public\/.*\.spec\.ts/,
    },

    // Signed-in suites (Phase 3+ of the main plan). Wired now; specs land later.
    {
      name: 'member',
      use: { ...devices['Desktop Chrome'], storageState: path.join(AUTH_DIR, 'member.json') },
      dependencies: ['setup'],
      testMatch: /member\/.*\.spec\.ts/,
    },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], storageState: path.join(AUTH_DIR, 'admin.json') },
      dependencies: ['setup'],
      testMatch: /admin\/.*\.spec\.ts/,
    },
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
    },
  ],

  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Inherit the parent env (emulator hosts + NEXT_PUBLIC_* from the wrapper) so
    // `next start`'s server runtime (Admin SDK reads) hits the emulators.
    env: { ...process.env } as Record<string, string>,
  },
});
