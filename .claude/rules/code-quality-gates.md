---
paths:
  - "src/**/*.{ts,html,scss}"
---

# Code duplication and dead code are your job here, not a hook's

Upstream this was enforced automatically: a jscpd ratchet and a dead-code scan ran on every
Stop hook and failed the turn on a new clone. **This workspace took the pipeline without the
hooks layer**, so nothing fails automatically. The standard is unchanged; only the enforcement
is gone. Do not read the absence of a red light as permission.

- Found yourself copy-pasting → **extract to shared code** instead. Never silence a check.
- Before building a "similar" component, dialog or editor: find the existing one and extend or
  parameterize it.
- ESLint structural rules (`max-lines-per-function: 50`, `max-lines: 400`, `complexity: 15`)
  are warnings — treat them as errors for NEW code.
- Duplication and dead code are `/clean`'s explicit remit at stage 3. If you notice either at
  stage 2, say so in the handoff rather than fixing it: stage 2 does not own shape.

# On task completion

Run these yourself before you finish, in order:

1. **Lint the files you touched:** `npx eslint <files you touched>`
2. **Coverage gate:** `npm run test:coverage:gate` — the 90% line and branch floor
3. **Build:** `npx ng build`

The floor is measured per file you created or modified, which no global threshold can express,
so read the report and quote the per-file numbers regardless of what the summary says.
