import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

// Dedicated Vitest configuration — separates test config from production build config.
// Vite reads vite.config.ts (production); Vitest reads this file for tests.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Unit tests live under `src/`, but the include list used to name
    // `src/` ONLY — so a test written under `tests/` (the natural home
    // for a new suite) was silently never run, and the suite it belongs
    // to reported green without it.
    //
    // `tests/e2e/` is excluded on purpose: those files are Playwright
    // specs, run by `npm run test:e2e`, and Vitest cannot execute them.
    include: [
      "src/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "tests/**/*.{test,spec}.{js,ts,jsx,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/dist-local/**",
      "**/dist-preview/**",
      "tests/e2e/**",
    ],
    // Dummy credentials for the test pipeline only. client.ts throws at module
    // load when they are missing (fail-closed in production, which we keep);
    // tests import modules that transitively load that module.
    env: {
      VITE_SUPABASE_URL: "https://supabase.test.local",
      VITE_SUPABASE_ANON_KEY: "test-only-anon-key",
    },
  },
});