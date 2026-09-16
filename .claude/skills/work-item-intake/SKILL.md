---
name: work-item-intake
description: File a product-side request (bug report, complaint, or improvement ask) as an Azure DevOps work item written in business behaviour, never in code terms. Asks the full intake battery first, derives severity, always asks priority. USE WHEN the user says "file this in ADO", "put this in the backlog", "create a bug/story for this", "log this", or relays a report from an owner, coach, or member. NOT for developer-found bugs — those use /root-cause.
---

# Work-item intake — product requests are filed as business behaviour, never as diagnosis

A request that arrives from the **product side** (the product owner, an owner/coach, a member
complaint relayed to us) is a statement about **behaviour the business expects**. It is filed as
that. It is NOT a code investigation, and a work item that opens with a file path, a class name
or a stack trace has already failed — nobody on the product side can confirm, prioritise or
accept it.

Developer-authored root-cause dossiers are a different artefact with a different home: see
"Where the technical detail goes" below.

## When this applies

Any time a non-technical report or request is going to become an Azure DevOps work item:

- "X is broken / X does the wrong thing / a member complained that…" → **Bug**
- "Can it also…", "it would be better if…", "we need to be able to…" → **improvement**
- A verbal, chat, screenshot or email report that you are asked to "put in ADO".

It does NOT apply to bugs a developer found in the code while working — those are filed by the
developer with the technical write-up (`/root-cause`), and are exempt from the ban on technical
content because the audience is a developer, not the business.

## Step 1 — Ask the full battery. Always. Before anything is filed.

Ask every question below, even when the report looks complete. The ones that seem redundant are
the ones that catch a wrong assumption. Never skip ahead to filing because the request "is
obvious" — obvious requests are how a ticket ends up meaning two different things to two people.

Delivery: put the closed questions through `AskUserQuestion` (max 4 per round, two rounds max),
and the open ones as a short numbered list in the same turn. Accept "don't know" as an answer —
record it in the item as **Not confirmed**, never as a guess.

### If it is a bug

1. **Where** — which app (member, admin, kiosk, screens, public site), which screen, and what
   were you doing at the time?
2. **What happened** — describe only what was on the screen. Exact wording, numbers, names,
   amounts. Not what you think caused it.
3. **What should have happened instead** — and what makes that the right answer? A rule we
   agreed, how it worked before, something we promise a member?
4. **Who is hit** — which roles (member / coach / admin / owner), and is it one specific person
   or everyone doing that thing?
5. **How often** — every single time, sometimes, once? Anyone else seen it?
6. **Since when** — has it always been like this, or did it start recently? Anything change
   around then (a release, a plan change, a new member import)?
7. **What is the damage right now** — money charged wrong, a member locked out, staff redoing
   work by hand, wrong data on a report, or just annoying?
8. **Workaround** — is there another way to get the job done, and how painful is it?
9. **Where did you see it** — production, or systest/local?
10. **Evidence** — screenshot, the member's name, the class, the date and time it happened.
11. **Priority — always ask, never assume.** Give the scale in plain words every time:
    **1 = most urgent, drop things for it · 2 = important, this release · 3 = should happen,
    next release · 4 = not a big deal, can be done later.** Also ask what happens to the
    business if we leave it a month.

### If it is an improvement

1. **Who benefits** — which role, and what are they trying to get done?
2. **How it works today** — what is the manual step, workaround or annoyance being replaced?
3. **What should be possible afterwards** — described as what that person would see and do,
   not as a feature name.
4. **Why now** — what does it unlock? Revenue, retention, staff hours, a launch it blocks,
   a promise made to someone.
5. **How we will know it worked** — the observable outcome, ideally something countable.
6. **Rules the business cares about** — limits, who is allowed, what happens in the awkward
   cases (no plan, expired card, cancelled class, first-time member).
7. **Explicitly out of scope** — what this is NOT, so nobody scope-creeps it.
8. **What must not change** — existing behaviour that has to keep working exactly as-is.
9. **Where it belongs** — is this part of an existing product area/Feature, or something new?
10. **Priority — always ask, never assume.** Same scale, same plain words:
    **1 = most urgent, drop things for it · 2 = important, this release · 3 = should happen,
    next release · 4 = not a big deal, can be done later.** Follow up with what is already in
    flight that they would drop for it.

## Step 2 — Decide the type, and confirm it

- **Bug** — the system does not do what it was already supposed to do. If nobody ever agreed it
  should behave that way, it is not a bug, it is an improvement. Ask; do not decide silently.
- **Improvement** — new or changed behaviour. **Size decides the type, and the type is confirmed
  with the requester every time, never defaulted:**
  - a single behaviour change that can be accepted in one sitting → **User Story**, parented
    under the Feature that owns that area;
  - a body of work with several behaviours that will be built over more than one go → **Feature**,
    with the behaviours as User Stories under it.

  State your recommendation and the reason in one line, then confirm before filing.

