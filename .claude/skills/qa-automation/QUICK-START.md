# QA Automation Quick Start Guide

## 🚀 Getting Started

### 1. Activate QA Agent

When you activate the QA agent, you'll see an interactive menu. Choose what you want to do:

```
1️⃣ TEST STORY      → Test specific user story
2️⃣ FIND TESTABLE   → Find stories ready for testing
3️⃣ AUTOMATE        → Create Playwright tests
4️⃣ MANUAL TEST     → Guided manual testing
5️⃣ REGRESSION      → Run test suite
6️⃣ BUG REPORT      → Document defect
7️⃣ TEST STATUS     → View progress
```

### 2. The Agent ALWAYS Asks First

The QA agent will **always ask you** before starting:

- **Which story?** (Story ID or feature name)
- **What type of testing?** (automated, manual, exploratory)
- **Any specific concerns?** (performance, security, edge cases)

### 3. Quick Testing Workflow

```
User: "Test US-SCC-001"
  ↓
Agent: Loads story, reads acceptance criteria
  ↓
Agent: Presents test plan (automated + manual)
  ↓
User: Approves plan
  ↓
Agent: Executes tests, documents results
  ↓
Agent: Creates test report, updates trackers
  ↓
Agent: Reports final status (pass/fail/blocked)
```

---

## 📋 Test Strategy Cheat Sheet

### When to Automate (Playwright)

✅ **YES - Automate if:**
- Feature is **stable** (no changes planned)
- Test will **run frequently** (regression)
- **Critical path** (high business value)
- **Deterministic** (same input = same output)
- **Fast** (< 30 seconds execution)

❌ **NO - Manual test if:**
- Feature **under active development**
- **One-time** validation
- **Complex visual** validation (requires human judgment)
- **Flaky/timing** issues
- **Low priority** edge case

### Example Decisions

| Test | Automate? | Why |
|------|-----------|-----|
| Admin login | ✅ YES | Stable, critical, frequent |
| Create form with valid data | ✅ YES | Deterministic, fast |
| Database audit log check | ❌ NO | Requires DB inspection |
| Visual design review | ❌ NO | Subjective, needs human |
| New feature (in dev) | ❌ NO | Not stable yet |

---

## 🔍 Finding Stories to Test

### Option 1: User Provides Story ID

```
User: "Test US-SCC-001"
Agent: [loads story directly]
```

### Option 2: Agent Finds Testable Stories

```
Agent: "Scanning for stories ready for QA..."
Found:
1. US-SCC-001 (P1, 3 SP) - Create config entity
2. US-WEEKLY-002 (P1, 2 SP) - Limit enforcement
3. US-WEEKLY-003 (P2, 3 SP) - Admin UI

Which one? (1-3 or story ID)
```

Stories are "testable" when:
- Status = `completed` (developer is done)
- No blockers
- Not already tested (`qa_status` is empty)

---

## 🧪 Test Execution

### Automated Tests (Playwright)

Agent will:
1. Create/run Playwright tests
2. Capture screenshots on failure
3. Generate test report with results
4. Update trackers with QA status

### Manual Tests

Agent will:
1. Present step-by-step checklist
2. Ask you to confirm each step (pass/fail/blocked)
3. Capture your observations
4. Document results in test report

---

## 🐛 Bug Reporting

When tests fail, agent creates detailed bug report:

```yaml
bug_report:
  id: "BUG-001"
  severity: "medium"  # critical/high/medium/low
  title: "Short description"
  reproduction_steps: [...]
  expected_behavior: "What should happen"
  actual_behavior: "What actually happens"
  screenshots: [...]
  suggested_fix: "How to fix it"
```

### Bug Severity Guide

| Severity | Description | Example |
|----------|-------------|---------|
| **Critical** | System down, data loss | Database corruption |
| **High** | Major feature broken | Login not working |
| **Medium** | Feature partially works | Error message not shown |
| **Low** | Cosmetic issues | Typo in button text |

---

## 📊 Test Reports

After testing, agent creates test report:

```yaml
test_report:
  story_id: "US-SCC-001"
  summary:
    total_test_cases: 5
    passed: 4
    failed: 1
    pass_rate: 80%
  test_cases: [...]
  bugs_found: ["BUG-001"]
  conclusion: "Story 80% complete. 1 bug blocks acceptance."
  status: "needs_rework"  # passed/needs_rework/blocked
```

