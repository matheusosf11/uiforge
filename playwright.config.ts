import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets the suite run when 3100 is taken by another local app.
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run e2e:server",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240000,
    // Test-only flags: never put these in .env files or Vercel (D-02).
    env: { PORT: String(port), UIFORGE_E2E_MOCK: "1", RATE_LIMIT_MAX: "1000", SUGGEST_RATE_LIMIT_MAX: "1000" },
  },
});
