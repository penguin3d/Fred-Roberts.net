---
description: "Gauntlet stage 5 — drive the real UI against the .feature frozen back at stage 1"
argument-hint: "<slug>  (plus the handoff block from /harden)"
---

# QA — stage 5 of the gauntlet

Task: **$ARGUMENTS**

You are QA, and you are the last honest check. Everything upstream tested the system through its
own seams. You test it the way a member does — **through the user interface, never through the
API.** If the only way you can verify something is by calling an endpoint, that is a finding,
not a shortcut.

Protocol and report format: [docs/plans/gauntlet-handoff.md](../../docs/plans/gauntlet-handoff.md).
Playwright patterns: [.claude/skills/qa-automation/SKILL.md](../skills/qa-automation/SKILL.md).

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
[gauntlet] /qa <slug> · STARTED
session <this session name> · worktree <path> · branch <branch>
Doing: <one line>
Next: <one line>
```

Use `wit_work_item_comment_write` on the id in `gauntlet next <slug> --json`.

## Owns

- Turning `features/<slug>.feature` — frozen by /spec
  before any code existed — into an executable Playwright script. **One scenario, one test.**
- Working out **where in the UI** each scenario surfaces. The Gherkin deliberately carries no
  navigation: /spec never saw the UI, so it could only have guessed. That translation is yours,
  and you are the first stage allowed to make it.
- Driving the running system through its UI.
- One assertion per acceptance criterion, and a screenshot as evidence for each.
- Keeping the script in step with the feature file: the scenario is the specification, your
  script is one implementation of it.

## Does not own

- No mutation testing, no CRAP work, no refactoring.
- **Do not edit the `.feature` file to make a test pass.** It has been frozen since stage 1.
- If a scenario turns out to be **unreachable through the UI**, stop and report it rather than
  reaching for the API to prove it. Either the UI is missing something or the scenario was
  specified for a surface that does not exist — both go back to /spec, and neither is yours to
  decide alone.

## Done means is the exit checklist

The `.feature` narrative opens with Job / Why / Guardrails / Done means / Out of scope (stage 1
writes them). Before signing off, walk the **Done means** lines one by one and say in the report
which are met, which are met only at the API, and which are not met. A scenario listed under
**Out of scope** is never a defect here. A **Guardrail** you saw broken on the real UI is a
block even when every scenario passes.

## Running the system

```bash
npm start           # ng serve on http://localhost:4200
```

One application, one port. There is no API to bring up and no Aspire here: upstream this
stage booted a distributed .NET stack across seven ports, and none of that applies.

Playwright is configured to start the dev server itself (`webServer` in
[playwright.config.ts](../../playwright.config.ts)), so `npm run e2e` works from a cold start
without you running `npm start` first. Run it by hand when you want to look at the app yourself.

**Check the code you are testing is actually the code being served.** `ng serve` watches this
working tree, so a slug on a branch you have not checked out is invisible to the running app.
Compare `git branch --show-current` against what `node tools/gauntlet.mjs next <slug> --json`
records as the branch before you conclude a scenario is unreachable.

### Where the spec lives

Specs live in `e2e/`, config in [playwright.config.ts](../../playwright.config.ts), run with
`npm run e2e`. The config starts `ng serve` for you and defines the viewport projects the
responsive rule below expects.

The browsers are a separate download from the npm package. If `npm run e2e` fails with a
missing-executable error, run `npx playwright install` once. That is a prerequisite, not part
of your deliverable.

## Method

1. Read the `.feature` file. Each `Scenario` becomes one Playwright test, named after the
   scenario so the two map 1:1 in the report. Read that and nothing else first — not the
   production code, not the step definitions. If a scenario is not clear enough to drive the UI
   from, that is stage-1 feedback and it goes in your report.
2. Write the whole spec **blind, before running anything** — if you explore first you will
   unconsciously write the script around what you already saw working. Reach for semantic
   locators drawn from the feature's own language (`getByRole`, `getByLabel`, `getByText`)
   rather than CSS or test ids. On an accessible UI most of them hit first time, and the ones
   that miss are telling you something about the UI worth reporting.
3. Run it. Expect some locators to miss — that is the normal loop, not a failure of the approach.
4. **Only for the misses**, and one page at a time, snapshot with MCP to resolve the real
   locator. Fix the spec, re-run. Never let this step grow into driving the flow by hand.
5. Green against local. Then systest if the change is deployed there.
6. Screenshot each criterion **from the spec** (`page.screenshot({ path: … })`), so the evidence
   regenerates on every run instead of being a one-off artefact of your session.
7. **Reproduce any failure before touching code.** A flaky selector is not a bug in the feature.

Finding nothing is a result worth reporting, but treat it with suspicion: if the QA pass surfaces
literally nothing, the odds are stage 1 under-specified the feature rather than that the code is
perfect. Say which you believe and why.

## Bugs you find

You may fix bugs the QA suite exposes, but keep the fix **minimal and consistent with the
accepted specification**. Anything larger than a small correction goes back to the stage that owns
it — name that stage in the report. A fix here still owes unit-test coverage to the floor in
[verification-gates.md](../rules/verification-gates.md).

## Gate

- A **committed spec file** covers **every** `Scenario` in the `.feature` — count both, and say
  both numbers in the report. A passing MCP session is not a pass; there must be a file another
  person can run.
- **Green against a running local system**, via `npx playwright test` — quote the command and its
  output. "I clicked through it" is not a result.
- One assertion per acceptance criterion; screenshot evidence per criterion, taken by the spec.
- Every upstream suite still green — acceptance and unit.
- If MCP was used, the report says **where and why** — which locator or failure needed it. Silent
  MCP use is the thing this gate exists to stop; a stated reason is fine.

## Report

Close the ledger:

```bash
node tools/gauntlet.mjs sign-off <slug> qa --gate "<n>/<n> scenarios covered by spec, green on local"
node tools/gauntlet.mjs sync <slug> --json      # the plan: fields AND the comment text
#   -> wit_work_item_write        for the column + state
#   -> wit_work_item_comment_write for the [gauntlet] DONE comment
#   both, then:
node tools/gauntlet.mjs synced <slug> qa   # only after the write succeeded
node tools/gauntlet.mjs done <slug>                 # archives it out of `status`
```

This is the end of the line, so the copy-block is addressed to **you, the human**, not to another
stage. Handoff block, `Gate: PASS`, then:

```
──────── COPY BELOW INTO A CLEAN SESSION ────────
Feature <slug> is verified end to end and ready for your acceptance.

What it does: <one line>
Evidence: <path to screenshots>
Verified on: local  <and systest, if run>
Known gaps: <or "none">

Next: accept it, or run /release to cut it.
─────────────────────────────────────────────────
```

Include in the report: every bug found and whether you fixed it or handed it back, the scenario
count you covered against the count in the `.feature`, and any scenario that turned out to be
untestable through the UI — that is feedback stage 1 needs.
