import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: mode === "e2e"
      ? [
          { find: resolve(process.cwd(), "src/context/AuthContext"), replacement: resolve(process.cwd(), "src/e2e/authMock.tsx") },
        ]
      : [],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: [...configDefaults.exclude, ".features-gen/**"],
  },
}));