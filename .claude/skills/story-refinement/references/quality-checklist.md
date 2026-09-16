# Story Quality Checklist Reference

Detailed validation criteria for story refinement.

## Complete YAML Schema

Every refined story MUST have these sections:

```yaml
# ═══════════════════════════════════════════════════════════════
# REFINEMENT: {status} | {date}
# ═══════════════════════════════════════════════════════════════

schema_version: "1.0"
type: "user_story"
id: "US-{EPIC}-{NNN}"
parent_feature: "FEAT-{EPIC}-{NN}"
parent_epic: "EPIC-{NAME}-{NNN}"
title: "As a {role}, I want/need {action}, so that {benefit}"

priority: "Must Have"  # Must | Should | Could | Won't
estimation: "3 pts"    # 1, 2, or 3 ONLY

description: >
  Multi-line description explaining the business context,
  what needs to be built, and why it matters.
  Minimum 20 words.

acceptance_criteria:
  - id: "AC-01"
    scenario: "Happy Path - {specific scenario}"
    gherkin: |
      GIVEN {precondition}
      WHEN {action}
      THEN {observable outcome}
      AND {additional outcome if needed}

  - id: "AC-02"
    scenario: "Error Case - {specific error}"
    gherkin: |
      GIVEN {precondition}
      WHEN {invalid action}
      THEN {error handling behavior}

  - id: "AC-03"
    scenario: "Edge Case - {boundary condition}"
    gherkin: |
      GIVEN {edge condition}
      WHEN {action}
      THEN {expected behavior}

technical_notes:
  - "Specific implementation hint 1"
  - "File to modify: path/to/file.cs"
  - "Consider: performance implication"

dependencies:
  requires:
    - id: "US-XXX-001"
      epic: "EPIC-XXX"
      reason: "Why this is a prerequisite"
  blocks:
    - id: "US-YYY-002"
      epic: "EPIC-YYY"
      reason: "What this enables"

# Optional sections (add when applicable):

technical_implementation:
  complexity: "Medium"
  risk: "Low"
  affected_layers:
    - layer: "Domain"
      files: ["Entity.cs"]
  database_changes:
    migrations: true
    seed_data: false
  api_changes:
    new_endpoints: ["/api/v1/resource"]
    breaking_changes: false

ui_ux_review:
  required: true
  scope: "dialog"
  mockup_status: "ascii"

ui_mockup: |
  ASCII mockup here if UI story

nfrs:
  performance: "< 200ms response"
  security: "Requires admin role"
  accessibility: "Keyboard navigable"
```

---

## Estimation Guidelines

### 1 Story Point
- Single file change
- Configuration update
- Copy/text change
- Simple bug fix
- Adding a field to existing form

**Examples:**
- Add validation message
- Update enum value
- Add logging statement

### 2 Story Points
- Single component/service change
- One layer modification (backend OR frontend)
- Simple CRUD operation
- Adding a new column with migration

**Examples:**
- New API endpoint (GET only)
- New Angular component (no service)
- Simple query modification

### 3 Story Points
- Multiple files across one layer
- Moderate complexity logic
- Integration with existing service
- Form with validation

**Examples:**
- CRUD endpoint with validation
- Component with service integration
- Migration with data transformation

### >3 Story Points = MUST SPLIT
- Multiple layers (backend + frontend)
- Complex business logic
- Multiple integration points
- New feature end-to-end

---

## Acceptance Criteria Patterns

### Pattern 1: CRUD Operations
```yaml
# CREATE
- scenario: "Successfully create {entity}"
  gherkin: |
    GIVEN I am an authorized {role}
    AND I have valid {entity} data
    WHEN I submit the create request
    THEN the {entity} is created with correct data
    AND I receive the created {entity} with ID

- scenario: "Create fails with invalid data"
  gherkin: |
    GIVEN I am an authorized {role}
    WHEN I submit with {invalid field}
    THEN validation error is returned
    AND error specifies the invalid field

# READ
- scenario: "Retrieve {entity} by ID"
  gherkin: |
    GIVEN {entity} with ID {X} exists
    WHEN I request {entity} {X}
    THEN I receive the complete {entity} data

- scenario: "Entity not found"
  gherkin: |
    GIVEN {entity} with ID {X} does not exist
    WHEN I request {entity} {X}
    THEN I receive 404 Not Found
```

### Pattern 2: Validation Logic
```yaml
- scenario: "Validation passes"
  gherkin: |
    GIVEN {valid state}
    WHEN I attempt {action}
    THEN validation passes
    AND {action} proceeds

- scenario: "Validation fails - {specific rule}"
  gherkin: |
    GIVEN {invalid state}
    WHEN I attempt {action}
    THEN validation fails
    AND error code is "{SPECIFIC_CODE}"
    AND error message explains the issue
```

### Pattern 3: UI Interactions
```yaml
- scenario: "Form displays correctly"
  gherkin: |
    GIVEN I navigate to {page}
    THEN I see {specific elements}
    AND fields are in {expected state}

- scenario: "Form submission success"
  gherkin: |
    GIVEN I have filled {form} with valid data
    WHEN I click {submit button}
    THEN {success feedback}
    AND {navigation or state change}

- scenario: "Form validation feedback"
  gherkin: |
    GIVEN I have filled {field} with invalid value
    WHEN I blur the field OR submit
    THEN inline error appears
    AND error message is "{specific message}"
```

---

## Dependency Verification Steps

1. **Load Global Tracker**: `docs/requirements/GLOBAL-EXECUTION-TRACKER.yaml`
2. **Check `depends_on` array** for the epic
3. **Check `blocks` array** for downstream impacts
4. **Verify story sequence** in epic's execution-tracker
5. **Cross-reference** any mentioned story IDs exist
6. **Flag circular dependencies**: A→B→A is invalid

---

## Common Refinement Fixes

| Issue | Before | After |
|-------|--------|-------|
| Missing error AC | 2 ACs (happy only) | Add AC for validation failure |
| Vague outcome | "System responds" | "Returns 200 OK with JSON body" |
| Implementation in AC | "Use SQL query" | "Data is retrieved" |
| Missing dependency | No `dependencies` section | Add requires/blocks |
| Over-estimated | 5 pts | Split into 2 + 3 pts stories |
| No role in title | "I want to..." | "As an admin, I want..." |
