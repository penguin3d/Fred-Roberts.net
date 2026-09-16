# The gauntlet — stage order, definition of done, and the handoff report

Diagram: [agent-gauntlet.svg](agent-gauntlet.svg) is upstream's picture and names the .NET tools; the stages and gates are identical, the runners here are cucumber-js, vitest, StrykerJS and Playwright. Verification policy:
[.claude/rules/verification-gates.md](../../.claude/rules/verification-gates.md).

Five stages. Each runs in its **own clean session**. There is no shared context between them —
the handoff report is the only thing that crosses the boundary, and you carry it by hand.

```
/spec → /code → /clean → /harden → /qa → you accept
```

## Definition of done

A stage may not hand off until every row is true. If a gate fails, **that same stage retries** —
never skip forward, never hand a known-failing gate to the next stage.

| Stage | Done when |
|---|---|
| **/spec** | `.feature` parses; every scenario runs and is **red** on a missing binding; every scenario named as a sentence a human can tick off; interrogation checklist cleared |
| **/code** | every acceptance scenario green; **≥90% line AND branch on every touched file** (target 95, goal 100); `npx ng build` clean; `npx eslint` clean on touched files; `.feature` byte-for-byte unchanged |
| **/clean** | CRAP within the recorded baseline; no **new** function above CC 10; coverage did not drop; duplication did not increase; every test still green and behaviour identical |
| **/harden** | mutation score **≥80% on touched files**; **zero survivors in new code**; production code byte-for-byte identical to what /clean produced |
| **/qa** | a **committed spec file** covers every `Scenario` in the `.feature`, one assertion per acceptance criterion; green via `npx playwright test` against a running system; screenshot per criterion, taken by the spec |

## The handoff report

Every stage ends by printing exactly this. Nothing after it.

The block below the divider is **a prompt**: you copy it, open a clean session, paste. That is
the whole context-transfer mechanism — no memory, no shared session, no summarisation drift.

```
════════ STAGE COMPLETE: <STAGE> ════════

<2–4 plain sentences: what changed and why. No narration of your process.>

Verification
  <command run>                    → <result, with numbers>
  <command run>                    → <result, with numbers>
Gate: PASS

Open items
  - <anything the next stage must know, or "none">

──────── COPY BELOW INTO A CLEAN SESSION ────────
/<next-command> <slug>

Previous stage: <STAGE> — complete.
Task: <slug> — <one line>
Branch: <branch>
Files touched:
  <path>
  <path>
Verification at handoff:
  <the numbers again, so the next stage can detect a regression>
Carried forward:
  <open items, or "nothing">
─────────────────────────────────────────────────
```

Rules for the report:

- **Numbers, not adjectives.** "coverage 94.1% line / 91.7% branch", not "good coverage".
- If the gate **failed**, say `Gate: FAIL` and print the failures verbatim. Do not print a
  copy-block — there is nothing to hand off. Say what you are retrying.
- Never claim a command's result you did not actually run.
- The `Files touched` list is what the next stage scopes its work to. Be exact.

## What crosses a boundary, and what does not

| | |
|---|---|
| Crosses | the handoff block, the git branch, the files on disk, the gauntlet ledger |
| Does not | your reasoning, rejected approaches, anything you "remember" |

If the next stage needs to know something, it goes in `Carried forward`. If it isn't written
down, it does not exist.

## The ledger

The copy-block is still how a stage hands off. The ledger is how you find work again after the
terminal is gone — it answers "what is in flight", which a clipboard cannot.

```bash
node tools/gauntlet.mjs status              # every slug, its stage, its last gate
node tools/gauntlet.mjs start <slug>        # /spec opens it
node tools/gauntlet.mjs sign-off <slug> <stage> --gate "..."
```

It lives **outside the repo** (`~/gauntlet-state/<repo>/`, or `$GAUNTLET_STATE`) on purpose:
state committed on a feature branch is invisible from every other branch, which defeats the one
question parallel work asks.

It records stage sign-offs and gate numbers — **never the specification**. Scenario counts and
green counts are derived from the `.feature` file and the newest `.trx` at read time. A copy of
a frozen contract drifts from it; that is why the frozen-artefact rule below exists, and it
applies to the ledger too.

## Frozen artefacts
<frozen_artefacts>

- The `.feature` file is frozen after **/spec**. Changing it means going back to /spec — it is
  not a stage-2 edit. It is also the **only** copy of the specification: stages 2–5 read it
  directly and never transcribe it into a second document, because a copy of a frozen contract
  drifts from it and then nobody knows which one is the spec.
- Production code is frozen after **/clean**. /harden strengthens tests only; if /harden
  believes production code is wrong, it stops and reports rather than editing.

</frozen_artefacts>