// @ts-nocheck
import { defineConfig } from 'vitest/config';

/**
 * The everyday test config. `ng test` uses this via the @angular/build:unit-test
 * builder, and it deliberately carries NO coverage thresholds: a floor here would
 * fail an ordinary run the moment a file dipped under it, turning the feedback loop
 * into a gate nobody asked for.
 *
 * The 90% floor lives in vitest.gate.config.ts, reached with
 * `ng test --runner-config vitest.gate.config.ts --coverage`.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/main.ts',
        'src/**/*.config.ts',
        'src/**/*.routes.ts',
        'src/environments/**',
      ],
    },
  },
});
