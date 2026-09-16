// Mutation testing for the `@gymbug/core` entry points.
//
// Two things here are deliberate and easy to undo by accident.
//
// THE COMMAND RUNNER, NOT THE VITEST RUNNER.
// The vitest runner drives Vitest directly, with no Angular builder in the
// chain, so it inherits none of what the builder supplies: the jsdom
// environment, the tsconfig path aliases behind `@gymbug/core/*`, or the
// generated TestBed init. The result is not an error. Specs load, most fail on
// setup, and Stryker reads those failures as mutants being killed. A score
// obtained that way is fiction. `ng test` is the only thing that assembles the
// environment correctly, so the command runner shells out to it.
//
// ALWAYS SCOPE --mutate. BUDGET ~11 SECONDS PER MUTANT.
// The command runner spawns a fresh `ng test` for EVERY mutant, and that cold
// start dominates: a 27-line file with 18 mutants takes about 3.5 minutes
// whether the suite it runs is 9 tests or 535. Narrowing the specs shaves a
// little; narrowing `--mutate` is what actually decides how long you wait.
//
//   STRYKER_CORE_SPECS='../util/src/**/*.spec.ts' \
//     npx stryker run --mutate 'projects/gymbug/core/util/src/lib/name-utils.ts'
//
// So mutate the files you touched, never a whole entry point on a whim. Work
// out the mutant count before starting anything wide, and expect roughly
// mutants x 11s.
//
// When you do narrow the specs, the two globs must agree. Widening `--mutate`
// without widening STRYKER_CORE_SPECS leaves survivors that no test was ever
// run against, which looks exactly like a genuine gap in the tests.
//
// STRYKER_CORE_SPECS is an `ng test --include` glob, and those resolve from
// `projects/gymbug/core/src`, NOT the workspace root. So a sibling entry point
// starts with ../ and must end in *.spec.ts, e.g. ../util/src/**/*.spec.ts — A glob that matches
// nothing fails the dry run rather than silently testing zero specs.

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const specs = process.env.STRYKER_CORE_SPECS ?? '**/*.spec.ts';

export default {
  testRunner: 'command',
  commandRunner: {
    command: `npx ng test @gymbug/core --include "${specs}"`,
  },
  // The command runner needs the mutated source where ng test will read it.
  inPlace: true,
  reporters: ['progress', 'html', 'json'],
  thresholds: { high: 80, low: 60, break: 0 },
  mutate: [
    'projects/gymbug/core/*/src/**/*.ts',
    '!**/*.spec.ts',
    '!**/public-api.ts',
    '!**/index.ts',
    '!**/*.config.ts',
    '!**/environments/**',
    '!**/*.routes.ts',
  ],
  mutator: { excludedMutations: ['StringLiteral'] },
  concurrency: 1,
  timeoutMS: 60000,
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
};
