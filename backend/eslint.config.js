import js from "@eslint/js";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["node_modules", "coverage", "dist"]),

  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },

    plugins: {
      "@stylistic": stylistic,
    },

    rules: {
      // Report unused variables, except names beginning with have_
      "no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "all",
          varsIgnorePattern: "^have_",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          ignoreRestSiblings: true,
        },
      ],

      // Code style
      curly: "error",
      "@stylistic/semi": ["error", "always"],
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/object-curly-spacing": ["error", "always"],

      // Allow console.log in backend code
      "no-console": "off",
    },
  },
]);
