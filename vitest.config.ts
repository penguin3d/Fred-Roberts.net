// @ts-nocheck
import { defineConfig } from 'vitest/config';

/**
 * The everyday test config, and deliberately almost empty.
 *
 * The @angular/build:unit-test builder supplies its own coverage setup, and it is the
 * thing that knows how to map v8 coverage back through the Angular build to your source
 * files. Overriding `coverage.include` here breaks that mapping silently: the run still
 * passes, the report still prints, and every file reads 0% — measured 0/3 statements on a
 * file that is actually 6/6. A gate fed by that number blocks everything, for no reason.
 *
 * So: do not add coverage globs here. Exclusions belong in the builder's config if they
 * are ever needed.
 *
 * It carries NO thresholds either. A floor here would fail an ordinary `ng test` the
 * moment a file dipped under it, turning the feedback loop into a gate nobody asked for.
 * The 90% floor lives in vitest.gate.config.ts, reached with
 * `ng test --runner-config vitest.gate.config.ts --coverage`.
 */
export default defineConfig({});
