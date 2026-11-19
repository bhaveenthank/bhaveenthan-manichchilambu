import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Relative paths and hash routes mean the site works under any GitHub Pages repo name, with no setting to keep in sync.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // e2e/ is Playwright's, run with `npx playwright test`.
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
