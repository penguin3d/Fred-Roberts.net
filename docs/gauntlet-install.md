# Gauntlet install record

**Date:** 2026-09-15
**Bundle:** `~/Claude-Projects/gauntlet` @ `804c03c` (itself a snapshot of `gsc-web-3.0` @ `9c6911a4c`)
**Target:** `~/Claude-Projects/personal/fredroberts.net`

## Interview answers

| Question | Answer |
|---|---|
| Target project | `personal/fredroberts.net`, empty at install time; the Angular workspace was scaffolded as part of this |
| Existing `.claude/` | None |
| Backend | None. Single Angular application, no API |
| Frontend | Angular 21.0, scss, no SSR, standalone components |
| Top-level source directories | `src/` only. No `backend/`, no `frontend/`, no second workspace |
| Acceptance runner | cucumber-js 13.2, contracts in `features/`, results as JSON in `test-results/<slug>.json` |
| Coverage | vitest 4.1 via `@angular/build:unit-test`, istanbul shape, floor 90% line and branch |
| Mutation | StrykerJS 10.0 via the command runner, threshold 80%, zero survivors in new code |
| UI driver | Playwright 1.63, specs in `e2e/`, config starts `ng serve` itself |
| ADO project | **Fred Personal Work** (the requested "Fred Roberts Personal" does not exist) |
| ADO teams | `Fred Personal Work Team` (product board), `Development` (pipeline board) — both already carried the GymBugHub layouts |
| Area path | `Fred Personal Work\Development` |
| Voice | `ghostwriter-voice` retargeted from Bojan to Fred |

## Layers installed

`00-pipeline`, `10-practice`, and the Angular-applicable part of `30-angular`.

**Skipped:** `20-dotnet`, `40-ionic`, `50-tenant`, `60-gymbug-only` (never installs), and
`70-hooks` — the hooks shell out to Serena, jscpd and a dead-code scanner, none of which are
set up here. Their absence is called out in `code.md`, `clean.md` and `code-quality-gates.md`
so nobody reads the missing red light as permission.

**Skills removed after install, because their whole workflow targets a tree that does not
exist here.** Upstream they read and write a `docs/features/{slug}/` YAML topology with a
Global Tracker and per-epic `execution-tracker.yaml`. The operating model already flagged that
tree as dead. In this pipeline those artefacts are the ADO card (`work-item-intake`), the
`.feature` contract (`/spec`) and the ledger, so the skills were traps rather than help:

| Removed | Was for |
|---|---|
| `story-refinement` | Refining YAML stories held in the Global/Epic trackers |
| `user-stories` | Creating epics/features/stories as YAML under `docs/features/{slug}/` |
| `business-analyst` | Requirements docs into the same topology |
| `architect-technical-design` | YAML stories into BPMN blueprints under `docs/features/{slug}/diagrams/` |
| `tech-lead-specs` | YAML stories into technical specs under `docs/features/{slug}/stories/` |
| `story-prioritization` | Ranking, emitting a snippet for `execution-tracker.yaml` |

`qa-automation` was kept and its tracker references stripped: its Playwright content is real and
`/qa` links it. Seven skills remain: `frontend-design`, `manual-test-checklist`, `playwright-cli`,
`pragmatic-engineer`, `qa-automation`, `skill-creator`, `work-item-intake`.

**Individually skipped from the layers that were installed:**

| File | Why |
|---|---|
| `next-story.md` | Reads `docs/requirements/.../execution-tracker.yaml`, which is dead upstream too |
| `gb-components-first.md` | GymBug's design system |
| `gb-icons.md` | Points at GymBug's `icon.registry.ts` |
| `frontend-library-rebuild.md` | Names two GymBug libraries |

## Stage 1 was built, not inherited

The bundle shipped with no working stage 1 for a frontend target: the `.feature` contract is
executed by Reqnroll, which is .NET only, and `gauntlet affected` exited 2 on frontend paths.
Bojan's own operating model lists this under Open. Three things were built here:

1. **cucumber-js as the runner**, chosen over playwright-bdd because `/spec` is banned from
   describing a UI and its gate is a statement about bindings, not a rendered page. Config in
   `cucumber.mjs`, TypeScript via `NODE_OPTIONS='--import tsx'` (cucumber's `loader:` option
   routes through Node's deprecated `--loader`, which tsx now refuses).
2. **`features/<slug>.feature`**, kebab-case and tagged `@<slug>`, replacing the PascalCase
   Reqnroll convention.
3. **`greenFromCucumber` in `tools/gauntlet.mjs`**, replacing `greenFromTrx`. Reads
   `test-results/<slug>.json` and counts a scenario green only when every step passed.

Verified: 2 scenarios undefined → exit 1, ledger reads `green 0 of 2`; one binding written →
`green 1 of 2`.

## Retargeting done

- `tools/gauntlet.mjs` 764 → 628 lines. `FEATURES` → `features/`, `.trx` reader replaced, ADO
  wiring pointed at Fred Personal Work (its Kanban column GUIDs differ from GymBugHub's), and
  the whole `.sln`/`ProjectReference` build-scoping half removed rather than left half wired.
- `tools/crap.mjs` 456 → 294 lines. .NET adapter removed; frontend adapter pointed at `src/`
  and the root `node_modules`; **both** path normalisations fixed, without which complexity
  and coverage keys never join and the tool reports "nothing scored".
- All five stage commands, `verification-gates.md`, `code-quality-gates.md`,
  `gauntlet-state.md`, the handoff protocol and the operating model retargeted.
- Rule `paths:` globs `frontend/**` and `gym-bug-workspace/**` → `src/**`.
- `stryker.config.mjs` and `vitest.gate.config.ts` retargeted; `vitest.config.ts` and
  `eslint.config.js` created, since the gate configs depend on both and neither existed.
- `docs/reference-links.md` and `docs/legacy-retirement-register.md` created empty with the
  format only, per the bundle's rule that they are per-project content and never copied.

## Corrected upstream errors

- The operating model described the product board with a **Code Review** column. The live
  board has **Ready For Testing**. Bojan's doc had drifted from his own board.
- `@vitest/coverage-v8` resolved to 5.x against vitest 4.x under `--legacy-peer-deps`. Pinned
  to `^4`.
- A `vitest.config.ts` written during this install set `coverage.include: ['src/**/*.ts']`,
  which silently broke coverage attribution: the run still passed and the report still printed,
  but every file read 0%. Measured 0/3 statements on a file that is actually 6/6, which would
  have made the `/code` gate block everything. The builder supplies the mapping from v8 coverage
  back to source; overriding the globs breaks it. `vitest.config.ts` is now deliberately empty
  and says so.

## Unresolved

- Nothing has run through the pipeline end to end. The first real slug is the test of this install.
- `npm` on this machine needs `--legacy-peer-deps`: npm 11.5.2 crashes in peer resolution with
  `Cannot read properties of null (reading 'edgesOut')`. Not investigated further.
