import { defineConfig } from "@playwright/test";

// One smoke test that opens every page and clicks a graph filter (e2e/smoke.spec.ts). It runs against the built
// site, so it checks what readers get. In CI Playwright downloads its own Chromium. Locally it uses a Chromium-based
// browser you already have if PW_BROWSER points at it, so nothing extra has to be downloaded.
const local = process.env.PW_BROWSER;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 1280, height: 800 },
    launchOptions: local ? { executablePath: local } : {},
  },
  webServer: { command: "npm run build && npx vite preview --port 4173 --strictPort", url: "http://localhost:4173", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
