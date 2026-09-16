---
name: manual-test-checklist
description: "Generate a manual-testing checklist for a just-built feature and file it as an ADO User Story under the tested Feature in Fred Personal Work. USE WHEN the user says 'make a manual testing checklist', 'create a test checklist', or asks to create a testing story for a feature."
---

# Manual Test Checklist → ADO User Story

Produce a **short, tester-friendly manual checklist** for a feature that was just built, in the team's house style, and file it as a **User Story** in Azure DevOps via the **ado MCP**, as a **child of the Feature it tests** in the **Fred Personal Work** project.

The goal is a checklist a non-technical tester can follow: **where to go** in the app and **what to tick**. Keep it concrete and skimmable — not exhaustive QA cases.

## Inputs

The feature to test. Take it from the user's argument, or infer it from the work just completed in this session. If you genuinely don't know which feature, ask one short question; otherwise proceed.

## Step 1 — Gather what you need (don't over-ask)

From the conversation/codebase, determine:
- **Feature name** and a one-line summary.
- **Entry points** — every place in the UI a tester can reach it (routes, buttons, menus). These become the numbered "areas".
- **Setup/preconditions** — login role and any data needed (a member with X plan, a track with classes, etc.).
- **Key behaviors / edge cases** worth a tick (limits, defaults, empty states, what should NOT happen).
- Anything that **looks like a bug but is intended** → call it out as a Note so testers don't file it.

Only ask the user if a critical entry point or precondition is unknown.

## Step 2 — Write the checklist (house format)

Build an **HTML** description (ADO renders HTML). Match this structure exactly:

- Opening `<p>`: one sentence on the feature + "Walk each area and tick what works; note anything off."
- `<p><strong>Setup:</strong> …</p>` — role + data preconditions.
- One `<h3>` per **area / entry point**, numbered, each followed by `<p><em>Where: …</em></p>` giving the exact route/location.
- Checks as `<ul><li>☐ …</li></ul>` — use the literal `☐` (U+2610) ballot box at the start of every item. Bold the key nouns/actions with `<strong>`.
- A final `<h3>` like **"After … — verify"** for downstream effects (data shows up elsewhere, nothing wrongly consumed, existing flows still work).
- Optional closing `<p><em>Note: …</em></p>` for intended-but-surprising behavior or known gaps.

Rules:
- Escape HTML entities (`&amp; &lt; &gt; &quot;`), use `&rarr;`, `&mdash;`, `&hellip;`, `&ndash;` where natural.
- Keep each bullet a single, checkable statement. ~6–12 bullets per area max.
- Plain language a coach/owner understands; avoid code identifiers unless they're what the tester literally sees.

**Reference example to mirror (format only):** ADO work items **#1200** (Bulk Class Reservation) and **#1198** (Document Signing) in the old "Gym Bug" project, and **#1297** (CRM Improvements) — new checklists do NOT go to "Gym Bug".

### Title
`<Feature name> — Manual Testing Checklist`

## Step 3 — File it in Azure DevOps (ado MCP)

1. Project is **`Fred Personal Work`** (id `f688cefd-6d0b-4bda-bcf4-2f0fc43b9e84`) unless the user names another. In Fred Personal Work the **User Story type is repurposed as the verification/test package under a Feature** — that's exactly what this checklist is.
2. Identify the **Feature** being tested (usually the feature just worked on in this session). The checklist story becomes its **child**.
3. Create the work item:
   - `mcp__ado__wit_work_item_write` (action `create`) with `project: "Fred Personal Work"`, `workItemType: "User Story"`.
   - Fields: `System.Title`; `System.Description` with `format: "Html"` and the checklist HTML; `System.AreaPath: "Fred Personal Work"`; `System.IterationPath: "Fred Personal Work"`.
   - New items start in state **New** — do NOT try to set state on create.
4. Parent it under the Feature with `mcp__ado__wit_work_item_link_write` (action `link`): `{ id: <checklist id>, linkToId: <feature id>, type: "parent" }`.
5. Fred Personal Work User Stories have stock Agile states (**New / Active / Resolved / Closed**) — there is **no "Ready For Testing" state**. Leave the story in **New**; readiness is signaled by the story existing under the Feature. Assign it to the tester if the user names one.
6. Report the work item **id** and its edit URL: `https://dev.azure.com/PeskySix/Fred Personal Work/_workitems/edit/<id>`.

## Notes
- This is a checklist story, not a spec — keep scope to "walk and tick".
- If the ado MCP isn't available or a write is rejected, output the finished HTML so the user can paste it, and say what failed.
- Don't invent entry points or behaviors you can't see in the code/conversation.
