# Pipeline state comes from the panel, never from memory

When Fred asks where work stands, what is next, what is planned, or what he should pick up,
the answer is read from the tool — not from this session's recollection, not from the repo,
not from a previous message in this conversation.

```bash
node tools/gauntlet.mjs status --json      # everything
node tools/gauntlet.mjs next [slug] --json # the single next action, and why
```

## There are TWO boards. "The board" always means both.

Same project (`Fred Personal Work`), same work items, two teams with their own columns. An item shows on
both at once — `Fred Personal Work Team` sees `Fred Personal Work` **with `includeChildren: true`**, so nothing
disappears from the product view when it enters the pipeline.

| Board | Team | Role | Columns |
|---|---|---|---|
| **Product** | `Fred Personal Work Team` | everything wanted, ever. The standing backlog — **~78 open items that still need reviewing, sizing and triaging** | Backlog → Spec / Design → Ready for Dev → In Progress → Code Review → Testing → Ready for Release → Done |
| **Pipeline** | `Development` | only what is being built right now, one column per gauntlet stage | Backlog → Spec → Code → Clean → Harden → QA → Done |

When Fred asks what is on the board, **report both**: what the pipeline is working (from
`gauntlet status`) and what is waiting in the product backlog. Never answer with only one.

### Pulling an item into the pipeline

Two fields, both required — this is the act of starting work:

```
System.AreaPath  -> Fred Personal Work\Development        (puts it on the Development board)
WEF_79FE1C605ACB4C4F846C090E137BC796_Kanban.Column -> Spec     (User Story / Bug)
WEF_1B4F0CF57E764A8F947F2E47DC79F6FF_Kanban.Column -> Spec     (Feature)
```

Then `gauntlet plan <slug> --title "…" --ado <id>` so the ledger holds the link. The item keeps
its parent Feature/Epic, so the product hierarchy is never broken by the move — and both boards
track it from then on, each in its own columns.

### Keeping the product board honest

Moving a card through the pipeline does **not** move it on the product board; the two column
sets are independent. When a slug reaches `/qa` and is accepted, also advance the product card
to its `Done` — `gauntlet sync` only drives the Development board. Say so rather than assuming
Fred has done it.

Product-board work that is **not** a pipeline stage — triaging the backlog, sizing, splitting a
Feature into stories, closing stale items — happens on the product board alone and never gets a
slug. Do not create ledger entries for it.

## Links are structure. Prose is not.

A relationship written in a description is invisible to every query. #1365 says *"must reuse
#1332 / #1346"* and *"#1342 blocks booking"* in its text and carries **no link for any of them** —
a dispatcher reading that item sees an unblocked story. That is the failure this section exists
to stop.

| Relationship | Link type | When |
|---|---|---|
| belongs to | `System.LinkTypes.Hierarchy-Reverse` (Parent) | **every** item, always — Story/Bug → Feature → Epic |
| waits on | `System.LinkTypes.Dependency-Reverse` (Predecessor) | this cannot finish until that one does |
| unblocks | `System.LinkTypes.Dependency-Forward` (Successor) | the other side of the same fact |
| touches the same ground | `System.LinkTypes.Related` | worth knowing, does not gate |
| same thing twice | `System.LinkTypes.Duplicate` | close one, keep the evidence |

**Never file an unparented item.** An orphan is groomed by nobody and rolls up into no Feature.
If no Feature fits, say so and ask — do not invent one and do not quietly leave it parentless.

**A block is a link, not a sentence.**

```bash
gauntlet block <slug> --why "<one line>" --blocked-by <ado id>
gauntlet sync <slug> --json      # emits the Predecessor link to write
gauntlet linked <slug>           # after wit_work_item_link_write succeeds
```

If the blocker is real work with no work item yet, **file it first**. A blocker nobody can open
is a blocker nobody will clear. If it is genuinely not a work item — a decision only Fred can
make, a third-party outage — `--why` alone is right, and it goes to him rather than sitting in
the ledger unread.

**Writing a dependency into a description instead of linking it is a defect**, the same way a
prose status is. If you spot one while working an item, raise it; the fix is a link, and the
prose can stay as the explanation of *why*.

## Dispatching a stage to another session

Fred opens sessions and leaves them idle as a pool of workers. Take a **fresh, unused** one per
stage, never a session that has already run something — its context is no longer clean, and
neither he nor you can reset it. When the pool is empty, say so in this session and name which
slugs are waiting; do not reuse.

Send exactly this shape (`SendMessage` with `notify_when_idle: true`):

