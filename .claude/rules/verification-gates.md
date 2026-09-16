# Verification gates — coverage, CRAP, mutation. TDD is optional.

Applies to all product code in `src/`.
This rule is the **policy**: what must be true before work is called done.

**Replaces the old `tdd.md`.** Test-first is no longer mandated — write tests before or after
the code, whichever gets you there. What is mandated is the numbers below. An untested change
is not done regardless of the order you wrote things in.

**This rule supersedes the "self-check, don't over-test" line in
[ponytail-minimalism.md](ponytail-minimalism.md).** Be minimal about production code; never
about tests. "Trivial code needs none" does not survive the coverage floor.

## Scope every run to the files you touched — that scope IS the gate
<scoped_gate>

This is a 4-core box shared by several sessions at once. A whole-solution build is 40 projects
each running SonarAnalyzer, and a whole-workspace `ng test` is every app in the fleet. A stage
that runs either one twenty times over an afternoon spends six hours waiting and verifies
nothing it could not have verified in ten minutes. **Nobody waits on a run they did not have to
start, and nobody starts a run another session is paying for.**

The gate of every stage is exactly this, and nothing wider:

1. **Build** with `npx ng build`. One application, about a second; there is nothing to scope.
2. **Test** only the tests that cover the files you touched: their specs, plus this slug's
   acceptance scenarios. Nothing else runs.
3. **Measure** coverage from that run — the floor is per touched file, so a scoped run measures
   exactly what the gate asks about.

| Never | Instead |
|---|---|
| `npm test` / a bare `ng test` | `npx ng test --include '<spec glob for the files you touched>'` |
| the whole acceptance suite | `npm run test:acceptance -- --tags @<slug> --format json:test-results/<slug>.json` |
| `npm run lint` across everything | `npx eslint <files you touched>` |
| mutation with no `--mutate` | `--mutate` on the files you touched |

Widening is a decision, never a default. Allowed only when a scoped run cannot prove the gate —
a filter that cannot express the covering set, or a coverage number short because the touched
file is exercised by tests outside your filter. Widen **one step** (the whole test project,
never the solution), say so in the report, and say why. A whole-solution build is for a release
or for a full-suite check Fred asked for by name; it never belongs inside a gauntlet stage.
</scoped_gate>

## Coverage — the floor is 90, the goal is 100

Measured **per file created or modified**, line AND branch. Not a project average.

| | |
|---|---|
| **Floor — 90%** | below this the task is not done, no exceptions |
| **Target — 95%** | where a normal task should land |
| **Goal — 100%** | always aim here; every uncovered branch should be a deliberate, stated decision |

Measure it, never estimate it, and quote the numbers in the completion report:

| everyday | `npx ng test --coverage` |
| the gate | `npm run test:coverage:gate` — the same run with the 90% floor enforced |

Coverage is istanbul-shaped (`coverage/**/coverage-final.json`), which is what the CRAP gate
joins against.

**The only exclusions:** `main.ts`, composition roots (`app.config.ts`, route/provider wiring),
barrel files, pure constant/token files, `.html`/`.scss`, and the specs themselves. Nothing else. "Untestable" is a design smell —
extract behind a seam and test it.

## CRAP — the ratchet

`CRAP(m) = CC² × (1 − cov)³ + CC`. Canonical bad is **30**; above CC 30 a method cannot reach
30 at any coverage, so it must be split.

This workspace started clean, so the baseline is low and the gate is a **ratchet**: it fails when
the worst CRAP in scope gets worse than the recorded number.

```bash
npm run test:coverage                     # coverage must exist first
node tools/crap.mjs frontend              # fails on regression
node tools/crap.mjs frontend --baseline   # re-record after real gains
```

It measures **source** cyclomatic complexity, from ESLint's `complexity` rule with the threshold
forced to 0 so every function reports. That is the measure CRAP's threshold of 30 was calibrated
against.

Never re-record to get green. Lower it as methods are split and covered.

## Mutation — coverage's lie detector

Coverage proves a line ran; it does not prove anything asserted on it. Mutation testing changes
the code on purpose and checks whether a test notices.

**Always scope `--mutate`. The command runner spawns a fresh `ng test` per mutant:**

```bash
STRYKER_SPECS='app/<area>/**/*.spec.ts' \
  npx stryker run --mutate 'src/app/<area>/<file>.ts'
```

<stryker_invocation>
Three ways this silently goes wrong:

1. **No `--mutate`** and it mutates all of `src/`. Budget roughly 11 seconds per mutant and
   work the count out before starting: cold start dominates, so a 27-line file with 18 mutants
   takes about 3.5 minutes whether the suite is 9 tests or 535.
2. **`--mutate` widened without widening `STRYKER_SPECS`** leaves survivors that no test was
   ever run against. That looks exactly like a genuine gap in the tests, and is not one.
3. **Using Stryker's `vitest` runner instead of the command runner.** It drives Vitest with no
   Angular builder in the chain, so there is no jsdom environment and no TestBed init. Specs
   fail on setup and Stryker reads those failures as mutants being killed. The score comes out
   high and means nothing. `testRunner: 'command'` in the config is load-bearing.

The config file is a POSITIONAL argument in StrykerJS: `-c` is `--concurrency` and `-f` is the
deprecated `--files`. Passing the config after either dies with a misleading "concurrency must
match pattern" error. This is the opposite of Stryker.NET, where `-f` IS the config.

4. **A NaN score passes.** When every mutant found was ignored or uncovered, Stryker reports
   `Final mutation score of NaN is greater than or equal to break threshold` and exits 0. Nothing
   was tested. Check the mutant statuses in `reports/mutation/mutation.json` before quoting any
   score; a run with zero tested mutants is a FAIL, not an 80%.
</stryker_invocation>

**Mutation score ≥ 80% on touched files, zero survivors in new code.** Config lives in
[stryker.config.mjs](../../stryker.config.mjs). Surviving mutants are not advisory — the
survivor list IS the remaining test list.

`--since:main` narrows to changed files, but on this repo it is unreliable when the branch has
merge commits — prefer `--mutate` with an explicit glob for the files you touched.

Note for this codebase specifically: Stryker's standard operators flip `<`↔`<=` and `>`↔`>=`.
That is precisely the off-by-one date-boundary bug CLAUDE.md names as our worst failure mode.

## Non-negotiables
<verification_non_negotiables>

- **Bugs reproduce first.** A failing test that demonstrates the bug, then the fix. No repro
  test means the bug is not understood yet.
- **Never delete, weaken, `skip`, or comment out a failing test to get green.** If the test is
  wrong, fix it and say so explicitly in the report.
- **Never report done with red tests.** Quote the failures verbatim instead.
- Deterministic tests only: no real clock, no real HTTP, no sleeps, no order dependence.
- Test behaviour through the public surface, never internals.
</verification_non_negotiables>

## Where this fits

These are the gates the [agent gauntlet](../../docs/plans/gauntlet-handoff.md) enforces between
stages. Coverage is the Coder's gate, CRAP is the Cleaner's, mutation is the Hardener's.