**One item per problem.** A report containing three symptoms becomes three items, cross-linked
(`related`). Bundled tickets never get closed cleanly and hide the one part that matters.

**Check for duplicates first** — `mcp__ado__search_workitem`, or a WIQL query on the key nouns.
If it exists, add the new evidence as a comment and say so; do not open a second item.

## Step 3 — Write it in business language

Written in plain, direct language the requester would recognise as their own — the same voice
rules as [ghostwriter-voice.md](../../rules/ghostwriter-voice.md). No AI tells, no heading pyramids, no
restating the request back before answering it.

### Titles

The title is the **outcome**, in the requester's words. Not the cause, not the fix.

| No | Yes |
|---|---|
| `Unguarded window.matchMedia in WebsiteLayoutComponent.ngOnInit` | `Shared blog links show the site logo instead of the post's own image` |
| `Add DateOnly field to UserProfile` | `Member Since should be a real date staff can correct` |
| `BUG: booking API 500` | `Booking a class fails silently for members whose plan renewed today` |

Rules: ≤ ~100 characters, no `BUG:`/`FIX:` prefixes, no file names, class names, method names,
table names, error strings or proposed solutions.

### Bug body

`System.Description` — these sections, in this order, nothing else:

- **What happens** — the observed behaviour, plainly.
- **What should happen** — and the rule or expectation it comes from.
- **Who it affects** — roles, scale (one member / everyone on a plan / all staff).
- **How often / since when** — including "not confirmed" where it is not confirmed.
- **Impact** — the business consequence in one or two sentences: money, access, trust, staff time.
- **Workaround** — or "none".
- **Evidence** — screenshots attached, member/class/date references, environment.

`Microsoft.VSTS.TCM.ReproSteps` — numbered steps from a known starting state, written in what a
person clicks and sees ("Sign in as an admin → Members → open <member> → Edit"), never in routes,
endpoints or payloads.

### Improvement body

`System.Description`:

