// prettier.config.js, .prettierrc.js, prettier.config.cjs, or .prettierrc.cjs

/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: "all",
  tabWidth: 2,
  semi: true,
  singleQuote: false,
  $schema: "http://json.schemastore.org/prettierrc",
  arrowParens: "avoid",
  bracketSpacing: true,
  endOfLine: "lf",
  printWidth: 80,
  useTabs: false,
};

module.exports = config;
