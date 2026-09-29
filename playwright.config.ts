import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config (P7).
 *
 * Two tiers of tests:
 * - `e2e/smoke.spec.ts`          — read-only, DB-free, runs anywhere.
 * - `e2e/critical-path.spec.ts`  — signup → quiz → result. SKIPPED unless
 *   E2E_FULL=1 because it WRITES to the database (run it against a DEV
 *   database, never against production Supabase!).
 *
 * Usage:
 *   bun run test:e2e                       # smoke only (auto-starts next dev)
 *   E2E_FULL=1 bun run test:e2e            # full critical path (dev DB!)
 *   E2E_BASE_URL=https://... bun run test:e2e   # against a running deploy
 *
 * Browsers must be installed once: `bunx playwright install chromium`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  // Start the dev server automatically unless we target an external URL.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
