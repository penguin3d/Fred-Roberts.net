---
paths:
  - "src/**/*.{ts,html,scss}"
---

# Angular best practices — official angular.dev set, pinned to Angular 21

Source: `https://angular.dev/assets/context/best-practices.md`, adapted for **Angular 21.2**
(both workspaces). On upgrade to v22 revisit: OnPush becomes the default (stop setting it),
Signal Forms become stable.

## TypeScript

- Strict type checking; prefer inference when the type is obvious.
- Never `any` — use `unknown` when the type is uncertain.

## Components

- Standalone always. **Never write `standalone: true`** — it is the default since v20.
- `changeDetection: ChangeDetectionStrategy.OnPush` on every component (explicit until v22).
- `input()` / `output()` functions — never the `@Input()` / `@Output()` decorators.
- `inject()` — never constructor injection.
- Host bindings via the `host: {}` object in the decorator — never `@HostBinding` / `@HostListener`.
- Small, single-responsibility components. **`frontend/`: prefer inline templates for small
  components** (2025 style guide). The established separate
  `.ts`/`.html`/`.scss` files — don't churn it.
- External template/style paths are relative to the component TS file.
- `NgOptimizedImage` for all static images (does not work for inline base64).

## Templates

- Native control flow: `@if`, `@for` (always with `track`), `@switch` — never `*ngIf`/`*ngFor`/`*ngSwitch`.
- `[class.x]` / `[style.x]` bindings — never `ngClass` / `ngStyle`.
- Keep logic out of templates; use the async pipe for observables.

## Reactivity — pick the right primitive

| Scenario | Primitive |
|---|---|
| Derived value ("disable button if…") | `computed()` — pure, no side effects, no API calls |
| State that resets from an upstream signal but stays user-editable | `linkedSignal()` |
| Async work triggered by signals | `resource()`, or a SignalStore `rxMethod` — in `frontend/` server state MUST live in a store (`ngrx-signals-state.md`) |
| External side effects only (localStorage, non-Angular libs, logging) | `effect()` — never write signals inside it, never fetch in it |

- Update signals with `set` / `update`; never mutate state in place.
- Numeric/empty-string state needs explicit null checks: `value !== null`, never truthy — `0` is valid data.

## Services

- Single responsibility; `providedIn: 'root'` for singletons.
- `frontend/`: components never touch `HttpClient` — data goes through stores (`ngrx-signals-state.md`).

## Routing

- Lazy-load feature routes (`loadComponent` / `loadChildren`).

## Forms

- Reactive forms over template-driven where a form model is needed. Most fleet inputs are
  signal-backed `gb-*` controls; don't introduce template-driven forms.

## Accessibility

- Must pass AXE checks and WCAG AA minimums: focus management, color contrast, ARIA attributes.
- Native interactive elements (`<button>`, `<a>`, `<input>`) — never `<div role="button">`
  (see `ionic-shell-custom-ui.md`).

## Related path-scoped rules

`ngrx-signals-state.md` (state) · `gb-components-first.md` (legacy components) ·
`gb-icons.md` (icons) · `ionic-shell-custom-ui.md` (Ionic apps) ·
date/timezone rules in root `CLAUDE.md` (DateOnly, `parseLocalDate`).

