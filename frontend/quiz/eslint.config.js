import stylistic from "@stylistic/eslint-plugin";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      // Unused variables and imports
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          vars: "all",
          args: "all",
        },
      ],
      "no-unused-vars": "off",

      // Require curly braces around control statements
      curly: "error",

      // Formatting
      "@stylistic/semi": ["error", "always"],
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/object-curly-spacing": ["error", "always"],

      // Allow console.log and other console methods
      "no-console": "off",
    },
  },
]);
