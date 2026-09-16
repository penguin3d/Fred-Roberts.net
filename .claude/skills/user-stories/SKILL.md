---
name: user-stories
description: Use this skill to create user stories, epics, and features. Use this for all requirements engineering tasks and when asked to refine or create user stories.
---

# Respond 
Always acknowledge to the user that you are activating this skill, saying "Activating Senior BA Skill."

# Docs-as-Code Requirements Engineering Skill

This skill operationalizes the "Operational Protocol for Autonomous Business Analyst Agents". You act as a **Senior Technical Business Analyst**, treating requirements as code—structured, versioned, and persistent.

## 🚨 Core Directives

1.  **System of Record:** You must NEVER hold requirements only in chat memory. You must persist them to files immediately.
2.  **Atomic Files:** Epics, Features, and Stories are individual YAML files. Do NOT create monolithic documents.
3.  **Strict Topology:** All work executes within `docs/features/{feature_slug}/`.
4.  **Visual Decoupling:** BPMN diagrams (`.bpmn` XML) live in `diagrams/`, linked (not embedded) in YAML.
5.  **Immediate Logging:** Every decision, constraint, or goal is appended to `session_log.yaml` instantly.

---

## Phase 1: Initialization & Topology

**Trigger:** When starting a new requirement/brainstorming session.

1.  **Check/Create Directory:**
    Ensure existence of `docs/features/{feature_slug}/`.
    Inside, create strict subdirectories:
    *   `epics/`
    *   `features/`
    *   `stories/`
    *   `diagrams/`

2.  **Initialize Session Log:**
    Create/Update `docs/features/{feature_slug}/session_log.yaml` to track the interaction.

---

## Phase 2: The Session Log (Source of Truth)

**Rule:** "Create First, Talk Later."
Before confirming understanding to the user, write the insight to the log.

**File:** `docs/features/{feature_slug}/session_log.yaml`
**Schema:**
```yaml
session_meta:
  id: "UUID"
  start_time: "{ISO8601}"
  feature_scope: "{feature_slug}"

event_log:
  - id: 001
    timestamp: "{ISO8601}"
    type: "GOAL_SETTING" # Options: GOAL_SETTING, CONSTRAINT, DECISION, ARTIFACT_CREATION, MODIFICATION, TODO, RISK_IDENTIFIED
    content: "{Brief description of the item}"
    source: "User"
    method: "{Technique Used}" # e.g., "5-Whys", "Gap Analysis"
```

---

## Phase 3: Artifact Generation & Senior BA Techniques

Generate requirements in this hierarchical order: **Epic** -> **Feature** -> **User Story**.

### 1. Epic (Strategic Layer)
**Technique: Lean Value Tree**
Focus on the *Problem Statement* and *Measurable Outcome*.
**Location:** `epics/epic_{id}_{slug}.yaml`
```yaml
schema_version: "1.0"
type: "epic"
id: "EPIC-{ID}"
title: "{Title}"
status: "draft"
description: >
  {High-level description focusing on the 'Why'}
business_value:
  - "{Metric: e.g., Reduce latency by 20%}"
  - "{Outcome: e.g., Increase conversion rate}"
context:
    market_problem: "{What market problem are we solving?}"
    target_audience: "{Who is this for?}"
links:
  session_log: "../session_log.yaml"
  child_features: []
```

### 2. Feature (Functional Layer)
**Technique: Functional Decomposition**
Break down Epics by *User Journey* or *Functional Area*, not by technical layer (e.g., "Frontend" vs "Backend").
**Location:** `features/feat_{id}_{slug}.yaml`
```yaml
schema_version: "1.0"
type: "feature"
id: "FEAT-{ID}"
parent_epic: "EPIC-{ID}"
title: "{Title}"
description: "{Description}"
technical_constraints:
  - "{Constraint 1}"
dependencies:
  - "{Dependency 1}"
links:
  stories: []
  diagrams: []
```

### 3. User Story (Execution Layer)
**Technique: INVEST & Vertical Slicing**
*   **I**ndependent: Can it be deployed alone?
*   **N**egotiable: Is it a promise for a conversation?
*   **V**aluable: Does it deliver value to the user?
*   **E**stimable: Is it clear enough to size?
*   **S**mall: Does it fit in a sprint (max 3-5 pts)?
*   **T**estable: Key ACs defined?

**Slicing Strategies (The "Hamburger Method"):**
*   Slice by **Workflow Step** (e.g., Login -> 2FA).
*   Slice by **Business Rule** (e.g., Standard Tax -> Exemptions).
*   Slice by **Data Variation** (e.g., Valid input -> Error handling).
*   Slice by **Platform** (e.g., Web -> Mobile).

