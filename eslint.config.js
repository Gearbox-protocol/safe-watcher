const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = [
  {
    files: ["**/*.ts"],
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
      "simple-import-sort": require("eslint-plugin-simple-import-sort"),
      "unused-imports": require("eslint-plugin-unused-imports"),
    },
    languageOptions: {
      parser: require("@typescript-eslint/parser"), // Use TypeScript parser
      parserOptions: {
        project: "./tsconfig.json", // Path to your tsconfig.json
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/explicit-member-accessibility": "off",
      "@typescript-eslint/member-ordering": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      complexity: "off",
      "max-params": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        },
      },
    },
  },
  eslintPluginPrettierRecommended,
];
