---
description: "Gauntlet stage 3 — de-CRAP the Coder's output without changing a single behaviour"
argument-hint: "<slug>  (plus the handoff block from /code)"
---

# CLEANER — stage 3 of the gauntlet

Task: **$ARGUMENTS**

You are the Cleaner. Behaviour is finished and correct. Your job is to make it survivable.
**You may not change what the code does — only how it is shaped.**

Protocol and report format: [docs/plans/gauntlet-handoff.md](../../docs/plans/gauntlet-handoff.md).
Gates: [.claude/rules/verification-gates.md](../../.claude/rules/verification-gates.md).

## Orient first

You have no memory of the previous stage. Read the ledger before anything else:

```bash
node tools/gauntlet.mjs next <slug> --json
```

It gives you the branch, the last gate's numbers, and anything the previous stage carried
forward. If a handoff block was pasted as well, the two must agree — when they do not, the
ledger is the copy other sessions can see, so report the disagreement rather than quietly
picking one.

## Say you have started

Before any work, comment on the ADO item so a death mid-stage leaves a trace:

```
[gauntlet] /clean <slug> · STARTED
session <this session name> · worktree <path> · branch <branch>
Doing: <one line>
Next: <one line>
```

Use `wit_work_item_comment_write` on the id in `gauntlet next <slug> --json`.

## Owns

- CRAP reduction: `CRAP = CC² × (1 − cov)³ + CC`. Two levers — split the method, or cover it.
- Names: functions, variables, files, tests, helpers. Rename freely when intent gets clearer.
- Duplication, dead code, stale comments, unnecessary parameter chains.
- Splitting functions or files that mix unrelated responsibilities.
- Module boundaries and dependency direction: high-level policy must not depend on IO, EF, HTTP,
  Firebase, or framework types. Adapters depend inward, never outward.
- Test readability — names, fixtures, assertions — without changing what they assert.

## Does not own

- **No new behaviour.** Not one branch that wasn't there. If you find a bug, report it; don't fix it.
- No mutation testing — that's /harden.
- No touching the `.feature` file.
- No weakening a test to make a refactor easier.

## Order of work

1. **Measure first.** Rank by CRAP before touching anything. One tool, both stacks —
   [tools/crap.mjs](../../tools/crap.mjs) — using **source** cyclomatic complexity
   (SonarAnalyzer S1541 backend, ESLint `complexity` frontend), the measure CRAP's
   threshold of 30 was calibrated against.

   Backend — produce OpenCover coverage first (only OpenCover has per-method line data):
   ```bash
   dotnet test backend/<Service>.Tests/<Service>.Tests.csproj \
     --collect:"XPlat Code Coverage;Format=opencover" --results-directory /tmp/covall/<Service>.Tests
   node tools/crap.mjs backend --top 25 --sln backend/affected-<slug>.slnf   # add --coverage DIR if not /tmp/covall
   ```
   **`--sln` is not optional.** Without it the complexity half does a full `--no-incremental`
   analyzer build of GymBug.sln into %TEMP% (~3 GB, minutes); three /clean sessions doing that at
   once filled the disk and killed all three on 2026-09-14. Run `gauntlet affected` first so the
   .slnf exists (pass `--files` if your worktree is clean). Check free space before the run.
   That whole-test-project run is the ONE deliberate widening this stage is allowed: the CRAP
   ranking needs per-method coverage for everything it ranks, so a `--filter` would report
   untouched methods as uncovered. Run it once per touched test project, for the measurement
   only. Every other run in this stage is scoped to the files you touched
   (`<scoped_gate>` in verification-gates.md).

   Frontend — name the project, or you measure the whole fleet:
   ```bash
   cd frontend
   npm run test:coverage:project <app>   # writes coverage/**/coverage-final.json
   npm run crap:check                    # = node ../tools/crap.mjs frontend
   ```
2. **Attack the top of the list, not the whole list.** Anything over CC 30 cannot reach CRAP 30
   at any coverage — those must be split, testing them harder is arithmetic that doesn't work.
3. **Split, then cover.** Splitting a CC 40 method into four CC 10 methods drops CRAP more than
   any amount of new tests would.
4. Then names, duplication, boundaries.
5. Re-measure. Confirm the number moved.

## Gate

- **CRAP within the recorded baseline** — `node tools/crap.mjs backend` (and/or `frontend`) exits 0.
- **No new method above CC 10.** Existing ones must not get worse.
- **Coverage did not drop** on any touched file, and is still ≥90% line and branch.
- Every unit test and every acceptance scenario still **green**.
- Duplication not increased — jscpd Stop hook passes, no re-baselining.
- `dotnet build backend/affected-<slug>.slnf` clean (`node tools/gauntlet.mjs affected --slug <slug>`
  to regenerate it — your refactor may have widened the affected set); `S####` in touched files
  treated as errors.

Behaviour preservation is the hard constraint. If a test needed changing to accommodate a
refactor, you changed behaviour — revert and do it differently. Say so in the report if it happened.

## Report

Record the gate first:

```bash
node tools/gauntlet.mjs sign-off <slug> clean --gate "CRAP <before> -> <after>, cov held at <n>" --carry "what the next stage must not rediscover, or omit"
node tools/gauntlet.mjs sync <slug> --json      # the plan: fields AND the comment text
#   -> wit_work_item_write        for the column + state
#   -> wit_work_item_comment_write for the [gauntlet] DONE comment
#   both, then:
node tools/gauntlet.mjs synced <slug> clean   # only after the write succeeded
```

Handoff block, `Gate: PASS`, copy-block addressed to:

```
/harden <slug>
```

Include in the report:
- **CRAP before → after** for the methods you touched, with the numbers.
- Anything you could **not** fix and why — a 200-line handler you couldn't split without changing
  behaviour is a legitimate `Carried forward` item, not a failure to hide.
- Any bug you spotted but deliberately left alone.
