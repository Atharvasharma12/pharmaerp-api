import js from "@eslint/js";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "*.min.js",
    ],
  },

  js.configs.recommended,

  {
    files: ["**/*.js", "**/*.cjs"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },

    rules: {
      // Existing codebase contains legacy lint issues.
      // Keep these as warnings while the codebase is migrated.
      "no-unused-vars": "warn",
      "no-useless-escape": "warn",
      "no-extra-boolean-cast": "warn",
      "no-empty": "warn",
      "no-undef": "warn",
    },
  },
];