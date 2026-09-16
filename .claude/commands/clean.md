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

1. **Measure first.** Rank by CRAP before touching anything, with
   [tools/crap.mjs](../../tools/crap.mjs), using **source** cyclomatic complexity
   (ESLint's `complexity` rule), which is the measure CRAP's threshold of 30 was
   calibrated against.

   Produce coverage first, then measure:

   ```bash
   npm run test:coverage          # writes coverage/**/coverage-final.json
   npm run crap:check             # = node tools/crap.mjs frontend
   ```

   Complexity comes from ESLint's `complexity` rule with the threshold forced to 0, so every
   function reports rather than only those over the default of 10. Coverage comes from
   istanbul's `coverage-final.json`. Both are keyed on paths relative to the repo root, and if
   they ever stop agreeing the tool says "complexity and coverage did not overlap" rather than
   scoring nothing silently.

   Attack the top of the list, not the whole list. Anything with **CC > 30 cannot reach CRAP 30**
 — those must be split, testing them harder is arithmetic that doesn't work.
3. **Split, then cover.** Splitting a CC 40 method into four CC 10 methods drops CRAP more than
   any amount of new tests would.
4. Then names, duplication, boundaries.
5. Re-measure. Confirm the number moved.

## Gate

- **CRAP within the recorded baseline** — `node tools/crap.mjs frontend` exits 0.
- **No new function above CC 10.** Existing ones must not get worse.
- **Coverage did not drop** on any touched file, and is still ≥90% line and branch.
- Every unit test and every acceptance scenario still **green**.
- `npx eslint src` clean on the files you touched.
- `npx ng build` clean.

Duplication is **not** gated here. Upstream a jscpd Stop hook failed the turn on new clones;
this workspace took the pipeline without the hooks layer, so spotting duplication is your job
at this stage and nothing will catch it for you.

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
