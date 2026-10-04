import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  resolve: {
    alias: mode === "e2e"
      ? [{ find: "@auth0/auth0-react", replacement: resolve(process.cwd(), "src/e2e/auth0Mock.tsx") }]
      : [],
  },

  server: {
    host: "0.0.0.0",
    port: 3000,
    watch: {
      usePolling: true,
    },
  },

  build: {
    outDir: "build",
  },
}));
