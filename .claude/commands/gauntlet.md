---
description: "Brief me on the pipeline — what is in flight, what is next, what is planned, what is stuck"
argument-hint: "[slug]  (omit for everything)"
---

# Gauntlet brief

Read the panel, then **report to Bojan in prose**. He should not have to run this or read raw
tool output — that is the whole point of it existing.

```bash
node tools/gauntlet.mjs status --json
```

If **$ARGUMENTS** names a slug, get that one's detail and its build scope instead:

```bash
node tools/gauntlet.mjs next $ARGUMENTS --json
node tools/gauntlet.mjs affected --slug $ARGUMENTS --json
```

## Parse the JSON, never the table

The table is formatted for pasting into a report. Column widths are not a contract; the JSON
shape is. Every command takes `--json`.

## What to tell him

Lead with the decision, not the inventory:

1. **What is actually next** — one slug, one stage, and why that one. `next` sorts cheap stages
   first for a reason: on 4 cores, a second CPU-heavy stage makes both slower. If two heavy
   stages are queued, say which to run and what to pair it with.
2. **Anything blocked**, and what would unblock it.
3. **Carried-forward items** on whatever is in flight — these are the things a fresh session
   would otherwise rediscover the hard way.
4. **Where the numbers came from.** `green` is read from the newest acceptance `.trx`; if it is
   stale or `null`, say "no run on record", never "0 passing". `scen` is counted live from the
   `.feature` file.

Do **not** run the test suite to freshen the numbers unless he asks. This command reads what is
already on disk — that is why it is cheap enough to run at the top of any session.

## Queuing work

When he describes something he wants built but is not ready to start:

```bash
node tools/gauntlet.mjs plan <slug> --title "one line of what it should do" [--ado N]
```

That is what fills the PLANNED section, and planned work is what a cheap `/spec` gets paired
with while a heavy stage runs elsewhere.
