---
paths:
  - "*/**"
---

# Minimalism write the least code that actually works

## The decision ladder — stop at the FIRST rung that holds

Before writing any code for a task, walk down and stop as soon as one rung satisfies it:

1. **Does this need to exist at all?** Speculative / "we might need it later" → skip it (YAGNI).
2. **Stdlib / framework does it?** Use the built-in (`Array`/`Map`, LINQ, Angular Signals, EF Core, .NET BCL) before hand-rolling.
3. **Native platform feature covers it?** CSS over JS, DB constraints/computed columns over app code, native inputs over custom logic.
4. **Already-built `gb-*` component / installed dependency solves it? Reuse it — don't re-question it.** A `gb-*` design-system component (or existing handler/service in `gym-bug-core`, `shared/`) IS the minimal path: prefer it over a one-off, every time. Reaching for what already exists is never what this rule trims — only adding NEW speculative code or NEW packages is.
5. **Can it be one line?** One line.
6. **Only then:** the minimum code that works — fewest files, shortest working diff.

## Core rules

- **No unrequested abstractions.** No single-implementation interface, no factory for one
  product, no config for a value that never changes, no generic before the second caller
  exists. (This is YAGNI applied to structure — see the SOLID carve-out below.)
- **Delete over add.** Prefer removing code to writing it. Boring beats clever — clever code
  gets decoded at 3am.
- **Fewest files possible.** Shortest working diff wins. Don't scatter a 5-line change across
  four new files.
- **Mark deliberate simplifications** with a `ponytail:` comment naming the ceiling and the
  upgrade path, e.g. `// ponytail: single global lock; shard per-account if throughput bites`.
- **Self-check, don't over-test.** Non-trivial logic gets one small test (Karma/xUnit per
  [test infra](../../docs/testing/test-infrastructure.md)); trivial code needs none.

## NEVER simplify away (be lazy about code, never about these)

Input validation · error handling that prevents data loss · security/auth/tenant scoping ·
accessibility (a11y) · timezone/`DateOnly` correctness · explicitly requested features.
These are calibration knobs on a physical system — always wire them fully.

## Reconciling with SOLID / DRY (this repo's carve-outs)

Ponytail's "no abstractions" is about *speculative* ones. An abstraction is NOT speculative —
and SOLID wins — when it has a real, present reason here:

- **Test seam:** the codebase mocks `IMediator`, `ResolvePlanQuery`, repositories. An interface
  that exists so a handler is unit-testable is necessary, not speculative — keep it.
  is the established Clean Architecture seam — not a single-implementation accident.
- **Clean Architecture layer boundary:** CQRS commands/queries/handlers and domain-event
  handlers are the house pattern. Follow it; don't "flatten" it in the name of fewer files.
- **DIP holds:** inject dependencies, never `new` a service inside a class.
- **DRY single-sources stay:** reuse `parseLocalDate`/`toLocalDateString`, message keys,
  `TenancyOptions`, `gb-*` components — rung 4 *is* DRY.

Rule of thumb: **ladder first to decide WHETHER to build; SOLID to decide HOW once you must.**
If the abstraction earns its keep via a test/DI/layer boundary that exists today, write it.
If it's "for the future," skip it.

## Output pattern

Code first, then at most **three short lines** on what was skipped and when to add it. No essays.

## Off switch

Active by default. Suspend for a task only when the user says "stop ponytail" / "normal mode".
