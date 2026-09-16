---
paths:
  - "frontend/**/*.{ts,html,scss}"
---

# Responsive UI — every human-facing surface works on a phone

Decided 2026-08-23. Applies to `frontend/` (the new fleet). The legacy
`gym-bug-workspace` is frozen and exempt — bugfixes only, no responsive retrofit.

## Which apps

| App | Target | Rule |
|---|---|---|
| `admin` | phone → desktop | **Responsive. Non-negotiable.** Coaches work the floor on a phone |
| `site` | phone → desktop | **Responsive.** Marketing is mobile-majority traffic; the hub is used on phones |
| `member` | phone, up to desktop | **Responsive.** Ships as a PWA, so it is opened in desktop browsers |
| `kiosk` | mounted tablet | **Fixed form factor** — declare the target viewport, do not go fluid |
| `screens` | TV at 10ft | **Fixed form factor** — leanback, no touch, landscape only |

The carve-out is for *known fixed hardware*, not for "this page is complicated".
If a human might open it on their own phone, it is responsive.

## The floor

- **360 × 640 is the smallest supported viewport.** Everything must be usable there.
- **The page body never scrolls horizontally.** Wide content (tables, calendars, code,
  charts) scrolls inside its own `overflow-x: auto` container, never the document.
- **Touch targets ≥ 44px on coarse pointers.** `@media (pointer: coarse)` bumps control
  height; do not ship 38px density to a finger.
- Nothing is hidden on small screens that is reachable on large. Reorganise, collapse,
  or move it behind a "More" affordance — never delete the capability.

## Breakpoints — one source, three stops

Declared in `@gymbug/core/ui/src/styles/_breakpoints.scss` and used via its mixins.
SCSS, not custom properties: CSS variables cannot be used in a media query.

| Name | Range | Admin shell behaviour |
|---|---|---|
| `phone` | < 640px | Bottom tab bar + More sheet. No sidebar |
| `tablet` | 640–1023px | Icon rail sidebar, labels on hover/expand |
| `desktop` | ≥ 1024px | Full sidebar, collapsible, state persisted |

Never invent a fourth stop inline. If a component genuinely needs its own,
add it to `_breakpoints.scss` with a comment saying why.

## Always

- **Mobile-first CSS.** Base rules are the small layout; `@include bp.from(tablet)` adds.
  A `max-width` override stack is how you end up with a desktop app that "also loads" on a phone.
- **Layout responds in CSS, not TypeScript.** Grid/flex, `minmax()`, `clamp()`,
  container queries. A component that reads a width to decide how to lay itself out is a bug.
- **One nav model, many renderers.** The sidebar, the bottom bar and the More sheet all
  render the same nav tree. Two hand-maintained item lists is how the legacy admin
  drifted (`custom-sidenav` vs `admin-bottom-nav` — see [that mistake](../../gym-bug-workspace/projects/web-app/src/app/admin/components/admin-bottom-nav/admin-bottom-nav.component.ts)).
- **Tables become cards below `tablet`.** A horizontally scrolled 9-column table is not
  a mobile design. Same data, same store, different template.
- **Test all three stops.** A change to any shared layout is verified at 360, 768 and 1280.

## Never

- **No `@HostListener('window:resize')` for layout.** It fires on every keyboard open,
  it forces layout, and it lies during orientation change. When structure genuinely must
  change (not just style), use a `matchMedia` signal — one listener, declarative, testable.
- **No device sniffing.** No user-agent tests, no `isMobile` service deciding what to render.
  Breakpoints describe the *viewport*, not the device. (The legacy `DeviceDetectionService`
  is exactly this anti-pattern; do not port it.)
- **No fixed `px` widths on containers.** `max-width` + `%`/`fr`/`minmax()`. Fixed heights
  on anything containing text are a truncation bug waiting for a longer gym name.
- **No separate "mobile" route tree or component.** One SPA, one route per page.
  Divergent mobile routes double the surface and rot.
- **No horizontal scroll to reach a primary action.** If the CTA is off-screen at 360px,
  the layout is wrong.

## Verifying

Responsive breakage is invisible to unit tests — it is caught by looking.

```bash
cd frontend && npm run start:admin        # then 360 / 768 / 1280 in devtools
```

For anything shipping a new page, the `/qa` stage proves both stops **from the spec**, not by
resizing a browser by hand. Declare them as Playwright projects so every run covers both and
nobody has to remember:

```ts
projects: [
  { name: 'phone',   use: { ...devices['Desktop Chrome'], viewport: { width: 360,  height: 640 } } },
  { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
]
```

A page whose 360px screenshot has a horizontal scrollbar fails the gate. Assert it rather than
eyeballing it — the document must never be the thing that scrolls sideways:

```ts
const overflows = await page.evaluate(
  () => document.scrollingElement!.scrollWidth > document.scrollingElement!.clientWidth
);
expect(overflows, 'page body scrolls horizontally at 360px').toBe(false);
```
