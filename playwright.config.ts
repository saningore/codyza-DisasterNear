import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3210";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 150_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3210",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