- The story line: **As a `<role>`, I want `<capability>`, so that `<business outcome>`.**
- **Today** — the current behaviour or manual workaround being replaced.
- **Acceptance** — **Gherkin, always.** Each criterion is a `Given / When / Then` block under a
  bold `Acceptance` heading in the Description (see #1365) — not in a separate field, not a bullet
  list of prose.

  ```
  Scenario: A member sees how many classes are left in the week
    Given a member is on a plan that allows 4 classes a week
    And they have booked 3 classes in the week of 2026-09-13
    When they open their plan
    Then they see 1 of 4 classes remaining
  ```

  **Every criterion opens with a `Scenario:` line**, steps indented two spaces under it. The
  title is a sentence someone can tick off as true or false — `A member at their weekly limit is
  told before they try to book`, never `AC-04` or `Negative path`. It is what gets read aloud at
  acceptance, what `/spec` carries into the `.feature`, and what appears in the stage-5 QA report.
  A block without one is a criterion nobody can refer to in a sentence.

  **Markup — get this exactly right or the card is unreadable.** ADO's renderer flows bare
  consecutive `<pre>` blocks *side by side*, so six criteria come out as three unreadable
  columns. Each criterion must be a `<pre>` wrapped in its own block-level `<div>`:

  ```html
  <div style="margin-bottom:14px"><pre style="display:block;margin:0">Scenario: A member sees how many classes are left in the week
    Given a member is on a plan that allows 4 classes a week
    And they have booked 3 classes in the week of 2026-09-13
    When they open their plan
    Then they see 1 of 4 classes remaining</pre></div>
  ```

  Real newlines inside the `<pre>`, not `<br>`. ADO preserves the inline styles. Quotes in the
  Gherkin are escaped to `&quot;` by ADO on save — that is expected, not a defect.

  Rules that make it useful rather than decorative:
  - **Personas, never names.** `a member on a plan that allows 4 classes a week`, `a coach`,
    `an owner` — never `"Kate"`, never `"Ben"`. A name invites the reader to treat the case as
    one person's problem; the persona says which *role and situation* the rule governs, which is
    the thing being agreed. Refer back with they/them. Where two people of the same role appear
    in one criterion, distinguish them by situation (`a member on the waitlist` vs
    `the member who cancelled`), not by inventing names.
  - **Name the rule, not the product noun, where the rule is the point.** "a plan that allows 4
    classes a week" beats "the 4x Weekly plan" — the criterion then holds for every weekly-limited
    plan rather than one of them.
  - **Business language only.** No endpoints, no field names, no "the API returns". If it could
    not be read aloud to a member, rewrite it.
  - **One `When` per criterion.** Two actions means two criteria.
  - **Literal values.** Real names, real numbers, real dates as `yyyy-MM-dd`. Never "some date",
    never "today" — relative dates are how date bugs get specified into existence.
  - **Cover the sad path.** At least one criterion for the refusal, the empty state, or the
    limit being hit. A story with only a happy path is not ready.
  - **Two to six criteria.** More than six and it is a Feature, not a story — split it.

  **These criteria are the seed, not the contract.** The `.feature` file that `/spec` writes is
  the executable specification, and it will hold far more scenarios than this card does — the
  interrogation battery at stage 1 expands every limit into one-under / at / one-over, adds the
  role refusals, the empty states, the tenant case and the repeat-action case. Three criteria
  here routinely become thirty there.

  So: write what you mean, not every case. You are stating the intent precisely enough that it
  cannot be misread — not pre-writing the test suite. Once `/spec` has run, the `.feature` is the
  specification and **this card is never updated to match it**; if the two ever disagree, the
  `.feature` wins and a criterion that never made it into a scenario is a stage-1 defect.
- **Out of scope** — what this deliberately does not include.
- **Guardrails** — what must stay true while this is built: the existing behaviour that may not
  change, the performance or safety rule it must respect, the invariant (calendar dates, tenant
  scoping, fail-open) it must not bend. One line each; `/spec` carries them into the `.feature`.
- **Done means** — the definition of done in checkable sentences: the behaviour a member or admin
  can see, the screen that must exist, the message they read. Never "works" or "is fast".
- **How we will know it worked** — the measure.
- **Open** — unresolved questions, named as questions, not guessed at.

Acceptance criteria describe **behaviour of the product**, never implementation. "The member sees
the new card charged immediately" is acceptance. "The Stripe webhook retries the invoice" is not.

### Priority is asked. Severity is derived.

**Priority is the requester's call and is asked out loud on every single item — bug or
improvement, big or small.** Never infer it from tone, never quietly default to 3. Ask it with
the scale spelled out in plain words, in this order, every time:

| `Microsoft.VSTS.Common.Priority` | Say it like this |
|---|---|
| **1** | most urgent — we drop things for it |
| **2** | important — this release |
| **3** | should happen — next release |
| **4** | not a big deal — can be done later |

If the requester genuinely will not pick a number, propose one with your reason, get a yes, and
write in the item that the priority was proposed rather than given.

Severity, in contrast, you derive from the answers, and the reasoning goes in the item.

| `Microsoft.VSTS.Common.Severity` (how broken) | |
|---|---|
| 1 - Critical | unusable, data or money wrong, access lost, security |
| 2 - High | a real capability broken, no workaround |
| 3 - Medium | degraded, workaround exists |
| 4 - Low | cosmetic, rare edge case |

The two are independent, and a mismatch is normal — do not "correct" a given priority to match
the severity you worked out. A cosmetic wording bug on the join page in launch week is severity 4,
priority 1. A crash in a screen nobody uses yet is severity 1, priority 4. If the answers point
somewhere very different from the number given, say so in one line and let the requester decide;
their number is what gets filed.

## Where the technical detail goes

The filed item stays business-only. Technical content is added **after** someone investigates,
and it goes **around** the item, never into its framing:

- Root cause, affected files, fix plan, verification steps → a **comment** on the item
  (`mcp__ado__wit_work_item_comment_write`), or a child Task, added once a developer has actually
  investigated. `/root-cause` produces exactly this write-up.
- Raw technical clues the requester happened to have (error text, console output, log lines) →
  a comment saying what it is, or an attachment. Not deleted, not in the description.
- The title and the business sections are **never** rewritten to match the diagnosis. If the
  investigation shows the real problem is a different one, that is a new item, linked.

## Filing in ADO

- Project **`GymBugHub`** (`f688cefd-6d0b-4bda-bcf4-2f0fc43b9e84`) unless the requester names
  another. Never file product intake into the old `Gym Bug` project.
- `mcp__ado__wit_work_item_write`, action `create`. `System.AreaPath: "GymBugHub"`,
  `System.IterationPath: "GymBugHub"`, multiline fields with `format: "Html"` and entities
  escaped (`&amp; &lt; &gt; &quot;`).
- New items start in **New** — do not set state on create.
- Parent it with `mcp__ado__wit_work_item_link_write` (`type: "parent"`): a User Story under its
  Feature, a Feature under its Epic. An unparented item is an orphan nobody grooms.
- Report the id and `https://dev.azure.com/PeskySix/GymBugHub/_workitems/edit/<id>`.
- If a write is rejected or the MCP is unavailable, output the finished item text so it can be
  pasted, and say plainly what failed.

## Never

- Never file before the battery is answered, however small the request looks.
- Never file an item without asking for the priority, and never assign one yourself unasked.
- Never put a file path, class, method, endpoint, SQL, framework name, stack trace or "the fix
  is…" into a product-filed title or description.
- Never bundle several problems into one item.
- Never invent an impact, a frequency, a repro step or an affected count the requester did not
  give. Unknown is written as **Not confirmed**.
- Never restate the requester's raw wording as the whole item and call it filed — the job is to
  turn it into expected-vs-actual behaviour with a stated impact.
- Never close the loop by describing the ticket back at length. Give the id, the URL, and the
  one line of what was filed.
