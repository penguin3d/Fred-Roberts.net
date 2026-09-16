# Legacy Retirement Register — ask, then record

The register lives at [docs/legacy-retirement-register.md](../../docs/legacy-retirement-register.md).
It tracks legacy endpoints/files/functions kept alive only for retiring surfaces (chiefly the
a retiring surface), each paired with its replacement and removal condition, so
cleanup happens deliberately, entry by entry — never all at once.

## When to act

1. **Fred mentions legacy that should eventually be removed** ("we'll clean this up later",
   "keep it until the legacy app dies", "that endpoint goes away when X retires"):
   **ask one short question — "Record this in the Legacy Retirement Register?"** — and on
   yes, append an entry in the register's exact entry format (it is documented at the top of
   the register file). Never record without asking; never silently drop the mention.
2. **A new endpoint/module is built as a replacement for a legacy one** (e.g. a new paged
   endpoint superseding an old one that legacy still calls): record or update the entry as
   part of that work — the entry names BOTH sides (legacy item + replacement) and flips
   `Status` to `replacement-built`.
3. **A retirement actually happens:** delete the entry's cleanup targets, verify no callers
   remain (grep both workspaces + backend), then move the entry to the register's "Retired"
   section with the date/commit.

## Rules

- Ids are sequential `LRR-NNN`; never reuse a retired id.
- "Cleanup targets" must be exact (file paths, symbols) — the register exists so future
  cleanup needs no re-investigation.
- Do not add speculative entries for code nobody flagged; the register records decisions,
  not guesses.
