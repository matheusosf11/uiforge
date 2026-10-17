import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3100";
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
    env: { UIFORGE_E2E_MOCK: "1", RATE_LIMIT_MAX: "1000", SUGGEST_RATE_LIMIT_MAX: "1000" },
  },
});
