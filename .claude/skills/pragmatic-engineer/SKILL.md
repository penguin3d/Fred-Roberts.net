---
name: pragmatic-engineer
description: >
  ALWAYS ACTIVE. Backend architect mindset for .NET 10 solutions. Enforces simplicity-first
  thinking, prevents over-engineering, and guides pragmatic decisions on architecture, DI,
  abstractions, and patterns. Auto-triggers on ALL backend code generation, architecture
  decisions, refactoring, and feature implementation. Complements SOLID/KISS/DRY in CLAUDE.md
  with guardrails on WHEN to apply and when to hold back.
---

# Pragmatic Backend Architect — .NET 10

Run these checks **silently** before proposing any solution. Do not list them to the user.

## Decision gate (every task):

1. **What is the simplest thing that works?** Complexity requires justification.
2. **Is this needed now?** (YAGNI) No speculative code, no "future-proof" abstractions.
3. **Is this the third time?** Don't abstract until the third occurrence. Duplication < wrong abstraction.
4. **Is this complexity from the problem or from my solution?** Only the problem's complexity is acceptable.
5. **Will this be easy to change tomorrow?** The best design is the one easiest to modify.

## .NET anti-patterns to catch:

- **Abstraction layers that just pass through** — A service that calls a repository method with the same signature adds no value. Collapse it.
- **Generic repository over EF Core** — `DbContext` IS the Unit of Work + Repository. Don't wrap it in another generic layer.
- **MediatR/Mediator for everything** — Use the project's CQRS mediator for commands/queries. Don't route internal method calls through it.
- **Options pattern overuse** — `IOptions<T>` for config that comes from appsettings. Don't create options classes for constants or values known at compile time.
- **Extension method sprawl** — One-off helpers don't need extension methods. Use them for genuinely reusable cross-cutting operations.
- **Middleware for single-use logic** — If it applies to one endpoint, put it in the handler. Middleware is for cross-cutting concerns.
- **Tiny class explosion** — SRP doesn't mean one method per class. Cohesive related methods belong together.
- **DTO mapping layers** — Don't create `AutoMapper` profiles or manual mappers for simple 1:1 projections. Use EF `.Select()` to project directly into the response DTO.

## .NET 10 — prefer modern patterns:

- **Primary constructors** for DI injection — no private readonly field boilerplate.
- **Collection expressions** `[1, 2, 3]` over `new List<int> { 1, 2, 3 }`.
- **`required` properties** on DTOs instead of constructor parameters when appropriate.
- **File-scoped namespaces** — always.
- **Raw string literals** for multi-line SQL or templates.
- **`DateOnly`/`TimeOnly`** over `DateTime` — per CLAUDE.md timezone rules.
- **Minimal API** style for simple endpoints; controllers for complex resource groups.
- **`record`** for immutable DTOs, events, value objects. `class` for entities with identity.

## When proposing a solution:

- Lead with the direct approach. Mention alternatives only if trade-offs actually matter.
- Prefer flat over nested. Prefer explicit over clever.
- Three similar lines > premature abstraction.
- Delete dead code — git remembers. Don't comment it out.
- **30-second test**: Would a new team member understand this handler in 30 seconds?
- When adding a feature, check if an existing handler/service can be extended first.
