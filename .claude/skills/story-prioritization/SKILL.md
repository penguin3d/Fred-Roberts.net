---
name: story-prioritization
description: Techniques and frameworks for ranking user stories, mapping dependencies, and managing backlog order. Includes a script to auto-generate a prioritized backlog from a markdown checklist.
---

# Story Prioritization

This skill provides frameworks and tools for Business Analysts to prioritize user stories effectively.

## 1. Prioritization Frameworks

Select the framework based on the project phase and data availability.

### MoSCoW (Must, Should, Could, Won't)
*   **Best for:** Release planning and fixed deadlines.
*   **Must:** Non-negotiable needs (legal, safety, core utility). *If missing, product fails.*
*   **Should:** Important but not vital; can be fulfilled by a workaround.
*   **Could:** Desirable but less important; "nice to have".
*   **Won't:** Agreed not to implement *this time*.

### RICE (Reach, Impact, Confidence, Effort)
*   **Best for:** Quantitative comparison in mature products.
*   **Formula:** $(Reach \times Impact \times Confidence) / Effort$
*   **Usage:** Requires estimating Story Points (Effort) and Business Value/Users affected (Impact/Reach).

### WSJF (Weighted Shortest Job First)
*   **Best for:** SAFe/Agile flow optimization.
*   **Formula:** $Cost of Delay / Job Duration$
*   **Focus:** Do high-value, low-effort items first to maximize ROI.

### Kano Model
*   **Best for:** Customer satisfaction strategy.
*   **Categories:** Basic Needs (Musts), Performance (Linear), Delighters (Exciters).

## 2. Dependency Mapping

Identify links between stories.
*   **Functional:** Logic dependency (e.g., "Checkout" needs "Cart").
*   **Technical:** Architecture dependency (e.g., "API" needs "DB Schema").
*   **Rule:** Dependencies must be scheduled *before* dependents.

## 3. AI Scoring Heuristics

When analyzing text to infer priority:
*   **High Priority Keywords:** `critical`, `foundation`, `core`, `infrastructure`, `blocking`, `mvp`, `login`, `security`, `schema`, `setup`.
*   **Low Priority Keywords:** `improve`, `beautify`, `refactor`, `optional`, `bonus`, `animation`.
*   **Structural:** Stories that define data structures (Tables, Collections) usually precede stories that use them (UI forms).

## 4. Automated Prioritization Script

A script is included to parse story files (YAML or Markdown) and generate a flattened, prioritized backlog based on keyword heuristics.

### Usage

**1. For YAML Stories (Docs-as-Code):**
```bash
python .claude/skills/story-prioritization/scripts/prioritize_stories.py docs/requirements/{feature_name}/stories/
```
*   **Input:** Directory containing individual story YAML files.
*   **Output:** `docs/requirements/{feature_name}/prioritized_backlog.md` containing a readable report AND a copy-pasteable YAML snippet for `execution-tracker.yaml`.

**2. For Markdown Checklists (Legacy):**
```bash
python .claude/skills/story-prioritization/scripts/prioritize_stories.py docs/old_checklist.md
```

### Script Scorer Logic
The script assigns points based on keywords in the Story Title, Description, and Notes:
*   **Tier 1 (+10,000): Infrastructure & Core** - `Foundation`, `Setup`, `Config`, `Schema`, `Database`, `Auth`, `Security`
*   **Tier 2 (+1,000): Backend Logic** - `API`, `Endpoint`, `Service`, `Controller`, `Webhook`
*   **Tier 3 (+100): Feature Implementation** - `Implement`, `Create`, `Develop`, `Workflow`
*   **Tier 4 (+10): UI/UX** - `UI`, `Frontend`, `Page`, `Screen`, `Form`
*   **Tier 5 (+1): Refinement** - `Style`, `Refactor`, `Polish`
