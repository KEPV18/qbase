import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now().toString()),
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Bundle optimization for production
  build: mode !== 'test' ? {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Template chunks - each form template gets its own chunk (lazy loaded)
          if (id.includes('/components/forms/templates/') && id.endsWith('Template.tsx')) {
            const match = id.match(/\/F(\d+)Template\.tsx$/);
            if (match) return `template-F${match[1]}`;
            if (id.includes('FormTemplateKit')) return 'template-kit';
          }
          // RecordViewPage + F28Template (used in RecordCreationPage)
          if (id.includes('RecordViewPage') || id.includes('F28Template')) {
            return 'record-view';
          }
          // Vendor chunks for better caching
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/clsx') || id.includes('node_modules/class-variance-authority') || id.includes('node_modules/tailwind-merge')) {
            return 'vendor-utils';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
  } : {},
}));
