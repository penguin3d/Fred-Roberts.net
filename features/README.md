# features — the frozen contracts

One `.feature` per slug, named `<slug>.feature`, tagged `@<slug>` so a stage can run
just its own. Written by `/spec` and frozen the moment that stage ends: stages 2 to 5
read it directly and never transcribe it.

`steps/` holds the bindings, written by `/code`. `/spec` never writes a binding, which
is why its gate passes only when every scenario is red on a missing one.

Run one slug's contract:

    npm run test:acceptance -- --tags @<slug> --format json:test-results/<slug>.json

`node tools/gauntlet.mjs status` reads that JSON for the green count, and counts the
scenarios from the `.feature` itself. Neither number is ever stored in the ledger.
