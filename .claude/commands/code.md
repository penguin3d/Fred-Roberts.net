---
description: "Gauntlet stage 2 — make the acceptance scenarios true, with unit tests to the coverage floor"
argument-hint: "<slug>  (plus the handoff block from /spec)"
---

# CODER — stage 2 of the gauntlet

Task: **$ARGUMENTS**

You are the Coder. You make the contract from stage 1 true. Speed here, polish next stage — the
Cleaner exists so you don't have to be precious.

Protocol and report format: [docs/plans/gauntlet-handoff.md](../../docs/plans/gauntlet-handoff.md).
Coverage policy: [.claude/rules/verification-gates.md](../../.claude/rules/verification-gates.md).

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
[gauntlet] /code <slug> · STARTED
session <this session name> · worktree <path> · branch <branch>
Doing: <one line>
Next: <one line>
```

Use `wit_work_item_comment_write` on the id in `gauntlet next <slug> --json`.

## Owns

- Implement the behaviour the `.feature` scenarios describe.
- Bind the Reqnroll step definitions in `backend/GymBug.Acceptance.Tests/Steps/`.
- Unit tests for the behaviour you write, to the coverage floor.
- Keep production code testable — IO and environment behind small adapter seams.

## Does not own

- **Never edit the `.feature` file.** It is frozen. A wrong scenario is a stage-1 defect: stop,
  report it, and say `/spec` needs re-running. Prove you didn't touch it:
  `git diff --stat -- '*.feature'` must be empty.
- No CRAP work, no DRY refactoring, no mutation testing, no architectural reshuffling. Those
  belong to /clean and /harden. Do not do their job badly on the way past.
- No broad cleanup of code you didn't touch.

## Implementation

- **Test-first is optional.** Write tests before or after the code — whichever is faster for
  you. The gate is the coverage number, not the order.
- Work one scenario at a time. Get it green, move on.
- Follow the nearest existing code for patterns. This repo has strong conventions: custom
  mediator (`cqrs-mediatr` skill), EF Core (`entity-framework-core` skill), `DateOnly` for
  calendar dates, `IOptions<TenancyOptions>` for the tenant id, `IOptions<BusinessCalendarOptions>`
  for week start. Never hardcode any of those.
- User-facing text goes through the message-key registry (`user-facing-messages` skill), not
  inline strings.

## Gate — all of these, before you may hand off

```bash
# 1. the contract
dotnet test backend/GymBug.Acceptance.Tests/GymBug.Acceptance.Tests.csproj --filter "Category=<slug>"

# 2. unit tests + coverage — ONLY the test classes that cover the files you touched
dotnet test backend/<Service>.Tests/<Service>.Tests.csproj \
  --filter "FullyQualifiedName~<TestClassA>|FullyQualifiedName~<TestClassB>" \
  --collect:"XPlat Code Coverage;Format=opencover" --results-directory ./tmp/cov

# 3. build clean — ONLY the projects your change actually affects
node tools/gauntlet.mjs affected --slug <slug>   # writes backend/affected-<slug>.slnf
dotnet build backend/affected-<slug>.slnf
```

**Never `dotnet build backend/GymBug.sln`.** That is 40 projects, every one running
SonarAnalyzer, on a 4-core box. `gauntlet affected` walks the ProjectReference graph and
builds only what your change can actually break — typically 3-13 projects. It names the test
projects too — but you run only the test **classes** that cover your files, with `--filter`,
never a whole project. The scope rule and its one allowed widening:
[verification-gates.md](../../.claude/rules/verification-gates.md), `<scoped_gate>`.

For the inner loop only, add `-p:RunAnalyzers=false`. **The gate run must not use it** — Sonar
`S####` findings are part of this gate.

- Every acceptance scenario **green**.
- **≥90% line AND branch on every file you touched.** Target 95. Aim for 100 — every uncovered
  branch you leave must be named in the report with a reason.
- `S####` Sonar warnings **in files you touched** are errors. Warnings elsewhere are not yours.
**Frontend work — the same floor, different commands:**

```bash
cd frontend
npx eslint <files you touched>           # the architecture boundaries are enforced here too
npm run test:coverage:gate:project -- <app> --include '<spec glob for the files you touched>'
npx ng build <app>                       # never a bare ng build
```

**Name the project AND the specs on every one of those.** Left bare they run the whole fleet —
six apps plus the library — on a 4-core box shared with other sessions, and you will run them
more than once. `@gymbug/core` is a valid name here, and so is any single app. `--include`
resolves from the app's `src/` (a sibling core entry point starts with `../`); it is the
spec files for the files you touched, never the whole app.

`test:coverage:gate` carries the 90% floor in
[frontend/vitest.gate.config.ts](../../frontend/vitest.gate.config.ts), so the runner enforces
it and prints the shortfall. It does **not** come from `--coverage-thresholds` flags; those are
not accepted by the builder and the gate silently errored out for months before this was
fixed. The floor is per file you touched, which no global threshold can express, so read the
report and quote the per-file numbers regardless. Legacy `gym-bug-workspace/` is frozen
(bugfixes only) and has no coverage gate — if you had to touch it, say so in the report and
quote the numbers by hand.
- The Stop hooks (jscpd duplication, fallow dead code) must pass. Do not re-baseline them.

If coverage is short, the uncovered lines are your remaining test list. Write those tests. Do
not rationalise the gap and do not report done without the numbers.

## Report

Record the gate before you write the report, so the numbers survive this session:

```bash
node tools/gauntlet.mjs sign-off <slug> code --gate "cov <line> line / <branch> branch, <n>/<n> scenarios" --carry "what the next stage must not rediscover, or omit"
node tools/gauntlet.mjs sync <slug> --json      # the plan: fields AND the comment text
#   -> wit_work_item_write        for the column + state
#   -> wit_work_item_comment_write for the [gauntlet] DONE comment
#   both, then:
node tools/gauntlet.mjs synced <slug> code   # only after the write succeeded
```

End with the handoff block from the protocol doc, `Gate: PASS`, and the copy-block addressed to:

```
/clean <slug>
```

In `Carried forward`, name anything the Cleaner should know: seams you left rough, a method you
know is too long, a duplication you introduced deliberately to keep the slice small.
