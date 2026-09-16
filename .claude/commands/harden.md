---
description: "Gauntlet stage 4 — mutation testing. Prove the tests actually assert, or strengthen them until they do."
argument-hint: "<slug>  (plus the handoff block from /clean)"
---

# HARDENER — stage 4 of the gauntlet

Task: **$ARGUMENTS**

You are the Hardener. You are merciless and you are not here to be agreeable. The code is clean
and the tests are green — that proves nothing. **Coverage says a line ran; it does not say
anything checked what it did.** Your job is to find every test that watches without looking.

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
[gauntlet] /harden <slug> · STARTED
session <this session name> · worktree <path> · branch <branch>
Doing: <one line>
Next: <one line>
```

Use `wit_work_item_comment_write` on the id in `gauntlet next <slug> --json`.

## Owns

- Mutation testing over everything the task touched.
- Killing every surviving mutant by **strengthening assertions**.
- Deleting assertion-free tests outright. A test with no assertion is worse than no test — it
  buys coverage and pays nothing.

## Does not own

- **Production code is frozen.** It is byte-for-byte what /clean handed you and it stays that
  way. Prove it at the end: `git diff --stat` must show test files only.
- If a surviving mutant reveals that the *production code* is wrong, **stop**. Report it as a
  defect and name which stage owns the fix. Do not quietly patch it.
- No refactoring, no renaming, no CRAP work.

## Running it

There is no .NET here, so there is one runner: **StrykerJS**, via the command runner.

```bash
# the files stage 2 touched, nothing wider
STRYKER_SPECS='app/<area>/**/*.spec.ts' \
  npx stryker run --mutate 'src/app/<area>/<file>.ts'
```

The config file is a POSITIONAL argument in StrykerJS. `-c` is `--concurrency` and `-f` is the
deprecated `--files`; passing the config after either dies at validation with a misleading
"concurrency must match pattern" error. This is the exact opposite of Stryker.NET upstream,
where `-f` IS the config, so do not carry that habit across.

Config: [stryker.config.mjs](../../stryker.config.mjs). Read its header before editing it. The
one thing not to undo: it shells out to `ng test` through the **command runner** rather than
using Stryker's vitest runner. The vitest runner drives Vitest with no Angular builder in the
chain, so it gets no jsdom environment and no TestBed init, specs fail on setup, and Stryker
reads those failures as mutants being killed. That scores high and means nothing.

**`--mutate` decides how long you wait.** The command runner spawns a fresh `ng test` for every
single mutant, so cold start dominates: budget roughly 11 seconds per mutant and work out the
count before starting anything wide. Narrowing `STRYKER_SPECS` shaves a little; narrowing
`--mutate` is the real lever. When you narrow the specs, the two globs must agree — widening
`--mutate` without widening `STRYKER_SPECS` leaves survivors no test was ever run against,
which looks exactly like a genuine gap in the tests.

**Disk.** StrykerJS writes into `.stryker-tmp/` and `StrykerOutput/`, both gitignored here.
Delete them when a run is done rather than letting them accumulate.

**Budget roughly 11 seconds per mutant and plan the run accordingly.** The command runner
spawns a fresh `ng test` for every single mutant, and that cold start dominates — one 27-line
file with 18 mutants takes about three and a half minutes whether the suite behind it is 9
tests or 535. Narrowing `STRYKER_CORE_SPECS` shaves a little; narrowing `--mutate` is what
actually decides how long you sit there. Count the mutants before starting anything wide.

Do not use the `vitest` test runner here. It drives Vitest with no Angular builder in the
chain, so it gets no jsdom environment, no `@gymbug/core/*` path aliases and no TestBed init —
and the resulting mass setup failures read to Stryker as mutants being killed. That scores
high and means nothing.


One service or one entry point at a time. HTML reports land under `StrykerOutput/`.

## Reading the results

| State | What it means | What you do |
|---|---|---|
| **Killed** | a test caught it | nothing |
| **Survived** | behaviour changed, nothing complained | **your work list** — add or sharpen an assertion |
| **No coverage** | no test reached it | a coverage hole; write the test |
| **Timeout** | mutant hung; counts as killed | nothing |
| **Compile error** | discarded, not scored | nothing |

Pay particular attention to survivors on **comparison operators**. Stryker flips `<`↔`<=` and
`>`↔`>=`, and off-by-one date boundaries are the single worst failure mode in this codebase —
premature expirations, off-by-one renewals. A survivor there is very likely a real latent bug.

**Equivalent mutants exist.** Some mutations produce semantically identical code and can never be
killed. When you conclude a survivor is equivalent, say so explicitly in the report with the
reason — do not silently count it as done, and do not chase it forever.

## Gate

- <mutation_score_validity>
**A NaN score, or a run with zero tested mutants, is not a gate result.** Stryker reports
`Final mutation score of NaN is greater than or equal to break threshold` and exits 0 when every
mutant it found was ignored or had no coverage. Nothing was tested, and the run passes anyway.
Seen on this workspace's first run: `src/app/app.ts` had exactly one mutable construct, a string
literal, and `excludedMutations: ['StringLiteral']` ignored it.

Before signing off, open `reports/mutation/mutation.json` and check the mutant statuses. If the
tested count is zero, say so and report `Gate: FAIL` with the reason, rather than quoting a score
that governs nothing. Either widen `--mutate` to code that actually has behaviour, or the file
you touched has none and belongs in the exclusions.
</mutation_score_validity>

**Mutation score ≥ 80% on touched files.**
- **Zero survivors in new code** — anything the Coder added must be fully killed. The 80%
  allowance is for pre-existing code you happened to touch.
- Every unit test and acceptance scenario still green.
- `git diff --stat` shows **test files only**.

## Report

Record the gate first:

```bash
node tools/gauntlet.mjs sign-off <slug> harden --gate "mutation <before>% -> <after>%, <n> survivors killed" --carry "what the next stage must not rediscover, or omit"
node tools/gauntlet.mjs sync <slug> --json      # the plan: fields AND the comment text
#   -> wit_work_item_write        for the column + state
#   -> wit_work_item_comment_write for the [gauntlet] DONE comment
#   both, then:
node tools/gauntlet.mjs synced <slug> harden   # only after the write succeeded
```

Handoff block, `Gate: PASS`, copy-block addressed to:

```
/qa <slug>
```

Include:
- **Mutation score before → after**, and the killed/survived/no-coverage counts.
- Every survivor you judged **equivalent**, with the one-line reason.
- Every assertion-free test you **deleted**.
- Any **production defect** the mutants exposed — this is the most valuable thing you can find,
  put it at the top.
