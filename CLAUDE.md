# fredroberts.net

Fred's personal site. Angular 21, one application, source in `src/`. Created 2026-09-15.

## Stack and commands

Angular 21 with server-side rendering: an Express server (`src/server.ts`) wraps the Angular
SSR engine and enforces a Google sign-in boundary (`src/boundary/`) before any page is
rendered. With none of the four boundary settings configured it fails closed, so nobody gets
in, Fred included; `apphosting.yaml` lists the four. Tests are Vitest through `ng test`,
E2E is Playwright, lint is ESLint.
Node `^22.22.3 || ^24.15.0 || >=26.0.0` (`engines`), npm 11.5.2.

    npm ci                               # install from the lockfile (see the npm section below)
    npm start                            # ng serve on http://localhost:4200
    npm run build                        # ng build, output in dist/fredroberts-net/
    npm test                             # unit tests (ng test)
    npm run lint                         # eslint src; while working, lint only the files you touched
    npm run test:coverage                # unit tests with coverage
    npm run e2e                          # Playwright; starts ng serve itself

`ng serve` never loads `src/server.ts`, so the sign-in boundary specs cannot run against it:
point `E2E_BASE_URL` at a deployed build for those. `.auth/owner.json` is a captured owner
session, a live credential, and is gitignored.

## Deploy

Pushes to `main` deploy, through Firebase App Hosting (backend `fred-roberts-bak`, project
`fred-roberts-1965`, config in `firebase.json` and `apphosting.yaml`). Nothing here checks a
build before it ships, so run `npx ng build` first, and treat a push to `main` as a release.
The build runs `npm ci`; see the npm section below.

## Conventions

- E2E specs in `e2e/`. Playwright starts `ng serve` itself.
- Build artefacts are never committed. `test-results/` and `reports/` are gitignored.

## npm: never use `--legacy-peer-deps` here

It broke the App Hosting deploy twice. Firebase runs `npm ci`, which validates
`package-lock.json` against `package.json` with full peer resolution; `--legacy-peer-deps`
skips exactly that resolution, so it produces a lockfile `npm ci` rejects outright.

npm 11.5.2 on this machine does crash during peer resolution
(`Cannot read properties of null (reading 'edgesOut')`), which is why it got used. The way
round it without desyncing the lockfile:

    npm install --package-lock-only <pkg>   # resolve strictly, no crash
    npm ci                                  # then install from the lockfile

One thing the lockfile needs that is easy to lose:

- `@emnapi/core`, `@emnapi/runtime` and `@emnapi/wasi-threads` are declared as devDependencies
  even though nothing imports them. They are peers of `@napi-rs/wasm-runtime`, an optional
  dependency of `piscina` in Angular's build. On macOS the native binary wins so npm never
  records them, and the Linux build then fails on a lockfile that is missing them. Do not
  "clean up" these three.

**Before pushing anything that touched dependencies**, prove it the way the build does:

    rm -rf node_modules && npm ci && npx ng build
