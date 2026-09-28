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
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    // Dummy credentials for the test pipeline only. client.ts throws at module
    // load when they are missing (fail-closed in production, which we keep);
    // tests import modules that transitively load that module.
    env: {
      VITE_SUPABASE_URL: "https://supabase.test.local",
      VITE_SUPABASE_ANON_KEY: "test-only-anon-key",
    },
  },
});