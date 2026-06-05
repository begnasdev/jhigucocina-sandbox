// =============================================================================
// PURPOSE: Lint config for the Functions package (flat config, ESLint 9).
// EXPLANATION: enforces TypeScript best practices on src/; keeps the scaffold
//   clean before any business logic lands (Document D §11).
// DEPLOYMENT: run via `npm run lint`; firebase.json predeploy gate runs it.
// =============================================================================
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  { ignores: ["lib/**", "node_modules/**"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
];
