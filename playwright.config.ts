import { defineConfig } from "@playwright/test";
import "dotenv/config";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: process.env.APP_URL ?? "http://127.0.0.1:3004",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3004/",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "playwright-only-secret-not-for-production-2026",
    },
  },
});
