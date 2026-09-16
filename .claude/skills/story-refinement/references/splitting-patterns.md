# Story Splitting Patterns

Detailed strategies for breaking down large stories (>3 SP).

## Decision Tree: How to Split

```
                    Is story > 3 SP?
                          │
                         YES
                          │
          ┌───────────────┴───────────────┐
          │                               │
    Has multiple          Has multiple
    workflow steps?       business rules?
          │                               │
         YES                             YES
          │                               │
    Split by STEP              Split by RULE
    ───────────────           ───────────────
    e.g., Login flow          e.g., Tax calc
    Step 1: Credentials       Rule 1: Standard
    Step 2: 2FA               Rule 2: Exempt
          │                               │
          └───────────────┬───────────────┘
                          │
                         NO to both?
                          │
          ┌───────────────┴───────────────┐
          │                               │
    Has multiple          Single complex
    data variations?      component?
          │                               │
         YES                             YES
          │                               │
    Split by DATA           Split by LAYER
    ───────────────        (last resort)
    e.g., Validation       ───────────────
    Case 1: Valid          Layer 1: Backend
    Case 2: Errors         Layer 2: Frontend
```

---

## Strategy 1: Split by Workflow Step

**When to use:** Story covers a multi-step user journey.

### Example: User Registration
**Original (5 pts):**
```yaml
title: "As a visitor, I want to register for an account"
```

**Split:**
```yaml
# Story A (2 pts)
title: "As a visitor, I want to enter my registration details"
acceptance_criteria:
  - "Registration form displays"
  - "Validation on required fields"
  - "Data submitted to backend"

# Story B (2 pts)  
title: "As a visitor, I want to verify my email"
acceptance_criteria:
  - "Verification email sent"
  - "Clicking link verifies account"
  - "Account activated after verification"

# Story C (1 pt)
title: "As a verified user, I want to complete my profile"
acceptance_criteria:
  - "Profile completion form shown"
  - "Optional fields saved"
```

---

## Strategy 2: Split by Business Rule

**When to use:** Story implements multiple business rules or variations.

### Example: Payment Processing
**Original (5 pts):**
```yaml
title: "As a member, I want to pay for my membership"
```

**Split:**
```yaml
# Story A (2 pts)
title: "As a member, I want to pay with credit card"
acceptance_criteria:
  - "Card form displays"
  - "Stripe integration processes payment"
  - "Receipt generated"

# Story B (2 pts)
title: "As a member, I want to pay with bank transfer"
acceptance_criteria:
  - "Bank details displayed"
  - "Reference number generated"
  - "Pending payment tracked"

# Story C (1 pt)
title: "As a member, I want payment failure handling"
acceptance_criteria:
  - "Declined card shows error"
  - "Retry option available"
  - "Support contact shown"
```

---

## Strategy 3: Split by Data Variation

**When to use:** Story handles different data states or edge cases.

### Example: Form Validation
**Original (4 pts):**
```yaml
title: "As an admin, I want to validate plan configuration"
```

**Split:**
```yaml
# Story A (2 pts)
title: "As an admin, I want basic plan validation (happy path)"
acceptance_criteria:
  - "Valid plan saves successfully"
  - "All required fields checked"
  - "Success message shown"

# Story B (2 pts)
title: "As an admin, I want plan validation error handling"
acceptance_criteria:
  - "Missing fields highlighted"
  - "Invalid values show specific errors"
  - "Duplicate name prevented"
```

---

## Strategy 4: Split by Platform/Channel

**When to use:** Story covers multiple platforms (web, mobile, TV).

### Example: Notifications
**Original (5 pts):**
```yaml
title: "As a member, I want to receive class reminders"
```

**Split:**
```yaml
# Story A (2 pts)
title: "As a member, I want email class reminders"

# Story B (2 pts)
title: "As a member, I want push notification reminders"

# Story C (1 pt)
title: "As a member, I want SMS reminders (opt-in)"
```

---

## Strategy 5: Split by Layer (LAST RESORT)

**When to use:** Only when layers are truly independent and other strategies don't apply.

⚠️ **Warning:** This often creates dependencies and reduces value delivery.

### Example: New Feature
**Original (6 pts):**
```yaml
title: "As an admin, I want to manage weekly limits"
```

**Split:**
```yaml
# Story A (3 pts) - Backend
title: "As a developer, I need weekly limit API endpoints"
acceptance_criteria:
  - "GET /api/weekly-limits/{id}"
  - "PUT /api/weekly-limits/{id}"
  - "Validation logic implemented"

# Story B (3 pts) - Frontend
title: "As an admin, I want weekly limit UI"
dependencies:
  requires:
    - id: "Story A"
      reason: "API must exist for UI to call"
```

---

## Split Quality Checks

After splitting, verify:

| Check | Criteria |
|-------|----------|
| **Each story ≤ 3 pts** | No story exceeds limit |
| **Each delivers value** | Not just "setup" stories |
| **Each is testable** | Has own acceptance criteria |
| **Dependencies explicit** | Later stories reference earlier |
| **No circular deps** | A→B→A is invalid |
| **Sum ≈ Original** | Total points similar (may be slightly higher due to overhead) |

---

## Split Proposal Template

Add to story YAML when recommending split:

```yaml
split_recommendation:
  original_estimation: "5 pts"
  reason: "Story covers both backend API and frontend UI"
  strategy: "By Layer"
  total_after_split: "6 pts"
  
  proposed_stories:
    - id: "US-XXX-001a"
      title: "As a developer, I need {backend part}"
      estimation: "3 pts"
      key_acs:
        - "API endpoint implemented"
        - "Validation logic complete"
      
    - id: "US-XXX-001b"
      title: "As an admin, I want {frontend part}"
      estimation: "3 pts"
      depends_on: "US-XXX-001a"
      key_acs:
        - "UI component created"
        - "Integrated with API"
```

---

## When NOT to Split

Don't split if:
- Story is already ≤3 pts
- Splitting creates artificial dependencies
- Split stories can't be deployed independently
- Overhead of coordination exceeds benefit
- Story is truly atomic (can't be broken down meaningfully)

Instead, consider:
- Re-estimating with the team
- Reducing scope (defer edge cases)
- Accepting a 4-5 pt story as exception (document why)
