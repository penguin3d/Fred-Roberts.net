---
name: qa-automation
description: QA testing patterns with Playwright. Use when testing user stories, creating automated tests, deciding manual vs. automated, exploratory testing, bug reports, or regression suites.
---

# QA Automation Skill - Playwright Testing & Test Strategy

## Overview

This skill provides best practices and patterns for Quality Assurance testing using Playwright for browser automation. It covers test strategy, automation decision-making, manual testing workflows, and comprehensive bug reporting.

## When to Use This Skill

Use this skill when:
- Testing user stories against acceptance criteria
- Creating automated browser tests with Playwright
- Deciding between automated vs. manual testing approaches
- Performing exploratory testing
- Creating bug reports
- Running regression test suites
- Validating UI/UX implementations

## Specs first — driving a live browser is a fallback

**Default to a committed `.spec.ts` run by `npx playwright test`.** Driving a browser
interactively — through the `playwright` MCP or any other live session — is a diagnostic tool,
not a way to verify anything.

The reasons compound:

| | live driving | committed spec |
|---|---|---|
| Runs again tomorrow | no | yes, in CI, forever |
| Regression value | none | the entire point |
| Determinism | re-decided each step | identical every run |
| Speed | serial, seconds per action | parallel, headless |
| Context cost | every snapshot is an a11y tree in the transcript | a file on disk |

**If a test can cover it, a test covers it.** Live driving is warranted for exactly three things:

1. **Resolving a locator** you could not derive, *after* a semantic locator missed.
2. **Diagnosing a failure** whose cause the trace does not show.
3. **A genuinely unknown UI surface**, when reading the routes did not settle where a flow lives.

One page, one question, then back to the spec. Driving a whole flow by hand means the spec should
have been written instead.

Prefer Playwright's own tooling over a live session wherever it fits — same information, no
context cost, faster:

```bash
npx playwright test --ui        # time-travel debugging + selector picker
npx playwright test --trace on  # per-step DOM snapshots, openable after a CI failure
npx playwright codegen <url>    # record interactions directly into a spec
```

> Full-stack sweeps across DB + API + UI (the `mcp-e2e-test` and `test-feature` skills) are a
> different job with a different trade-off, and this preference does not override them. It governs
> UI verification, where a spec is the artefact worth keeping.

## Core Principles

### 1. Test Strategy First, Automation Second

**Never automate blindly.** Always evaluate if automation makes sense:

```
Automation Decision Matrix:
┌─────────────────┬──────────────────┬───────────────────┐
│ Factor          │ Automate ✅      │ Manual Test 🔍    │
├─────────────────┼──────────────────┼───────────────────┤
│ Stability       │ Feature finalized│ Under development │
│ Repeatability   │ Runs frequently  │ One-time check    │
│ Complexity      │ Simple UI flows  │ Visual validation │
│ ROI             │ High reuse value │ Quick one-off     │
│ Criticality     │ Core business    │ Edge cases        │
│ Determinism     │ Predictable      │ Flaky/timing      │
└─────────────────┴──────────────────┴───────────────────┘
```

### 2. Acceptance Criteria are Sacred

Every test must map directly to acceptance criteria from the User Story. Never test undocumented behavior.

**User Story → Test Cases mapping:**

```yaml
# User Story Acceptance Criteria (Given/When/Then)
acceptance_criteria:
  - scenario: "Admin creates new config"
    given: "I am logged in as admin"
    when: "I submit valid config data"
    then:
      - "Config is saved to database"
      - "Success message is displayed"
      - "Audit log entry is created"

# Converts to Test Cases:
test_cases:
  - id: "TC-001"
    description: "Verify admin can login"
    type: "precondition"
    
  - id: "TC-002"
    description: "Verify config creation with valid data"
    type: "automated"
    acceptance_criteria: "AC1"
    
  - id: "TC-003"
    description: "Verify database persistence"
    type: "manual"  # Requires database inspection
    acceptance_criteria: "AC1"
    
  - id: "TC-004"
    description: "Verify success message display"
    type: "automated"
    acceptance_criteria: "AC1"
    
  - id: "TC-005"
    description: "Verify audit log creation"
    type: "manual"  # Requires database inspection
    acceptance_criteria: "AC1"
```

### 3. Test Pyramid Strategy

Follow the test pyramid for efficient testing:

