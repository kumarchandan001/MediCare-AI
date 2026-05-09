import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Use @/ for src/ imports everywhere
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to FastAPI
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // Proxy WebSocket connections
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
  build: {
    // ── Performance Budgets ──────────────────────
    chunkSizeWarningLimit: 500, // KB — warn if any chunk exceeds this
    sourcemap: false, // Disable sourcemaps in production for security
    target: "es2020",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Strip console.log in production
        drop_debugger: true,
      },
    },
    // ── Code Splitting ──────────────────────────
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": [
            "react",
            "react-dom",
            "react-router-dom",
          ],
          "query-vendor": [
            "@tanstack/react-query",
          ],
          "chart-vendor": ["recharts"],
          "motion-vendor": [
            "framer-motion",
          ],
        },
      },
    },
  },
});
