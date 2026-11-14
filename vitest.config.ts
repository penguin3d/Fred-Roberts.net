// @ts-nocheck
import { defineConfig } from 'vitest/config';

/**
 * The test config, and deliberately almost empty.
 *
 * The @angular/build:unit-test builder supplies its own coverage setup, and it is the
 * thing that knows how to map v8 coverage back through the Angular build to your source
 * files. Overriding `coverage.include` here breaks that mapping silently: the run still
 * passes, the report still prints, and every file reads 0% — measured 0/3 statements on a
 * file that is actually 6/6. A gate fed by that number blocks everything, for no reason.
 *
 * So: do not add coverage globs here. Exclusions belong in the builder's config if they
 * are ever needed.
 */
export default defineConfig({});
