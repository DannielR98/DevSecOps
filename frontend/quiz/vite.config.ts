import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  resolve: {
    alias: mode === "e2e"
      ? [
        {
          find: /.*\/context\/AuthContext(\.tsx)?$/,
          replacement: fileURLToPath(new URL("./src/e2e/authMock.tsx", import.meta.url)),
        },
      ]
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