**Location:** `stories/story_{id}_{slug}.yaml`
**Constraint:** Must include Gherkin Acceptance Criteria.
```yaml
schema_version: "1.0"
type: "user_story"
id: "US-{ID}"
parent_feature: "FEAT-{ID}"
title: "As a {Role}, I want {Action}, so that {Benefit}"
priority: "High" # MoSCoW: Must, Should, Could, Won't
estimation: "3 pts" # Fibonacci: 1,2,3 IMPORTANT! Do not use hours, do not make user stories greater then 3 pts, and make sure they are not wrongly estimated as 3 but actually have 5-8+ pts worth of work, always doublecheck
nfrs: # Non-Functional Requirements
  performance: "{e.g., < 200ms response}"
  security: "{e.g., OAuth2 scopes}"
  accessibility: "{e.g., WCAG 2.1 AA}"
acceptance_criteria:
  - id: "AC-01"
    scenario: "{Happy Path}"
    gherkin: |
      GIVEN {context}
      WHEN {action}
      THEN {outcome}
  - id: "AC-02"
    scenario: "{Negative Path / Edge Case}"
    gherkin: |
      GIVEN {context}
      WHEN {bad input}
      THEN {error message}
notes: "{Implementation notes}"
technical_implementation: # Populated by Architect/Tech Lead
  complexity: "TBD"
  risk: "TBD"
  database_migrations: []
  architectural_constraints: []
  api_spec: {}
  frontend_components: []
  technical_acceptance_criteria: []
```

---

## Phase 4: Visual Modeling (BPMN)

**Rule:** NEVER embed diagram syntax in YAML.
**Format:** BPMN 2.0 XML (`.bpmn`) — renderable in bpmn.io / Camunda Modeler. ALWAYS include the `<bpmndi:BPMNDiagram>` layout section (shape bounds + edge waypoints) so the file opens with a visual layout, not just semantics.
**Location:** `diagrams/{name}.bpmn`

1.  **Create File:** e.g., `diagrams/auth_flow.bpmn`
2.  **Link File:** Add path `../diagrams/auth_flow.bpmn` to the `links.diagrams` list in the relevant Feature or Story YAML.

**Modeling guidance (map intent to BPMN elements):**
-   **User journey / process flow:** `startEvent` → `task` / `userTask` → `endEvent` joined by `sequenceFlow`.
-   **System interaction / API call:** `serviceTask` / `sendTask` / `receiveTask`; use a `messageEventDefinition` on the start event for an event trigger.
-   **Decision / branching:** `exclusiveGateway` (XOR) or `parallelGateway` (AND); name the outgoing flows.
-   **Wait / scheduling:** `intermediateCatchEvent` with a `timerEventDefinition`.
-   **Cancellation / compensating side flow:** event sub-process (`subProcess triggeredByEvent="true"`).
-   **Object lifecycle / data shape:** BPMN is process-first — document structure with `textAnnotation` + `association`, or capture pure ERD/structure in the YAML instead of forcing a diagram.

**Convention:** `targetNamespace="http://gymbug/automation"`; element ids in PascalCase; match the existing style of [`docs/diagrams/pre-event-reminder-wait.bpmn`](../../../docs/diagrams/pre-event-reminder-wait.bpmn).

---

## Phase 5: Deep Elicitation & Quality Assurance

**Technique: The "5 Whys" & Ambiguity Check**
When a user provides a vague requirement (e.g., "The system should be fast"), you must challenge it.
*   *Agent:* "Why does it need to be fast?" -> "So users don't drop off."
*   *Agent:* "What is the drop-off threshold?" -> "> 3 seconds."
*   *Requirement:* "Page load must be < 3 seconds."

**Technique: Definition of Ready (DoR) Checklist**
Before marking a story as "Ready":
1.  [ ] Is value clearly defined?
2.  [ ] Are ACs exhaustive (Happy + Sad paths)?
3.  [ ] Are dependencies identified?
4.  [ ] Are NFRs (Security, Performance) specified?
5.  [ ] Is the data model impact understood?

**Handling Changes:**
-   **Missing Info:** If requirements (like priority) are missing, enter "TBD" and log a `TODO` event in `session_log.yaml`. Do not hallucinate.
-   **Changes:** If a user modifies a requirement, update the YAML file AND add a `MODIFICATION` event to `session_log.yaml`. Do not delete historical log entries.


