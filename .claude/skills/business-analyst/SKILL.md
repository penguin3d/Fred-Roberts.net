---
name: business-analyst
description: Business Analyst skillset for requirements gathering, documentation, process modeling, stakeholder analysis, and project artifacts. Includes automation scripts for repetitive BA tasks like generating user stories, acceptance criteria, requirement traceability matrices, and meeting summaries.
context: docs-as-code 
path: .claude/skills/business-analyst/SKILL.md

---

# Business Analyst Skills

## Overview

This skill provides tools and patterns for Business Analyst work including:
- Requirements elicitation and documentation
- User story generation and refinement
- Process modeling (BPMN concepts)
- Stakeholder analysis
- Traceability matrices
- Meeting facilitation artifacts

## Quick Reference

### Directory Topology (Docs-as-Code)

All detailed requirements are stored in the repository to ensure version control and traceability.

```
docs/
└── requirements/
    └── {feature_name}/              # e.g., guest-checkout
        ├── session_log.yaml         # Source of Truth (Decisions & Constraints)
        ├── execution-tracker.yaml   # Sequenced story execution plan
        ├── IMPLEMENTATION-LOG.md    # Developer progress tracking
        ├── DEVELOPER_HANDOFF.md     # Implementation priorities
        ├── diagrams/                # Visual Artifacts (Mermaid)
        ├── epics/                   # Strategic Level (YAML)
        ├── features/                # Functional Level (YAML)
        └── stories/                 # Atomic Level (YAML)
```

### User Story Format (INVEST Criteria)

```
As a [role/persona]
I want [feature/capability]
So that [business value/benefit]

Acceptance Criteria:
- Given [precondition]
- When [action]
- Then [expected result]
```

### Requirement Types

| Type | Description | Example |
|------|-------------|---------|
| Functional | What the system must do | "System shall calculate tax" |
| Non-Functional | Quality attributes | "Page load < 2 seconds" |
| Business | Business rules/constraints | "Orders > $1000 require approval" |
| Technical | Implementation constraints | "Must use SQL Server" |
| Regulatory | Compliance requirements | "GDPR data retention" |

### MoSCoW Prioritization

| Priority | Meaning | Description |
|----------|---------|-------------|
| **M**ust | Critical | Cannot deliver without this |
| **S**hould | Important | High value, but workarounds exist |
| **C**ould | Desirable | Nice to have if time permits |
| **W**on't | Excluded | Out of scope for this release |

### RACI Matrix

| Role | Description |
|------|-------------|
| **R**esponsible | Does the work |
| **A**ccountable | Final decision maker (only one per task) |
| **C**onsulted | Provides input (two-way communication) |
| **I**nformed | Kept updated (one-way communication) |

## Artifact Schemas (Docs-as-Code)

### Session Log (Source of Truth)
The `session_log.yaml` is the immutable audit trail of all decisions, constraints, and goals.

```yaml
session_meta:
  id: "UUID-v4"
  start_time: "2023-10-27T10:00:00Z"
  participants: []
  feature_scope: "guest-checkout"

event_log:
  - id: 001
    timestamp: "10:00:05Z"
    type: "GOAL_SETTING"
    content: "User defined primary goal."
    status: "CONFIRMED"
```

### Epic Schema (YAML)
Epics define the strategic business value.

```yaml
schema_version: "1.0"
type: "epic"
id: "EPIC-001"
title: "Guest Checkout Workflow"
status: "draft"
description: >
  Allow users to purchase items without creating a permanent account.
business_value:
  - "Reduce cart abandonment by 15%"
links:
  session_log: "../session_log.yaml"
  child_features:
    - "../features/feat_01_email_capture.yaml"
```

### Feature Schema (YAML)
Features group related stories and define system-level constraints.