```
       /\         E2E Tests (Playwright)
      /  \        ↳ Slow, expensive, brittle
     /────\       ↳ Critical user journeys only
    /      \      ↳ 10% of tests
   /────────\     
  /          \    Integration Tests
 /────────────\   ↳ API contracts, service interactions
/              \  ↳ 30% of tests
/────────────────\
    Unit Tests    
    ↳ Fast, reliable
    ↳ Business logic, utilities
    ↳ 60% of tests
```

**DO NOT automate everything with Playwright.** E2E tests are expensive.

---

## Playwright Best Practices

### 1. Selector Strategy

**Use data-testid attributes for stability:**

```typescript
// ✅ BEST: Semantic test IDs
await page.click('[data-testid="submit-button"]');
await page.fill('[data-testid="email-input"]', 'user@example.com');
await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

// ✅ GOOD: Role-based selectors (accessibility)
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Email address').fill('user@example.com');

// ⚠️ OK: Text selectors (use for static content)
await page.click('text=Submit');

// ❌ BAD: Fragile CSS selectors
await page.click('.btn.btn-primary.submit-btn');
await page.fill('input[type="email"]', 'user@example.com');

// ❌ VERY BAD: XPath selectors (breaks easily)
await page.click('//div[@class="form"]//button[1]');
```

**Recommendation for developers:** Add `data-testid` attributes to all interactive elements:

```html
<!-- ✅ Good: Testable Angular component -->
<button 
  data-testid="submit-config-button"
  (click)="onSubmit()"
  [disabled]="!form.valid">
  Save Configuration
</button>

<input 
  data-testid="config-key-input"
  formControlName="configKey"
  type="text"
  placeholder="Config Key">

<div data-testid="success-message" *ngIf="showSuccess" class="alert alert-success">
  Configuration saved successfully
</div>
```

### 2. Waiting Strategies

**Never use hard-coded waits.** Use smart waiting:

```typescript
// ✅ BEST: Wait for network idle
await page.goto('http://localhost:4200/dashboard');
await page.waitForLoadState('networkidle');

// ✅ GOOD: Wait for specific element
await page.waitForSelector('[data-testid="dashboard-loaded"]');

// ✅ GOOD: Wait for API response
await page.waitForResponse(resp => 
  resp.url().includes('/api/configs') && resp.status() === 200
);

// ✅ GOOD: Auto-waiting with assertions
await expect(page.locator('[data-testid="success-message"]'))
  .toBeVisible({ timeout: 5000 });

// ⚠️ OK: Wait for timeout (only for animations)
await page.waitForTimeout(300); // Wait for CSS transition

// ❌ BAD: Arbitrary waits (flaky tests)
await page.waitForTimeout(5000); // Why 5 seconds?
```

### 3. Test Structure (AAA Pattern)

**Arrange-Act-Assert** pattern for clarity:

```typescript
test('AC1: Admin can create config with valid data', async ({ page }) => {
  // ─────────────────────────────────────────
  // ARRANGE: Set up test conditions
  // ─────────────────────────────────────────
  // Login as admin
  await page.goto('http://localhost:4200/login');
  await page.fill('[data-testid="email"]', 'admin@test.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL(/dashboard/);
  
  // Navigate to config creation page
  await page.goto('http://localhost:4200/admin/system-config/create');
  await page.waitForLoadState('networkidle');
  
  // ─────────────────────────────────────────
  // ACT: Perform the action being tested
  // ─────────────────────────────────────────
  await page.fill('[data-testid="config-key"]', 'weekly_booking_limit');
  await page.fill('[data-testid="config-value"]', '12');
  await page.fill('[data-testid="config-description"]', 'Maximum bookings per week');
  await page.click('[data-testid="submit-button"]');
  
  // ─────────────────────────────────────────
  // ASSERT: Verify expected outcomes
  // ─────────────────────────────────────────
  // 1. Success message appears
  await expect(page.locator('[data-testid="success-message"]'))
    .toHaveText('Configuration saved successfully');
  
  // 2. Redirected to config list
  await expect(page).toHaveURL(/admin\/system-config\/list/);
  
  // 3. Config appears in list
  await expect(page.locator('[data-testid="config-row-weekly_booking_limit"]'))
    .toBeVisible();
  
  // 4. Values are correct
  const row = page.locator('[data-testid="config-row-weekly_booking_limit"]');
  await expect(row.locator('[data-testid="config-value"]')).toHaveText('12');
});
```

### 4. Test Data Management

