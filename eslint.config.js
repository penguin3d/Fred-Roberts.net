// Flat config. Two consumers, and both matter:
//   /code's lint gate        npx eslint <the files you touched>
//   /clean's CRAP gate       tools/crap.mjs runs eslint with --rule complexity:0
//                            so that EVERY function reports its cyclomatic
//                            complexity, not just the ones over the default 10.
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