```yaml
schema_version: "1.0"
type: "feature"
id: "FEAT-01"
parent_epic: "EPIC-001"
title: "Email Capture and Validation"
description: "The mechanism to capture user email."
technical_constraints:
  - "GDPR compliance for data retention"
dependencies:
  - "Marketing API Service"
links:
  stories:
    - "../stories/story_001_input.yaml"
  diagrams:
    - "../diagrams/email_flow.mmd"
```

### User Story Schema (YAML with Gherkin)
The atomic unit of work for developers.

```yaml
schema_version: "1.0"
type: "user_story"
id: "US-001"
parent_feature: "FEAT-01"
title: "As a Guest, I want to enter my email so I can receive a receipt."
priority: "Must Have"
estimation: "3 pts"
acceptance_criteria:
  - id: "AC-01"
    scenario: "Valid Email Format"
    gherkin: |
      GIVEN the user is on the Guest Checkout page
      WHEN they enter "user@example.com"
      THEN the system proceeds to the Shipping step
notes: "Use standard regex for validation."
```

### Execution Tracker
Sequenced execution plan for developers.

```yaml
# execution-tracker.yaml
epic:
  id: "{EPIC-ID}"
features:
  - id: "FEAT-01"
execution_plan:
  - sequence: 1
    id: "US-001"
    status: "pending"
    file: "stories/story_001_xxx.yaml"
metrics:
  progress_percentage: 0
```


## Process Patterns & Brainstorming Modes

### 1. Visual & Structural (Relationships)
- **Mind Mapping (Mermaid)**: Start with a central problem and branch out. Create `.mmd` files.
- **Affinity Diagramming**: Group random ideas into themes/Feature Sets.

### 2. Perspective Shifting
- **Six Thinking Hats**:
  - ⬜ White: Facts
  - 🟥 Red: Feelings
  - ⬛ Black: Risks
  - 🟨 Yellow: Benefits
  - 🟩 Green: Creativity
  - 🟦 Blue: Process
- **Role-Play**: Act as specific personas to uncover hidden needs.

### 3. Problem Solving
- **The 5 Whys**: Iteratively ask "Why?" to find root causes.
- **Reverse Brainstorming**: Ask "How could we make this fail?" to find risks.
- **SCAMPER**: Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse.

### classic Elicitation Techniques
1. **Interviews** - One-on-one stakeholder sessions
2. **Workshops** - Group facilitated sessions (JAD)
3. **Observation** - Watching users perform tasks
4. **Document Analysis** - Reviewing existing documentation
5. **Prototyping** - Visual mockups for feedback

### Requirement Validation Checklist

- [ ] **Complete** - All necessary information included
- [ ] **Consistent** - No conflicts with other requirements
- [ ] **Feasible** - Technically and practically achievable
- [ ] **Necessary** - Traces to business objective
- [ ] **Prioritized** - Has clear priority level
- [ ] **Unambiguous** - Single interpretation possible
- [ ] **Verifiable** - Can be tested/measured
- [ ] **Traceable** - Links to source and tests

## Stakeholder Analysis

### Power/Interest Grid

```
                    Interest
              Low           High
        ┌──────────────┬──────────────┐
  High  │   Keep       │   Manage     │
Power   │   Satisfied  │   Closely    │
        ├──────────────┼──────────────┤
  Low   │   Monitor    │   Keep       │
        │   (Minimal)  │   Informed   │
        └──────────────┴──────────────┘
```

### Stakeholder Register Fields

- Name / Role
- Department / Organization
- Contact Information
- Influence Level (H/M/L)
- Interest Level (H/M/L)
- Expectations
- Communication Preferences
- Potential Concerns
- Engagement Strategy

## Prioritization & Backlog Management

This section provides frameworks and tools for prioritizing user stories and managing backlogs effectively.

### 1. Framework Selection
Select the framework based on the project phase and data availability.

#### MoSCoW (Must, Should, Could, Won't)
*   **Best for:** Release planning and fixed deadlines.
*   **Must:** Non-negotiable needs (legal, safety, core utility). *If missing, product fails.*
*   **Should:** Important but not vital; can be fulfilled by a workaround.
*   **Could:** Desirable but less important; "nice to have".
*   **Won't:** Agreed not to implement *this time*.

