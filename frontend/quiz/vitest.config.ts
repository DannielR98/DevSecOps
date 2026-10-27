import { configDefaults, defineConfig } from "vitest/config";
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
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: [...configDefaults.exclude, ".features-gen/**"],
  },
}));