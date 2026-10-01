import { defineConfig } from "@playwright/test";
import "dotenv/config";
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "kitchen-operations.spec.ts",
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3005",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