#### RICE (Reach, Impact, Confidence, Effort)
*   **Best for:** Quantitative comparison in mature products.
*   **Formula:** $(Reach \times Impact \times Confidence) / Effort$
*   **Usage:** Requires estimating Story Points (Effort) and Business Value/Users affected (Impact/Reach).

#### WSJF (Weighted Shortest Job First)
*   **Best for:** SAFe/Agile flow optimization.
*   **Formula:** $Cost of Delay / Job Duration$
*   **Focus:** Do high-value, low-effort items first to maximize ROI.

#### Kano Model
*   **Best for:** Customer satisfaction strategy.
*   **Categories:** Basic Needs (Musts), Performance (Linear), Delighters (Exciters).

### 2. Dependency Mapping
Identify links between stories to create a valid execution sequence.
*   **Functional:** Logic dependency (e.g., "Checkout" needs "Cart").
*   **Technical:** Architecture dependency (e.g., "API" needs "DB Schema").
*   **Rule:** Dependencies must be scheduled *before* dependents.

### 3. Automated Prioritization Tool
Use the included Python script to scan user stories and generate a prioritized backlog based on keyword heuristics.

**Script Location:** `.claude/skills/story-prioritization/scripts/prioritize_stories.py`

**Usage (Docs-as-Code):**
```bash
python .claude/skills/story-prioritization/scripts/prioritize_stories.py docs/requirements/{feature_name}/stories/
```
*   **Logic:** Tier 1 (Infrastructure) > Tier 2 (Backend) > Tier 3 (Features) > Tier 4 (UI)
*   **Output:** Generates `prioritized_backlog.md` with a copy-pasteable YAML snippet for `execution-tracker.yaml`.

## Scripts Available

See `scripts/` folder for automation tools:

| Script | Purpose | Output |
|--------|---------|--------|
| `New-UserStory.ps1` | Generate user stories from brief descriptions | YAML |
| `New-Epic.ps1` | Generate epic with guidelines and requirements | Markdown |
| `New-AcceptanceCriteria.ps1` | Generate Gherkin-style acceptance criteria | YAML |
| `New-BRD.ps1` | Generate Business Requirements Document | Markdown |
| `New-StakeholderRegister.ps1` | Generate stakeholder analysis document | Markdown |
| `New-MeetingMinutes.ps1` | Structure meeting notes and action items | Markdown |
| `New-UseCaseDescription.ps1` | Generate use case descriptions (BABOK) | Markdown |
| `prioritize_stories.py` | Auto-prioritize stories based on keywords (Python) | Markdown + YAML |

## Best Practices & Facilitation

### Writing Good Requirements
1. Use active voice ("System shall..." not "It should be...")
2. One requirement per statement
3. Avoid ambiguous words (some, several, etc.)
4. Include measurable criteria
5. Specify what, not how

### User Story Guidelines
1. Keep stories small (fits in one sprint)
2. Focus on user value
3. Include acceptance criteria upfront (Gherkin preferred)
4. Avoid technical implementation details
5. Use persona names for clarity

### Agentic Facilitation Rules
1. **Define "How Might We"**: Start sessions with a clear problem statement, not a vague topic.
2. **Timebox Everything**: Use strict timers (e.g., "5-Minute Sprint") to force creativity.
3. **Defer Judgment**: No criticism during ideation. Validate feasibility later.
4. **Use a Parking Lot**: Move off-topic ideas to a "Parking Lot" list to maintain focus.
5. **Engage Silent Majority**: Use "Silent Writing" so quiet voices are heard.
6. **"Yes, and..."**: Build on ideas instead of blocking them.
7. **Immediate Validation**: Paraphrase and confirm understanding instantly ("So: speed > accuracy?").
8. **Make it Visual**: Create diagrams immediately when processes are described.