**Use fixtures and test data helpers:**

```typescript
// fixtures/test-data.ts
export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin'
  },
  member: {
    email: 'member@test.com',
    password: 'password123',
    role: 'member'
  }
};

export const TEST_CONFIGS = {
  valid: {
    key: 'weekly_booking_limit',
    value: '12',
    description: 'Maximum bookings per week'
  },
  invalid: {
    key: '',  // Empty key (should fail validation)
    value: '-5',  // Negative value (should fail)
    description: ''
  }
};

// Use in tests:
test('Create config with valid data', async ({ page }) => {
  // Login helper
  await loginAs(page, TEST_USERS.admin);
  
  // Create config helper
  await createConfig(page, TEST_CONFIGS.valid);
  
  // Verify
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### 5. Page Object Model (POM)

**For complex pages, use POM pattern:**

```typescript
// pages/system-config-form.page.ts
export class SystemConfigFormPage {
  constructor(private page: Page) {}
  
  // Locators
  private configKeyInput = () => this.page.locator('[data-testid="config-key"]');
  private configValueInput = () => this.page.locator('[data-testid="config-value"]');
  private submitButton = () => this.page.locator('[data-testid="submit-button"]');
  private successMessage = () => this.page.locator('[data-testid="success-message"]');
  private errorMessage = () => this.page.locator('[data-testid="error-message"]');
  
  // Actions
  async goto() {
    await this.page.goto('http://localhost:4200/admin/system-config/create');
    await this.page.waitForLoadState('networkidle');
  }
  
  async fillForm(configKey: string, configValue: string) {
    await this.configKeyInput().fill(configKey);
    await this.configValueInput().fill(configValue);
  }
  
  async submit() {
    await this.submitButton().click();
  }
  
  async submitForm(configKey: string, configValue: string) {
    await this.fillForm(configKey, configValue);
    await this.submit();
  }
  
  // Assertions
  async expectSuccessMessage(message: string) {
    await expect(this.successMessage()).toHaveText(message);
  }
  
  async expectErrorMessage(message: string) {
    await expect(this.errorMessage()).toContainText(message);
  }
}

// Use in test:
test('Create config with POM', async ({ page }) => {
  const configForm = new SystemConfigFormPage(page);
  
  await configForm.goto();
  await configForm.submitForm('weekly_booking_limit', '12');
  await configForm.expectSuccessMessage('Configuration saved successfully');
});
```

### 6. API Interception & Mocking

**Mock flaky or slow API calls:**

```typescript
// Mock API response
test('Display config list with mocked data', async ({ page }) => {
  // Intercept API call
  await page.route('**/api/system-configs', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, key: 'weekly_booking_limit', value: '12' },
        { id: 2, key: 'max_concurrent_bookings', value: '3' }
      ])
    });
  });
  
  await page.goto('http://localhost:4200/admin/system-config/list');
  
  // Verify mocked data is displayed
  await expect(page.locator('[data-testid="config-row-1"]')).toBeVisible();
  await expect(page.locator('[data-testid="config-row-2"]')).toBeVisible();
});

// Verify API call is made
test('Create config sends correct API request', async ({ page }) => {
  let requestBody: any;
  
  // Capture request
  await page.route('**/api/system-configs', async route => {
    const request = route.request();
    requestBody = JSON.parse(request.postData() || '{}');
    
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, ...requestBody })
    });
  });
  
  // Submit form
  await page.goto('http://localhost:4200/admin/system-config/create');
  await page.fill('[data-testid="config-key"]', 'weekly_booking_limit');
  await page.fill('[data-testid="config-value"]', '12');
  await page.click('[data-testid="submit-button"]');
  
  // Verify request body
  expect(requestBody).toEqual({
    key: 'weekly_booking_limit',
    value: '12'
  });
});
```

### 7. Screenshot & Video on Failure

**Automatically capture evidence:**

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});

// Manual screenshot in test
test('Complex scenario with checkpoints', async ({ page }) => {
  await page.goto('http://localhost:4200/admin/system-config/create');
  
  // Take screenshot at checkpoint
  await page.screenshot({ 
    path: 'screenshots/US-SCC-001/step-1-form-loaded.png' 
  });
  
  await page.fill('[data-testid="config-key"]', 'weekly_booking_limit');
  await page.screenshot({ 
    path: 'screenshots/US-SCC-001/step-2-form-filled.png' 
  });
  
  await page.click('[data-testid="submit-button"]');
  await page.screenshot({ 
    path: 'screenshots/US-SCC-001/step-3-submitted.png' 
  });
});
```

