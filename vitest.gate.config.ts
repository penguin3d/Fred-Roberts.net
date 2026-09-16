// @ts-nocheck
import { mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config';

/**
 * The coverage gate: `vitest.config.ts` plus the 90% floor, and nothing else.
 *
 * The thresholds live here rather than in `vitest.config.ts` because the Ionic
 * apps name that file as their `runnerConfig`, so putting a floor in it would
 * fail an ordinary `ng test` run the moment any file dipped under 90 — turning
 * the everyday feedback loop into a gate nobody asked for.
 *
 * They are NOT command-line flags. `--coverage-thresholds.lines` looks
 * plausible and is what the gate script used to pass, but the
 * `@angular/build:unit-test` builder rejects it outright: "Unknown arguments".
 * The gate therefore never ran at all. Thresholds are a Vitest config concern,
 * so they are expressed here and reached via `ng test --runner-config`.
 *
 * Per the verification-gates rule the floor is measured per file created or
 * modified, which no global threshold can express. This is the blunt backstop;
 * the per-file number still has to be read off the report and quoted.
 */
export default mergeConfig(baseConfig, {
  test: {
    coverage: {
      thresholds: {
        lines: 90,
        branches: 90,
      },
    },
  },
});
