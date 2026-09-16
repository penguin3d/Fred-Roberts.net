---
description: Investigate bug symptoms, root cause in code, propose fix, and file ADO ticket on approval.
---

Investigate reported symptoms, root cause the issue in code, propose a fix plan, and file an ADO work item — only after explicit user approval at each gate.

**Input:** Any combination of symptom descriptions, screenshots, error messages, log output, or user observations passed as $ARGUMENTS or provided in the conversation.

## Instructions

### Step 1: Gather Symptoms

Read all input provided — text descriptions, screenshots, error logs, etc.

Summarize what you understand the reported behavior to be in 2-3 bullet points, then **ask the user clarifying questions** before proceeding. Possible questions (ask only what's relevant):

- Which part of the system? (web app, screens/TV app, backend API, mobile)
- Reproducible consistently or intermittent?
- When did this start? (after a deploy, always, recently)
- Which user/member/page is affected?
- Steps to reproduce?

**GATE: Do NOT proceed until the user has answered or told you to move on.**

### Step 2: Deep Code Investigation

Launch 1-3 Explore agents to trace code paths that could explain the symptoms:

- Search `src/`, and the `features/` contracts for the behaviour that is wrong
- Trace the full data flow: API endpoint → handler/query → DTO → frontend component → template
- Look for known patterns from CLAUDE.md (timezone bugs, weekly limit day, etc.)

Read all critical files yourself to verify agent findings before presenting.

### Step 3: Present Root Cause & Fix Plan

Present a clear write-up:

1. **Symptoms** — what was reported
2. **Root Cause** — specific code path(s) and line(s), with code snippets
3. **Why it happens** — explain the mechanism
4. **Proposed Fix** — concrete code changes with before/after snippets
5. **Affected files** — list with paths

**GATE: Ask the user to confirm the analysis is correct before proceeding.**

> Does this root cause and fix plan look correct? Approve to file, or provide corrections.

**Do NOT file anything until the user explicitly approves.** If the user has corrections, revise and re-present.

### Step 4: Collect ADO Filing Details

Once the user approves the analysis, ask for filing details using AskUserQuestion:

1. **Work item type** — Bug or User Story (default: Bug)
2. **Priority** — 1 Critical, 2 High, 3 Medium, 4 Low (default: 3)
3. **ADO Project** — default: "Gym Bug"
4. **Sprint/Iteration** — which iteration path to assign

Accept shorthand — if the user says "defaults" or "bug, p3, current sprint", use those values.

**GATE: Do NOT file until the user provides these details or confirms defaults.**

### Step 5: File ADO Work Item

Use `mcp__ado__wit_create_work_item` with:

- **Title**: concise summary
- **Description**: full root cause write-up from Step 3, formatted in HTML for ADO:
  - `<h3>` for section headers
  - `<pre><code>` for code snippets
  - `<ul><li>` for lists
  - Include the proposed fix plan in the description
- **Repro Steps**: steps to reproduce (for Bugs)
- **Priority**: as specified
- **Iteration**: as specified

If the issue has multiple sub-problems, include them as a numbered list in the description.

Report the created work item ID to the user.

### Step 6: Summary

```
Filed: Bug #XXXX — "Title"
Project: Gym Bug | Sprint: <iteration> | Priority: <priority>
Root cause: <one-line summary>
Fix: <one-line summary of proposed changes>
Files affected: <list>
```