### 8. Parallel Execution

**Run tests in parallel for speed:**

```typescript
// playwright.config.ts
export default defineConfig({
  workers: 4,  // Run 4 tests in parallel
  fullyParallel: true,
});

// Disable parallel for specific tests
test.describe.configure({ mode: 'serial' });

test.describe('Config CRUD workflow (must run in order)', () => {
  test.describe.configure({ mode: 'serial' });
  
  test('1. Create config', async ({ page }) => { /* ... */ });
  test('2. Update config', async ({ page }) => { /* ... */ });
  test('3. Delete config', async ({ page }) => { /* ... */ });
});
```

---

## Manual Testing Best Practices

### 1. Exploratory Testing Checklist

When performing manual exploratory testing:

```yaml
exploratory_testing_checklist:
  functional:
    - [ ] Happy path works as expected
    - [ ] All acceptance criteria met
    - [ ] Edge cases handled (empty, null, max values)
    - [ ] Error messages are clear and helpful
    - [ ] Validation works correctly
    - [ ] Form submission prevents duplicates
    
  ui_ux:
    - [ ] UI matches design specifications
    - [ ] Loading states are shown
    - [ ] Buttons are disabled appropriately
    - [ ] Tab order is logical
    - [ ] Focus states are visible
    - [ ] Tooltips/help text are helpful
    
  responsive:
    - [ ] Works on desktop (1920x1080)
    - [ ] Works on tablet (768x1024)
    - [ ] Works on mobile (375x667)
    - [ ] No horizontal scroll
    - [ ] Touch targets are appropriately sized
    
  browser_compatibility:
    - [ ] Chrome (latest)
    - [ ] Safari (latest)
    - [ ] Firefox (latest)
    - [ ] Edge (latest)
    
  performance:
    - [ ] Page loads in < 3 seconds
    - [ ] No console errors
    - [ ] No console warnings (non-critical)
    - [ ] API calls complete quickly
    - [ ] Animations are smooth (60fps)
    
  security:
    - [ ] XSS protection (test with <script>alert('XSS')</script>)
    - [ ] SQL injection protection (test with ' OR '1'='1)
    - [ ] Proper authentication required
    - [ ] Proper authorization checked
    - [ ] Sensitive data not exposed in URLs
    
  data_integrity:
    - [ ] Data saved correctly to database
    - [ ] Audit logs created (if applicable)
    - [ ] Related entities updated correctly
    - [ ] Transactions rollback on error
```

### 2. Bug Severity Classification

Use this guide to classify bug severity:

```
┌──────────────────────────────────────────────────────────────┐
│ CRITICAL (P0)                                                │
├──────────────────────────────────────────────────────────────┤
│ - System down / complete feature failure                     │
│ - Data loss or corruption                                    │
│ - Security vulnerability (SQL injection, XSS)                │
│ - Affects all users                                          │
│ - No workaround available                                    │
│ → MUST fix before ANY release                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ HIGH (P1)                                                    │
├──────────────────────────────────────────────────────────────┤
│ - Major feature broken (core functionality)                  │
│ - Incorrect data calculation/display                         │
│ - Affects most users                                         │
│ - Workaround is complex or non-obvious                       │
│ → SHOULD fix before production release                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ MEDIUM (P2)                                                  │
├──────────────────────────────────────────────────────────────┤
│ - Feature partially works                                    │
│ - Poor error handling                                        │
│ - UI/UX issues (confusing, but functional)                   │
│ - Affects some users                                         │
│ - Simple workaround exists                                   │
│ → CAN fix in next sprint                                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ LOW (P3)                                                     │
├──────────────────────────────────────────────────────────────┤
│ - Cosmetic issues (typos, alignment)                         │
│ - Minor performance degradation                              │
│ - Affects few users                                          │
│ - Edge case scenarios                                        │
│ → BACKLOG (fix when convenient)                              │
└──────────────────────────────────────────────────────────────┘
```

### 3. Test Case Documentation Template

