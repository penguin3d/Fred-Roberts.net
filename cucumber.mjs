// Stage 1's runner. Reqnroll executes Gherkin on .NET; this is the JS equivalent.
//
// WHY CUCUMBER-JS AND NOT PLAYWRIGHT-BDD.
// playwright-bdd also runs .feature files, but it runs them through a browser. The
// gauntlet deliberately splits stage 1 from stage 5: /spec is banned from describing
// a user interface, and its gate is "every scenario RED on a missing binding" — a
// statement about bindings, not about a rendered page. Running stage 1 through a
// browser couples the contract to a UI that does not exist yet at stage 1, and makes
// the fastest gate in the pipeline the slowest. Playwright stays stage 5's tool.
//
// THE GATE DEPENDS ON `strict`.
// An unimplemented step reports as `undefined`, and with strict the run exits
// non-zero. That is exactly /spec's pass condition: the contract parses, every
// scenario runs, nothing is green. Turning strict off would make stage 1 pass by
// doing nothing.
//
// PER-SLUG RESULTS.
// tools/gauntlet.mjs reads test-results/<slug>.json, so a stage run names its own
// output and there is no "newest file" ambiguity:
//
//   npm run test:acceptance -- --tags @<slug> --format json:test-results/<slug>.json
//
// Tag every feature with @<slug>, the same way the .NET original used
// --filter "Category=<slug>".

export default {
  paths: ['features/**/*.feature'],
  import: ['features/steps/**/*.ts'],
  // TypeScript is loaded via NODE_OPTIONS='--import tsx' in the npm script, NOT via
  // cucumber's `loader:` option: that routes through Node's --loader flag, which is
  // deprecated since Node 20.6 and tsx now refuses it outright.
  format: ['progress'],
  formatOptions: { snippetInterface: 'async-await' },
  strict: true,
};
