---
name: get-ticket
description: Get a work item (Bug or User Story) from Azure DevOps, analyze it, investigate the codebase, and propose a fix/approach
---

# Get Ticket

Work item ID: $ARGUMENTS

## Workflow

### 1. Fetch
- `mcp__ado__wit_get_work_item` — get the work item (note type: Bug or User Story).
- `mcp__ado__wit_list_work_item_comments` — read ALL comments; they often contain repro details, environment info, and prior investigation notes.
- Only if the description seems incomplete: `mcp__ado__wit_list_work_item_revisions`.

### 2. Summarize (brief)
One compact block: `#<id> <title>` — type, state, priority, assignee, then the description/repro steps and key facts from comments as short bullets. No boilerplate sections that would be empty.

### 3. Investigate immediately
Do NOT ask clarifying questions if the ticket is understandable — go straight to code. Ask only if genuinely blocked (contradictory info, no way to determine the feature area, or multiple materially different interpretations).

Always search **both** `backend/` and `gym-bug-workspace/projects/web-app/` (per CLAUDE.md).

**Bug** — trace the repro flow (component → service → endpoint → handler → query), find the root cause. Check known patterns: date/timezone (`DateTime` on calendar dates is the prime suspect), week-start calculations, missing filters, null handling. For regressions, check `git log` on the affected files.

**User Story** — map existing code in both layers, identify reuse opportunities and affected entities, note the patterns the implementation must follow.

### 4. Report findings + one question
Present concisely:
- **Affected code:** file:line references (frontend + backend)
- **Root cause / approach:** what's wrong or what needs to be built
- **Proposed fix:** high-level change description

Then ask exactly one question: **"Proceed with the fix/implementation?"**

### 5. On approval
Before writing code: move the ticket to "In Progress" (`mcp__ado__wit_update_work_item`) and add a comment (`mcp__ado__wit_add_work_item_comment`) summarizing the root cause and planned approach. Then implement.