```yaml
test_case:
  id: "TC-001"
  story_id: "US-SCC-001"
  title: "Verify admin can create config with valid data"
  type: "automated"  # automated | manual | exploratory
  priority: "P1"     # P0 | P1 | P2 | P3
  
  preconditions:
    - "User is logged in as admin"
    - "System config feature is enabled"
    - "Database is in clean state"
    
  test_data:
    config_key: "weekly_booking_limit"
    config_value: "12"
    config_description: "Maximum bookings per week"
    
  steps:
    - step: 1
      action: "Navigate to /admin/system-config/create"
      expected: "Config creation form is displayed"
      
    - step: 2
      action: "Fill 'Config Key' with '${config_key}'"
      expected: "Input accepts value"
      
    - step: 3
      action: "Fill 'Config Value' with '${config_value}'"
      expected: "Input accepts value"
      
    - step: 4
      action: "Click 'Save' button"
      expected: |
        - Success message appears: "Configuration saved successfully"
        - Redirected to /admin/system-config/list
        - New config appears in list
        
  acceptance_criteria_mapping:
    - "AC1: Admin can create config with valid data"
    
  cleanup:
    - "Delete created config from database"
    - "Clear browser cache/cookies"
```

---

## Regression Testing Strategy

### 1. Test Suite Organization

```
tests/
├── e2e/
│   ├── smoke/                    # Critical paths (5 min)
│   │   ├── login.spec.ts
│   │   ├── dashboard.spec.ts
│   │   └── core-api.spec.ts
│   │
│   ├── features/                 # Feature-specific (30 min)
│   │   ├── system-config/
│   │   │   ├── create-config.spec.ts
│   │   │   ├── read-config.spec.ts
│   │   │   ├── update-config.spec.ts
│   │   │   └── delete-config.spec.ts
│   │   │
│   │   └── weekly-limits/
│   │       ├── limit-enforcement.spec.ts
│   │       └── admin-ui.spec.ts
│   │
│   └── regression/               # Full suite (2 hours)
│       ├── all-features.spec.ts
│       ├── integrations.spec.ts
│       └── edge-cases.spec.ts
│
└── api/
    ├── system-config-api.spec.ts
    └── weekly-limits-api.spec.ts
```

### 2. Test Tags & Filtering

```typescript
// Tag tests for selective execution
test.describe('System Config - Create', () => {
  test('Create config with valid data @smoke @p0', async ({ page }) => {
    // Critical path test
  });
  
  test('Error handling for invalid data @regression @p1', async ({ page }) => {
    // Important but not critical
  });
  
  test('Long config key handling @edge-case @p3', async ({ page }) => {
    // Edge case, low priority
  });
});

// Run specific tags:
// npx playwright test --grep @smoke          # Run smoke tests only
// npx playwright test --grep @p0|@p1         # Run P0 and P1 tests
// npx playwright test --grep-invert @p3      # Skip P3 tests
```

### 3. Continuous Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run smoke tests
        run: npx playwright test --grep @smoke
        
  regression-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'  # Only on nightly runs
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run full regression
        run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: test-results/