---

## 🎯 Quality Gates

Story **CANNOT pass QA** unless:

- ✅ All acceptance criteria pass
- ✅ No critical/high bugs (or documented & accepted)
- ✅ UI matches design
- ✅ Works in target browsers
- ✅ No console errors
- ✅ Performance acceptable (< 3s load time)
- ✅ Regression tests still pass

---

## 🤖 Agent Capabilities

### What the Agent CAN Do

- ✅ Read User Stories and acceptance criteria
- ✅ Create automated Playwright tests
- ✅ Guide manual testing step-by-step
- ✅ Run existing test suites
- ✅ Create detailed bug reports (YAML format)
- ✅ Generate test reports with evidence
- ✅ Update Global Tracker with QA status
- ✅ Take screenshots and videos
- ✅ Scan for testable stories
- ✅ Show testing progress dashboard

### What the Agent CANNOT Do

- ❌ Make subjective design judgments
- ❌ Access production environment (safety)
- ❌ Auto-fix bugs (that's Developer Agent's job)
- ❌ Decide story acceptance (needs human sign-off)

---

## 📚 File Locations

### Where Tests Go

```
tests/
├── e2e/
│   ├── smoke/              # Critical paths (fast)
│   ├── features/           # Feature-specific tests
│   └── regression/         # Full test suite
```

### Where Reports Go

```
docs/requirements/{feature-path}/
├── test-reports/
│   └── test-report_{story_id}_{date}.yaml
├── bugs/
│   └── bug_{id}_{slug}.yaml
└── screenshots/
    └── {story_id}/
        └── {test_case_id}-{step}-{status}.png
```

### Trackers Updated

- `GLOBAL-EXECUTION-TRACKER.yaml` - Updated with `qa_status`
- `{feature}/execution-tracker.yaml` - Updated with test results

---

## 💡 Tips & Tricks

### 1. Always Start with "Find Testable"

```
User: "What can I test?"
Agent: [Scans Global Tracker, shows ready stories]
User: "Test story 2"
Agent: [Loads US-WEEKLY-002, begins testing]
```

### 2. Use Story ID for Speed

```
User: "Test US-SCC-001"
Agent: [Immediately loads and starts]
```

### 3. Request Specific Test Type

```
User: "Manual test US-SCC-001"
Agent: [Skips automation, guides manual testing]
```

### 4. Check Status Before Testing

```
User: "Show test status"
Agent: [Displays dashboard with metrics]
```

### 5. Run Regression Before Release

```
User: "Run regression tests"
Agent: [Executes full test suite, reports results]
```

---

## 🆘 Common Issues

### "Story not found"

**Cause:** Story ID doesn't exist or is misspelled

**Fix:** 
1. Check Global Tracker for correct ID
2. Use "Find Testable" option to browse

### "Story not ready for testing"

**Cause:** Story status is not `completed`

**Fix:**
1. Wait for developer to finish
2. Check `execution-tracker.yaml` for status

### "Can't access environment"

**Cause:** Test environment is down or wrong URL

**Fix:**
1. Verify environment is running
2. Check URL configuration
3. Ensure you have access credentials

### "Tests are flaky"

**Cause:** Timing issues, race conditions

**Fix:**
1. Use proper waiting strategies (see skill)
2. Avoid hard-coded `waitForTimeout()`
3. Consider manual testing instead

---

## 🎓 Learning Resources

- **Full QA Automation Skill**: `.claude/skills/qa-automation/SKILL.md`
- **Playwright Documentation**: https://playwright.dev/docs/intro
- **Verification gates** (coverage / CRAP / mutation): `.claude/rules/verification-gates.md`
- **User Stories Structure**: `.claude/skills/user-stories/SKILL.md`

---

## 📞 Getting Help

Ask the QA agent if you need:

- ❓ Clarification on what to test
- ❓ Help understanding acceptance criteria
- ❓ Guidance on test strategy
- ❓ Bug severity classification
- ❓ Test report interpretation

The agent will **always ask clarifying questions** rather than guess!
