# fredroberts.net

Fred's personal site. Angular 21, one application, source in `src/`. Created 2026-09-15.

Work runs through the **gauntlet**: a five-stage pipeline installed from
`~/Claude-Projects/gauntlet`, itself a snapshot of Bojan's pipeline in `gsc-web-3.0`.
[docs/agent-operating-model.md](docs/agent-operating-model.md) is the reference;
[docs/plans/gauntlet-handoff.md](docs/plans/gauntlet-handoff.md) is the protocol every
stage follows.

## The pipeline

Backlog → Spec → Code → Clean → Harden → QA → Done. Each stage runs in its **own clean
session**, owns exactly one artefact, and clears a gate before handing on. **The ADO board
column is the command**: a card sitting in Spec means run `/spec`, a card in Harden means
run `/harden`. That is the whole scheduling protocol.

    node tools/gauntlet.mjs status      # what is in flight, planned, blocked
    node tools/gauntlet.mjs next        # the single next action, and why

The ledger lives at `~/gauntlet-state/fredroberts.net/`, deliberately outside the repo:
state committed on a branch is invisible from every other branch.

## Gates

| Stage | Gate |
|---|---|
| `/spec` | `npm run test:acceptance -- --tags @<slug> --format json:test-results/<slug>.json` — every scenario **undefined**, nothing green |
| `/code` | every scenario green · ≥90% line and branch on touched files · `npx eslint` clean · `npx ng build` clean |
| `/clean` | `node tools/crap.mjs frontend` within baseline · no new function over CC 10 · coverage did not drop |
| `/harden` | `npx stryker run --mutate '<touched files>'` ≥80%, zero survivors in new code |
| `/qa` | `npm run e2e` green, one spec per Scenario, screenshot per criterion |

Two artefacts are **frozen**: the `.feature` after `/spec` (`git diff --stat -- '*.feature'`
must be empty at stage 2), and production code after `/clean` (`/harden` touches tests only).

## What is different from upstream

- **cucumber-js, not Reqnroll.** Stage 1 runs in plain Node with no browser, because `/spec`
  is banned from describing a UI and its gate is about bindings, not a rendered page.
  Playwright is stage 5's tool only.
- **No build scoping.** `gauntlet affected` and the `.sln`/`ProjectReference` graph behind it
  were removed: one application, `ng build` takes about a second.
- **No Stop hooks.** Duplication and dead code are `/clean`'s job; nothing fails the turn
  automatically. Do not read that as permission.
- **No Sonar.** ESLint plays that role.

## ADO

Project **Fred Personal Work**, area path `Fred Personal Work\Development`. Two boards over
the same items: the product board on `Fred Personal Work Team`, the pipeline board on
`Development`. The Kanban column field GUIDs are in `tools/gauntlet.mjs` and are specific to
this project — GymBugHub's are different.

`gauntlet sync <slug>` emits a plan; it never writes. Apply it with `wit_work_item_write`,
then record it with `gauntlet synced <slug> <stage>`.

## Conventions

- Contracts in `features/<slug>.feature`, tagged `@<slug>`. Bindings in `features/steps/`.
- E2E specs in `e2e/`. Playwright starts `ng serve` itself.
- Build artefacts are never committed. `test-results/`, `reports/`, `StrykerOutput/` and
  `.stryker-tmp/` are gitignored.
- npm needs `--legacy-peer-deps` on this machine: npm 11.5.2 crashes in peer resolution
  (`Cannot read properties of null (reading 'edgesOut')`) on this dependency graph.
