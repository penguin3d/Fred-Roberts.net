// Flat config: `npm run lint` (eslint src).
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    ignores: ['dist/**', 'coverage/**', '.angular/**', 'node_modules/**'],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
  },
  {
    files: ['**/*.html'],
    ignores: ['dist/**', 'coverage/**'],
    extends: [...angular.configs.templateRecommended],
  },
);
