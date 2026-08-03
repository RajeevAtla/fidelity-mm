import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  outputDir: "node_modules/.cache/playwright-results",
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173/fidelity-mm/",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run build && bun run preview --port 4173",
    url: "http://127.0.0.1:4173/fidelity-mm/",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
