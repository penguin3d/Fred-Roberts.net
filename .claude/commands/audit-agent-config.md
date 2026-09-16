# Audit the agent configuration

Audit everything in `.claude/` — skills, rules, commands, hooks, settings — plus `CLAUDE.md`
and `frontend/CLAUDE.md`, and produce a **keep / demote / merge / delete / rewrite** verdict for
every single artifact.

**This is an audit. Change nothing.** No edits, no deletions, no new files. Output a report.

---

## Audit against this target, not in a vacuum

We are moving this repo toward a **staged multi-agent pipeline with deterministic guardrails**
(Uncle Bob's model). Each stage is a focused agent with a clean context window, handing off to
the next:

| Stage | Owns | Hands off |
|---|---|---|
| **Specifier** | requirement → Gherkin acceptance tests + human QA procedure | executable spec |
| **Coder** | spec → unit tests + production code | working implementation |
| **Cleaner** | CRAP analysis (complexity × coverage), code review, cleanup | de-crapped code |
| **Hardener** | mutation testing — merciless; proves the tests actually assert | tests that bite |
| **QA** | QA procedure → executable UI script against the running system | verified feature |

Two principles decide most verdicts:

1. **Deterministic tools beat prose.** A rule the agent *can* violate is weaker than a script it
   *cannot*. Anything currently written as "always remember to…" that a hook, lint rule, analyzer,
   or CI check could enforce is a **tool candidate**, not a rule.
2. **Small focused prompts beat big steering documents.** Every always-on token is a tax on every
   turn and pushes real signal into the "lost in the middle" zone. Context spent must be earned.

Note: this repo deliberately deleted all `.claude/agents/` in Aug 2026. Reintroducing agents is a
conscious reversal — the audit should say what the old agents got wrong so we don't repeat it
(check git history: `git log --diff-filter=D --name-only -- .claude/agents/`).

---

## What to read

- `.claude/skills/*/SKILL.md` (23) + their `references/` payloads
- `.claude/rules/*.md` (19) — note which carry `paths:` frontmatter (conditional) vs not (**always-on**)
- `.claude/commands/*.md` (6)
- `.claude/hooks/*` (7) + how they're wired in `.claude/settings.json`
- `CLAUDE.md`, `frontend/CLAUDE.md`, `.claude/source-tree/*.md`
- `~/.claude/skills/` — the user-level set, to see what's already global and shouldn't be duplicated here

Baseline already measured: **7 always-on rules ≈ 2,231 words**, plus **CLAUDE.md files ≈ 2,540 words**.
Recompute and report the real per-turn context cost.

## Verdicts — assign exactly one per artifact

| Verdict | Means |
|---|---|
| **KEEP** | Repo-specific, non-obvious, actively earns its context |
| **DEMOTE** | General craft/framework knowledge — belongs in `~/.claude/skills/`, not this repo |
| **MERGE** | Duplicates or overlaps another artifact; name the survivor |
| **DELETE** | Dead, superseded, never invoked, or model-obvious |
| **REWRITE** | Right intent, wrong shape (too long, prose where a tool belongs, wrong trigger) |

## Six tests to apply to each artifact

1. **Repo-specific or generic?** Does it encode facts only true *here* (our schema, our tenant id,
   our pipelines, our two-workspace split), or generic framework knowledge Claude already has?
   Generic → DEMOTE or DELETE. Be blunt: a 400-line EF Core primer is a book, not a skill.
2. **Could a tool enforce this instead?** If yes, flag it as a **tool candidate** and name the
   mechanism (PreToolUse hook / ESLint rule / Roslyn analyzer / CI gate / MSBuild target).
3. **Always-on or on-demand?** Always-on content that applies to <20% of turns should be a
   `paths:`-scoped rule or a skill. Quantify the waste in words.
4. **Does the trigger actually fire?** Is the `description` written so the model reaches for it at
   the right moment, or is it a vague noun phrase that never matches?
5. **Overlap and contradiction.** Does it fight another artifact? Which one wins today, and which
   *should* win?
6. **Evidence of use.** Check git history and any transcript evidence — has it ever been invoked?
   Never-invoked artifacts are context tax with no return.

## Known suspects — resolve each explicitly

Do not skip these; each needs a named winner and a reason:

- **TDD sources — partly resolved.** `.claude/rules/tdd.md` and the `test-driven-development`
  skill were deleted and replaced by `.claude/rules/verification-gates.md` (coverage floor 90%,
  target 95%, goal 100%; test-first optional). The user-level `~/.claude/skills/tdd` still exists
  and now contradicts the project policy — decide whether it should be scoped out here.
- **Response style:** `response-style.md` (merged, 2026-09-11 — `response.md` folded in and deleted).
- **`ponytail-minimalism.md`** (rule) vs user-level `ponytail` skill.
- **Requirements-chain skills:** `business-analyst`, `user-stories`, `story-refinement`,
  `story-prioritization`, `architect-technical-design`, `tech-lead-specs`, `manual-test-checklist`
  — seven artifacts covering one pipeline stage (Specifier). How many survive consolidation?
- **Framework reference dumps:** `cqrs-mediatr`, `entity-framework-core`, `elsa-workflows`,
  `qa-automation` (1,028 lines), `skill-creator`, `frontend-design`, `playwright-cli`. Which are
  genuinely repo-specific and which are library documentation?
- **`serena-only-edit.sh`** exists but is not wired into `settings.json` — dead hook or intended?
- **`settings.local.json`** contains `"Bash*"`, which makes every other entry in the allowlist
  meaningless. Flag the blast radius.
- **`pragmatic-engineer`** claims "ALWAYS ACTIVE" in its description — does that work as intended
  for a skill, or is it a rule wearing a skill's clothes?

## Gaps to name

For each of the five pipeline stages, state what exists today, what is missing, and what
deterministic tool would back it. Specifically check whether the repo has anything for:

- **CRAP score** (cyclomatic complexity² × (1−coverage)³ + complexity; threshold 30) — we already
  produce coverage via `--collect:"XPlat Code Coverage"` and Vitest `--coverage`. What's the
  shortest path to a per-method CRAP ranking on both stacks?
- **Mutation testing** — Stryker.NET for `backend/`, StrykerJS for `frontend/`. Present? Wired?
- **Architecture / dependency enforcement** — `frontend/eslint.config.js` enforces boundaries for
  the Angular fleet; is there any equivalent for `backend/` Clean Architecture layering, and is
  there any tool that *renders* the dependency graph so drift is visible?
- **Complexity thresholds** — ESLint `complexity: 15` is a warning today. Agents tolerate higher
  complexity than humans; propose the numbers we should actually enforce, per stack.

## Report format

1. **One-paragraph verdict** — is this configuration helping or taxing the agent today?
2. **Context budget table** — always-on words before, and after your proposed cuts.
3. **Full inventory table** — every artifact: `name | type | lines | verdict | one-line reason`.
   No artifact omitted.
4. **Tool candidates** — prose that should become deterministic checks: `rule → mechanism → what it blocks`.
5. **Conflicts resolved** — each known suspect above, with the named winner.
6. **Pipeline gap table** — the five stages × (exists / missing / tool needed).
7. **Proposed target layout** — the `.claude/` tree as it should look, with counts.
8. **Ordered execution list** — what to do first, cheapest and highest-leverage first. No timelines.

Be opinionated. "It might be useful someday" is a DELETE. If you cannot state what a rule stops
the agent from doing wrong, it does not earn its tokens.
