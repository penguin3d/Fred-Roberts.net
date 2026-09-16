# Verification gates — coverage, CRAP, mutation. TDD is optional.

Applies to all product code in `backend/`, `frontend/`, and `gym-bug-workspace/`.
Test mechanics live in [docs/testing/test-infrastructure.md](../../docs/testing/test-infrastructure.md).
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

1. **Build** the affected project set — `node tools/gauntlet.mjs affected --slug <slug>`
   then `dotnet build backend/affected-<slug>.slnf`. Never `backend/GymBug.sln`.
2. **Test** only the tests that cover the files you touched: the unit-test classes for those
   files, plus this slug's acceptance scenarios. Nothing else runs.
3. **Measure** coverage from that run — the floor is per touched file, so a scoped run measures
   exactly what the gate asks about.

| Never | Instead |
|---|---|
| `dotnet build backend/GymBug.sln` | `dotnet build backend/affected-<slug>.slnf` |
| `dotnet test` across the solution, or a whole test project | `dotnet test backend/<Svc>.Tests/<Svc>.Tests.csproj --filter "FullyQualifiedName~<TestClassA>\|FullyQualifiedName~<TestClassB>"` — the classes that test the files you touched |
| the whole acceptance suite | `dotnet test backend/GymBug.Acceptance.Tests/GymBug.Acceptance.Tests.csproj --filter "Category=<slug>"` |
| `npm run test` / `npm run test:coverage` / `npm run lint` | `npx ng test <app> --include '<spec glob for the files you touched>'` · `npx eslint <files you touched>` |
| `npx ng build` with no project | `npx ng build <app>` |
| mutation with no `--mutate` | `--mutate` on the files you touched |

Widening is a decision, never a default. Allowed only when a scoped run cannot prove the gate —
a filter that cannot express the covering set, or a coverage number short because the touched
file is exercised by tests outside your filter. Widen **one step** (the whole test project,
never the solution), say so in the report, and say why. A whole-solution build is for a release
or for a full-suite check Bojan asked for by name; it never belongs inside a gauntlet stage.
</scoped_gate>

## Coverage — the floor is 90, the goal is 100

Measured **per file created or modified**, line AND branch. Not a project average.

| | |
|---|---|
| **Floor — 90%** | below this the task is not done, no exceptions |
| **Target — 95%** | where a normal task should land |
| **Goal — 100%** | always aim here; every uncovered branch should be a deliberate, stated decision |

Measure it, never estimate it, and quote the numbers in the completion report:

| Stack | Command |
|---|---|
| Backend | `dotnet test <proj> --collect:"XPlat Code Coverage;Format=opencover"` |
| `frontend/` | `cd frontend && npx ng test <project> --coverage` |
| Legacy | `cd gym-bug-workspace && ng test gratitude-strength --watch=false --browsers=ChromeHeadless --code-coverage` |

Backend uses **OpenCover**, not Cobertura — Cobertura carries no cyclomatic complexity, which
the CRAP gate needs.

**The only exclusions:** EF migrations and generated files, composition roots (`Program.cs`,
`AppHost.cs`, `app.config.ts`, route/provider wiring), barrel files, pure constant/token files,
`.html`/`.scss`, and the specs themselves. Nothing else. "Untestable" is a design smell —
extract behind a seam and test it.

## CRAP — the ratchet

`CRAP(m) = CC² × (1 − cov)³ + CC`. Canonical bad is **30**; above CC 30 a method cannot reach
30 at any coverage, so it must be split.

This codebase starts far above that (12 methods over CC 30), so the gate is a **ratchet against
a recorded baseline**, same as `dup:baseline` and `fe:deadcode:baseline`:

```bash
node tools/crap.mjs backend --sln backend/affected-<slug>.slnf   # fails on regression (--coverage DIR if not /tmp/covall)
node tools/crap.mjs frontend              # same tool, same threshold, frontend
node tools/crap.mjs backend --baseline    # re-record after real gains
```

One tool for both stacks, and it measures **source** cyclomatic complexity (SonarAnalyzer S1541
backend, ESLint `complexity` frontend) — the measure CRAP's threshold of 30 was calibrated
against. OpenCover's own complexity numbers are IL-based and read far higher; do not use them.

Never re-record to get green. Lower it as methods are split and covered.

## Mutation — coverage's lie detector

Coverage proves a line ran; it does not prove anything asserted on it. Mutation testing changes
the code on purpose and checks whether a test notices.

**Run it from inside the test project, and pass the config explicitly. Both halves matter:**

```bash
# Backend — cd first, -f second. Neither is optional.
cd backend/<Svc>.Tests
dotnet dotnet-stryker -f ../stryker-config.json --project <Svc>.csproj --mutate "**/<Folder>/**"
```

```bash
# Frontend
cd frontend
npx stryker run                               # @gymbug/core entry points
npx stryker run stryker.admin.config.json     # admin app  (config is POSITIONAL; -c means --concurrency)
npx stryker run stryker.member.config.mjs     # member app
```

<stryker_invocation>
The two ways this silently goes wrong, both found the hard way on #1345 (see #1377):

1. **Run it from `backend/` and it goes solution-wide** — all 19 projects, the full suite per
   project. Two hours, zero mutants tested. `cd` into the test project first.
2. **Run it from anywhere that is not next to the config and `backend/stryker-config.json`
   is silently ignored** — `ignore-methods` never applies, logger mutants count against you,
   and Stryker reports a number that looks fine and governs nothing. Always pass `-f`.

A mutation score obtained without `-f` is not a gate result. Do not sign off on one.
</stryker_invocation>

**Mutation score ≥ 80% on touched files, zero survivors in new code.** Config lives in
[backend/stryker-config.json](../../backend/stryker-config.json) (backend) and
[frontend/stryker.config.mjs](../../frontend/stryker.config.mjs) (frontend). Surviving
mutants are not advisory — the survivor list IS the remaining test list.

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
