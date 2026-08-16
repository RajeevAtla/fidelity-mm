import { defineConfig, devices } from "@playwright/test";

const previewPort = process.env.PLAYWRIGHT_PORT ?? "4173";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  outputDir: "node_modules/.cache/playwright-results",
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${previewPort}/fidelity-mm/`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `bun run build && bun run preview --port ${previewPort}`,
    url: `http://127.0.0.1:${previewPort}/fidelity-mm/`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
