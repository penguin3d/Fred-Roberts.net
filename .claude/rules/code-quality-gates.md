---
paths:
  - "gym-bug-workspace/**/*.{ts,html,scss}"
  - "frontend/**/*.{ts,html,scss}"
  - "backend/**/*.cs"
---

# Code duplication is gated — never copy-paste (frontend OR backend)

A jscpd ratchet runs via the Stop hook on `.ts/.html/.scss/.cs` changes (scans `gym-bug-workspace/projects/*` + `backend/`, vs `gym-bug-workspace/.jscpd-baseline.json`) and FAILS the turn on new clones. SonarAnalyzer runs in every `dotnet build` — treat `S####` warnings in touched files as actionable. Fallow gates frontend dead code/circular deps.

- New clone reported → **extract to shared code** (`gym-bug-core` for cross-feature, `shared/` in web-app otherwise). Never silence the check.
- Before building a "similar" component/dialog/editor: find the existing one and extend/parameterize it.
- Baselines (`dup:baseline`, `fe:deadcode:baseline`) may be re-recorded ONLY after legitimately reducing duplication/dead code, or with explicit user approval — never to make the gate pass.
- ESLint structural rules (`max-lines-per-function: 50`, `max-lines: 400`, `complexity: 15`) are warnings — treat as errors for NEW code.
- **NEVER manually edit EF Core migration scripts** — regenerate via `dotnet ef` (entity-framework-core skill).

# On task completion — frontend checks

**Legacy `gym-bug-workspace/`** (run in order):

1. **Lint:** `npx eslint --no-cache projects/web-app/src/ projects/gym-bug-core/src/`
2. **Dead code:** `npm run fe:deadcode:check` (full report: `npm run fe:deadcode`)
3. **Duplication:** `npm run dup:check` (~1s)

The Stop hook also runs 2–3, but run them yourself to fix findings before finishing.

**New `frontend/`:**

1. **Lint (incl. architecture boundaries):** `npm run lint`
2. **Build what you touched:** `npx ng build <app>` — or `npm run build:all`

Note: the jscpd duplication gate currently scans `gym-bug-workspace/projects/*` + `backend/` only; `frontend/` is **not yet covered** (the three Ionic app shells are intentionally identical scaffolds and would need baselining first).