```
/<stage> <slug>

Worktree: <path>   (work there; never the main checkout)

First, before any work: post the [gauntlet] STARTED comment on the item.
If you die mid-stage that comment is the only evidence you ever ran.

Report to the LEDGER, not to me — nobody is reading this window:
  passes  -> gauntlet sign-off <slug> <stage> --gate "<numbers>" [--carry "..."]
  fails, or needs a judgement call
          -> gauntlet block <slug> --why "<one line>" then STOP

Then move your own card, before you finish:
  gauntlet sync <slug> --json      -> apply it with wit_work_item_write
  gauntlet synced <slug> <stage>   -> only after the write actually succeeded
  post the [gauntlet] DONE or BLOCKED comment on the item

Do not ask a question and wait. Park it with `block` and end your turn.

The gate is the scope, and nothing wider:
  build   npx ng build
  test    ONLY the test classes that cover the files you touched (--filter), plus
          --filter "Category=<slug>" on the acceptance project;
          frontend: npx ng test <app> --include '<your spec glob>' and npx eslint <your files>
  never   a bare ng test across every spec, or an unscoped stryker run,
          or any run over files you did not touch. Other sessions share these 4 cores.
  Widening one step (a whole test project) is a decision you write in the report with a reason.

Disk: C: is small and shared by every worktree. Before EVERY build, test or mutation run check
free space (PowerShell: (Get-PSDrive C).Free/1MB). Under 2 GB: stop and block with the number,
do not push on. When your stage is done, delete what you produced: ./tmp/cov, every
TestResults/ and StrykerOutput/ dir you created, and any %TEMP%crap-sonar-* or coverage dir
of yours. bin/ and obj/ stay only if the next stage runs within the hour; otherwise delete them.

End your final message with exactly:
✅ DONE — /<stage> <slug> — safe to close
```

**The worker moves its own card.** It has MCP; it does not need the dispatcher awake. The card
advances the moment the stage passes rather than whenever someone next thinks to reconcile — so
the board is true at 3am, not at breakfast.

The dispatcher's `sync` is then a **safety net, not the mechanism**: it catches whatever a worker
failed to push (MCP down, session died mid-write, a stage that forgot). Because sync is a
reconciliation, a worker pushing and the dispatcher pushing later cannot double-apply.

**Pass nothing else.** The branch, the previous gate numbers, the carried-forward notes and the
file list all come from `gauntlet next <slug> --json`, which every stage runs as its first act.
Repeating them in the message creates a second copy that can disagree with the ledger — the same
drift that the card-versus-`.feature` rule exists to prevent.

**Idle is not success.** The idle notice means *look now*, nothing more. Read the ledger to find
out what happened: a sign-off means it passed, a `block` means it is parked with a reason, and
**silence in the ledger means the worker died** — flag that to Fred rather than assuming it is
still working.

**`/spec` is never dispatched.** It runs on the interrogation battery with Fred answering; a
worker would guess, which is the one thing that stage exists to prevent.

## Triggers — call it BEFORE answering

"what's next" · "where are we" · "what’s on the board" · "what needs doing" · "what's in flight" · "what's planned" ·
"what should I work on" · "status of X" · "how far are we on X" · any question about progress
on a feature. Also at the top of every gauntlet stage: `gauntlet next <slug> --json`.

When he describes work he wants but is not starting now, queue it rather than losing it:
`gauntlet plan <slug> --title "…" [--ado N]`.

## Not triggers

Ordinary work. "How does X work", "fix this bug", "what does this file do", "explain Y" —
answer those normally. This rule is about the pipeline's state, not about being thorough.

## Reporting it

Report in prose, leading with the decision — one slug, one stage, why that one. Fred should
never have to run the tool himself or read its raw output; that is why it exists.

Parse `--json`, never the table. `green` is read from the newest acceptance `.trx`: when it is
null say **"no run on record"**, never "0 passing", and never freshen it by running the suite
unless asked. `scen` is counted live from the `.feature` file.

On a 4-core box two CPU-heavy stages (`/code`, `/clean`, `/harden`) run slower together than
in sequence. When the panel flags that, say which one to run and what cheap stage to pair it
with — do not just relay the warning.

## Pushing the ledger to the pipeline board

The ledger is written first and ADO follows. After any sign-off:

```bash
node tools/gauntlet.mjs sync <slug> --json
```

It emits a **plan, not a write** — a Node script has no MCP. Apply it with
`wit_work_item_write` (project `Fred Personal Work`, team `Development`), then record that it landed:
`gauntlet synced <slug> <stage>`. Only mark it synced if the write actually succeeded.

Skipping a push breaks nothing: `sync` is a reconciliation, so the next run catches up every
missed stage in one go and running it twice does nothing. Never hand-edit a card to "fix" a
drift — fix the ledger and re-sync, or the two disagree again next time.
