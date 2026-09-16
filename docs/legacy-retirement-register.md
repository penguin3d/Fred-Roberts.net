# Legacy Retirement Register

Tracks legacy code kept alive only for a retiring surface, together with its replacement,
so cleanup is deliberate instead of archaeological. Entries are retired individually, each
when its "Remove when" condition is met.

Process: see [.claude/rules/legacy-retirement-register.md](../.claude/rules/legacy-retirement-register.md).

**Entry format** (copy verbatim for new entries; ids are sequential `LRR-NNN`):

```markdown
## LRR-NNN · <short name of the legacy thing>
- **Legacy item:** <endpoint / file / function / config>
- **Status:** active-legacy | replacement-built | ready-to-remove
- **Replacement:** <what supersedes it, or "none yet">
- **Remove when:** <the condition that makes removal safe>
- **Cleanup targets:** <paths to delete>
```

_No entries yet. This workspace was created 2026-09-15._

## Retired

_None._