```

---

## Bug Reporting Standards

### 1. Bug Report Template (YAML)

```yaml
bug_report:
  id: "BUG-001"
  created_date: "2026-02-04T10:45:00Z"
  created_by: "QA Agent"
  
  summary:
    title: "Validation error message not displayed on empty form submit"
    severity: "medium"  # critical | high | medium | low
    priority: "P1"      # P0 | P1 | P2 | P3
    status: "open"      # open | in_progress | fixed | verified | closed
    
  context:
    story_id: "US-SCC-001"
    story_title: "Create SystemFeatureConfig entity and CRUD API"
    epic: "EPIC-SCC-001"
    feature: "System Component Configuration"
    test_case_id: "TC-003"
    environment: "systest"
    browser: "Chrome 120.0"
    os: "Windows 11"
    
  description: |
    When submitting the SystemFeatureConfig creation form without filling
    required fields, the expected validation error message does not appear.
    The form submits silently with no user feedback.
    
  reproduction_steps:
    - step: "Navigate to /admin/system-config/create"
      expected: "Config creation form loads"
      actual: "✅ Form loads correctly"
      
    - step: "Leave all fields empty"
      expected: "Form is pristine"
      actual: "✅ Fields are empty"
      
    - step: "Click 'Save' button"
      expected: "Validation error message appears: 'Config key is required'"
      actual: "❌ No error message displayed, form does not submit but no feedback"
      
  expected_behavior: |
    According to acceptance criteria AC2:
    "Error handling - When I submit invalid data, then validation errors are 
    displayed with helpful messages"
    
  actual_behavior: |
    No validation error message is displayed. The form does not submit
    (no API call made), but there is no visual feedback to the user.
    
  technical_details:
    affected_component: "web-app/src/app/features/admin/system-config-form.component.ts"
    suspected_cause: "Missing form validation or error display logic"
    console_errors: []
    network_errors: []
    stack_trace: null
    
  evidence:
    screenshots:
      - path: "screenshots/BUG-001-form-empty.png"
        description: "Form with empty fields before submit"
      - path: "screenshots/BUG-001-after-submit-no-error.png"
        description: "No error message after clicking submit"
    videos:
      - path: "recordings/BUG-001-reproduction.mp4"
        description: "Full reproduction of the bug"
    logs:
      - path: "logs/BUG-001-browser-console.txt"
        description: "Browser console during reproduction"
        
  impact:
    user_impact: "Medium - Users cannot tell why form is not submitting"
    business_impact: "Low - Affects admin users only"
    workaround: "Users must manually check form fields"
    blocks_release: false
    affected_users: "Admins only (~5 users)"
    
  acceptance_criteria_violated:
    - id: "AC2"
      description: "Error handling for invalid data"
      why: "No validation error message displayed"
      
  suggested_fix: |
    1. Add FormGroup validation in component:
       this.form = this.fb.group({
         configKey: ['', Validators.required],
         configValue: ['', Validators.required]
       });
    
    2. Display validation errors in template:
       <mat-error *ngIf="form.get('configKey')?.hasError('required')">
         Config key is required
       </mat-error>
    
    3. Disable submit button when form invalid:
       <button [disabled]="!form.valid">Save</button>
       
  related_links:
    story: "docs/requirements/system-component-config/stories/story_US-SCC-001.yaml"
    test_report: "docs/requirements/system-component-config/test-reports/test-report_US-SCC-001.yaml"
    
  assignment:
    assigned_to: "Developer Agent"
    assigned_date: "2026-02-04T11:00:00Z"
    target_fix_date: "2026-02-06"
    
  verification:
    verified_by: null
    verified_date: null
    verification_notes: null
    
  history:
    - date: "2026-02-04T10:45:00Z"
      action: "Bug created"
      by: "QA Agent"
      notes: "Found during US-SCC-001 testing"
    
    - date: "2026-02-04T11:00:00Z"
      action: "Bug assigned"
      by: "QA Agent"
      notes: "Assigned to Developer Agent for fix"
```

### 2. Bug Report Communication

When reporting bugs to users or developers:

```
╔══════════════════════════════════════════════════════════════════╗
║  🐛 BUG FOUND: BUG-001                                           ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Severity: MEDIUM (P1)                                           ║
║  Story: US-SCC-001 (Create SystemFeatureConfig entity)           ║
║                                                                  ║
║  📋 SUMMARY                                                       ║
║  Validation error message not displayed on empty form submit     ║
║                                                                  ║
║  🔄 REPRODUCTION                                                  ║
║  1. Go to /admin/system-config/create                            ║
║  2. Leave all fields empty                                       ║
║  3. Click 'Save' button                                          ║
║                                                                  ║
║  ❌ EXPECTED                                                      ║
║  Validation error message: "Config key is required"              ║
║                                                                  ║
║  ✅ ACTUAL                                                        ║
║  No error message displayed, form doesn't submit                 ║
║                                                                  ║
║  📎 EVIDENCE                                                      ║
║  Screenshots: screenshots/BUG-001-*.png                          ║
║  Video: recordings/BUG-001-reproduction.mp4                      ║
║                                                                  ║
║  🚦 IMPACT                                                        ║
║  Affects: Admin users only (~5 users)                            ║
║  Blocks Release: No                                              ║
║  Workaround: Manually check form fields                          ║
║                                                                  ║
║  💡 SUGGESTED FIX                                                 ║
║  Add FormGroup validation and display mat-error in template      ║
║                                                                  ║
║  Full report: docs/requirements/system-component-config/bugs/    ║
║               bug_BUG-001_validation-error.yaml                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Test Automation Decision Workflow

Use this decision tree to determine if a test should be automated:

