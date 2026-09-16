---
paths:
  - "*/**"
---

# Serena MCP — symbol tools for navigation/renames, native tools for editing

**Default: built-in Read / Grep / Glob / Edit / Write for reading, searching, and editing.**
Native `Edit` emits only the changed lines (cheapest, no drift risk); Serena's
`replace_symbol_body` re-emits an entire symbol body and is NOT the default edit path.
(Trial since 2026-07-03 — the former Serena-only-edit PreToolUse hook is unwired;
`.claude/hooks/serena-only-edit.sh` is kept on disk in case we revert.)

Serena drives a language server (LSP), so it addresses code by **symbol path**
(`ClassName/methodName`). Reach for it when the unit of work is a *symbol relationship*
that grep can't resolve — it finds *meaning*; grep only finds *text*.

| Task | Use |
|---|---|
| Rename a symbol everywhere | `rename_symbol` (not find-and-replace) |
| Find all callers / implementations semantically | `find_referencing_symbols` / `find_implementations` |
| Overview of a large, unfamiliar file | `get_symbols_overview` / `find_symbol include_body` (cheaper than reading it all) |
| Type-check after a risky C# edit without a build | `get_diagnostics_for_file` |
| Everything else — read, search, edit, create files | built-in **Read / Grep / Glob / Edit / Write** |

`find_symbol` takes a `name_path` (`AuthService/authenticate`); add `include_body: true` for
source, `relative_path` to scope to one file.

**Gotchas:** symbol tools don't index dot-dirs (`.claude/`) — use Read/Grep/`replace_content`
there. First symbol query per session is slow (LSP warm-up). A stale index can miss a just-written
symbol — re-run the overview.
