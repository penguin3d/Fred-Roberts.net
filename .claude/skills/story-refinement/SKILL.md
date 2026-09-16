---
name: story-refinement
description: >
  Refines existing YAML user stories to production-ready quality. Use when: 
  (1) User asks to "refine", "review", or "improve" a story, 
  (2) Story needs completeness validation before development, 
  (3) Story estimation seems off (>3 SP needs splitting), 
  (4) Acceptance criteria gaps need identification,
  (5) Cross-epic dependency analysis is needed.
  Reads from Global/Epic trackers, focuses on individual stories, enriches with full details.
---

# Respond
Always acknowledge: "Activating Story Refinement Skill."

# Story Refinement Skill

Refine existing YAML user stories to development-ready quality by validating completeness, enriching details, checking sizing, and identifying dependencies.

## 🔴 CRITICAL: Global Tracker Awareness

Before refining ANY story, you MUST understand the project landscape.

**Always read first:**
1. `docs/requirements/GLOBAL-EXECUTION-TRACKER.yaml` - Cross-epic view, dependencies, priorities
2. `docs/requirements/{epic}/execution-tracker.yaml` - Story sequence within the epic

**Why this matters:**
- Dependencies must reference real story IDs from the tracker
- Priority alignment with epic priority
- Sequence validation (story N shouldn't depend on story N+1)
- Cross-epic impact analysis

## 🎯 Core Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. READ Global Tracker → Understand epic landscape             │
│  2. READ Epic Tracker → Get story context and sequence          │
│  3. LOAD target story YAML from editor/selection                │
│  4. ANALYZE using quality checklist                             │
│  5. ENRICH with missing details (ACs, tech notes, deps)         │
│  6. SPLIT if >3 SP → Propose child stories                      │
│  7. UPDATE story file directly with improvements                │
│  8. FLAG UI/UX work for designer agent review                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Quality Checklist (Definition of Ready)

Run ALL checks. Output: ✅ Pass | ⚠️ Warning | ❌ Fail

### 1. Completeness Checks
| Check | Criteria |
|-------|----------|
| `schema_version` | Must be "1.0" |
| `id` | Must match pattern `US-{EPIC}-{NNN}` |
| `parent_feature` | Must exist and match epic tracker |
| `parent_epic` | Must exist and match global tracker |
| `title` | Must follow "As a {role}, I want/need {action}" format |
| `priority` | Must be: Must Have, Should Have, Could Have, Won't Have |
| `estimation` | Must be: 1, 2, or 3 pts (if >3, flag for splitting) |
| `description` | Must be non-empty, >20 words |

### 2. INVEST Validation
| Principle | Question | Action if Fail |
|-----------|----------|----------------|
| **I**ndependent | Can this story be deployed alone? | Flag blockers, suggest reordering |
| **N**egotiable | Is scope flexible or over-specified? | Flag implementation details in ACs |
| **V**aluable | Does it deliver user/business value? | Suggest value statement |
| **E**stimable | Is it clear enough to estimate? | Add technical_notes |
| **S**mall | Is it ≤3 story points? | **SPLIT into child stories** |
| **T**estable | Are ACs specific and verifiable? | Add missing ACs |

### 3. Acceptance Criteria Coverage
**Minimum 3 ACs required:**
| Type | Required | Purpose |
|------|----------|---------|
| Happy Path | ✅ Yes | Primary success scenario |
| Error/Edge Case | ✅ Yes | At least one failure scenario |
| Boundary/Variation | ✅ Yes | Edge cases, data variations |

**AC Quality Checks:**
- Gherkin format: GIVEN/WHEN/THEN structure
- No implementation details (HOW vs WHAT)
- Specific, measurable outcomes
- No vague terms ("fast", "user-friendly", "etc.")

### 4. Sizing Sanity Check
| Points | Scope | Action |
|--------|-------|--------|
| 1 pt | Trivial: config change, copy update | Verify not under-estimated |
| 2 pts | Small: single component, one layer | Standard |
| 3 pts | Medium: multiple files, some complexity | Maximum allowed |
| >3 pts | **TOO LARGE** | **MUST SPLIT** |

---

## 🔀 Story Splitting Rules

When `estimation > 3 pts`, apply these strategies:

### Splitting Strategies (The "Hamburger Method")

1. **By Workflow Step**
   - Example: "User Login" → "Enter Credentials" + "2FA Verification"

2. **By Business Rule**
   - Example: "Calculate Tax" → "Standard Tax" + "Tax Exemptions"

3. **By Data Variation**
   - Example: "Form Validation" → "Valid Input" + "Error Handling"

4. **By Layer (Last Resort)**
   - Example: "Feature X" → "Backend API" + "Frontend UI"
   - ⚠️ Only if layers are truly independent

### Split Output Format
```yaml
split_recommendation:
  reason: "Story exceeds 3 SP (estimated 5 SP)"
  strategy: "By Workflow Step"
  proposed_stories:
    - id: "US-XXX-001a"
      title: "{First part}"
      estimation: "2 pts"
      acceptance_criteria: [...]
    - id: "US-XXX-001b"  
      title: "{Second part}"
      estimation: "2 pts"
      acceptance_criteria: [...]
```

---

## 🔗 Dependency Analysis

### Required Checks
1. **Intra-Epic Dependencies**: Stories within same epic
2. **Cross-Epic Dependencies**: Stories in other epics (from Global Tracker)
3. **Circular Dependency Detection**: Flag if A→B→A

### Dependency Schema
```yaml
dependencies:
  requires:
    - id: "US-XXX-001"
      epic: "EPIC-XXX"
      reason: "Specific reason why this is a blocker"
  blocks:
    - id: "US-YYY-002"
      epic: "EPIC-YYY"  
      reason: "What this story enables"
```

### Sources for Dependency Analysis
- `docs/requirements/GLOBAL-EXECUTION-TRACKER.yaml` - Cross-epic view
- `docs/requirements/{feature}/execution-tracker.yaml` - Epic-specific sequence
- `docs/requirements/epic-relation.bpmn` - Visual dependency map

---

## 🎨 UI/UX Flagging

When story involves user interface work, add:

```yaml
ui_ux_review:
  required: true
  scope: "form | dialog | page | component"
  designer_notes:
    - "Consider mobile responsiveness"
    - "Accessibility: keyboard navigation needed"
    - "Match existing design patterns in {reference}"
  mockup_status: "none | ascii | figma | prototype"
```

**Do NOT design the UI** - flag for UI/UX Designer agent review.

---

## 📝 Technical Implementation Section

Enrich with implementation hints (populated by refinement or Tech Lead):

```yaml
technical_implementation:
  complexity: "Low | Medium | High"
  risk: "Low | Medium | High"
  affected_layers:
    - layer: "Domain"
      files: ["Entity.cs"]
    - layer: "Application"  
      files: ["Command.cs", "Handler.cs"]
    - layer: "API"
      files: ["Controller.cs"]
    - layer: "Frontend"
      files: ["component.ts", "service.ts"]
  database_changes:
    migrations: true
    seed_data: false
    breaking_changes: false
  api_changes:
    new_endpoints: []
    modified_endpoints: []
    breaking_changes: false
  nfrs:  # Add when makes sense
    performance: "Query must return < 200ms"
    security: "Admin-only endpoint"
    accessibility: null  # or specific requirement
```

---

## 🔄 Refinement Output

After analysis, update the story file with:

1. **Validation Report** (as YAML comment at top)
```yaml
# ═══════════════════════════════════════════════════════════════
# REFINEMENT REPORT - {date}
# ═══════════════════════════════════════════════════════════════
# ✅ Completeness: PASS
# ✅ INVEST: PASS  
# ⚠️ ACs: Added 1 edge case (AC-04)
# ✅ Sizing: 3 pts - OK
# ✅ Dependencies: Verified against global tracker
# 🎨 UI/UX: Flagged for designer review
# ═══════════════════════════════════════════════════════════════
```

2. **Enriched Content** - Add missing sections directly to YAML
3. **Split Recommendation** - If >3 SP, add `split_recommendation` section

---

## 📂 File Operations

### Read Sequence
1. `docs/requirements/GLOBAL-EXECUTION-TRACKER.yaml`
2. `docs/requirements/{feature}/execution-tracker.yaml`
3. Target story file (from editor or specified path)

### Write Operations
- Update story file directly with improvements
- Never create new files unless splitting (then create child story files)
- Log refinement action to `session_log.yaml` if exists

---

## ⚠️ Ambiguity Detection

Flag these vague terms and request clarification:
- "fast", "quickly", "responsive" → Specify latency (e.g., "< 200ms")
- "user-friendly", "intuitive" → Specify behavior
- "etc.", "and so on" → Enumerate all cases
- "should", "might", "could" → Use "must" or remove
- "appropriate", "suitable" → Define criteria

---

## 🚫 Anti-Patterns to Fix

| Anti-Pattern | Fix |
|--------------|-----|
| Technical story ("Refactor X") | Reframe as user value |
| Multiple actions in one story | Split into separate stories |
| ACs describe implementation | Rewrite as behavior |
| Missing error scenarios | Add error/edge case ACs |
| Vague acceptance criteria | Add specific, measurable outcomes |
| No dependencies listed | Analyze and add from trackers |