```
┌─────────────────────────────────────────────────────────────────┐
│ START: Should I automate this test?                             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │ Is feature stable?  │
                │ (No changes planned)│
                └─────────────────────┘
                     │           │
                   YES          NO
                     │           │
                     ▼           └──────► ❌ Don't automate
           ┌──────────────────┐          (Manual test only)
           │ Will test run    │
           │ repeatedly?      │
           │ (Regression)     │
           └──────────────────┘
                  │        │
                YES       NO
                  │        │
                  ▼        └──────► ❌ Don't automate
        ┌────────────────────┐    (One-time validation)
        │ Is test execution  │
        │ time < 30 seconds? │
        └────────────────────┘
              │           │
            YES          NO
              │           │
              ▼           └──────► ⚠️ Consider manual
    ┌──────────────────────────┐  (Complex setup)
    │ Is outcome deterministic?│
    │ (Same input = output)    │
    └──────────────────────────┘
          │              │
        YES             NO
          │              │
          ▼              └──────► ❌ Don't automate
  ┌────────────────┐            (Flaky/timing issues)
  │ Is it critical?│
  │ (Core business)│
  └────────────────┘
      │          │
    YES         NO
      │          │
      ▼          └──────► ⚠️ Deprioritize
┌──────────┐            (Automate later)
│ ✅ AUTOMATE │
└──────────┘
```

### Example Decisions:

| Test Scenario | Decision | Reason |
|---------------|----------|--------|
| Admin login flow | ✅ Automate | Stable, critical, runs frequently |
| Create config with valid data | ✅ Automate | Stable, deterministic, < 30s |
| Database audit log verification | ❌ Manual | Requires DB inspection (not Playwright) |
| Visual design review | ❌ Manual | Subjective, requires human judgment |
| Error message text validation | ✅ Automate | Deterministic, easy to assert |
| New feature under active dev | ❌ Manual | Not stable, will change |
| One-time migration validation | ❌ Manual | Won't run repeatedly |
| Complex multi-step data setup | ⚠️ Manual | Time-consuming setup, low ROI |

---

## Quality Gates & Sign-Off Criteria

### Story CANNOT pass QA unless:

```yaml
qa_sign_off_checklist:
  functional:
    - all_acceptance_criteria_pass: true
    - edge_cases_tested: true
    - error_handling_works: true
    - data_validation_works: true
    - no_critical_bugs: true
    - no_high_bugs: true  # Or documented & accepted
    
  non_functional:
    - performance_acceptable: true  # Load time < 3s
    - ui_matches_design: true
    - responsive_on_mobile: true
    - works_in_chrome: true
    - works_in_safari: true
    
  technical:
    - no_console_errors: true
    - no_network_errors: true
    - audit_logs_created: true  # If applicable
    - database_integrity_maintained: true
    
  regression:
    - existing_features_unaffected: true
    - automated_tests_pass: true  # If tests exist
    
  documentation:
    - test_report_created: true
    - bugs_documented: true  # If any found
    - evidence_captured: true  # Screenshots/videos
```

---

## Summary: Core Principles

0. **Specs First** - A committed spec is the deliverable; driving a live browser is a fallback for
   an unresolvable locator, an opaque failure, or an unknown UI surface. If a test can cover it,
   a test covers it.
1. **Ask First, Test Second** - Always clarify what to test before starting
2. **Acceptance Criteria = Test Cases** - Every test maps to documented AC
3. **Automate Wisely** - Use decision matrix, don't automate blindly
4. **Evidence is King** - Screenshots, videos, logs for all failures
5. **Test Pyramid** - Prefer unit tests, use E2E sparingly
6. **Stability > Coverage** - Reliable tests > flaky comprehensive tests
7. **Communicate Clearly** - Bug reports must be actionable
8. **Update Trackers** - Keep QA status in sync with reality
9. **Quality Gates** - Enforce DoD, don't compromise quality
10. **Continuous Improvement** - Refactor tests, update strategies

---

## Additional Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Verification gates** (coverage / CRAP / mutation): `.claude/rules/verification-gates.md`
- **User Stories Skill**: `.claude/skills/user-stories/SKILL.md`
- **Project Instructions**: root `CLAUDE.md` + `.claude/rules/`

---

## When to Ask for Help

Ask the user or escalate to Developer Agent if:

- ❓ Story lacks clear acceptance criteria
- ❓ Feature is not accessible (404, auth issues)
- ❓ Expected behavior is ambiguous or contradictory
- ❓ Bug is critical but cause is unclear
- ❓ Test environment is broken or unavailable
- ❓ Test data setup requires production access
- ❓ Need clarification on business rules

**Never guess. Always clarify.**
