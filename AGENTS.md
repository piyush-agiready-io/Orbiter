# Orbiter — Agent Instructions

## Context
This is the Orbiter project management platform. Read `CLAUDE.md` for code rules.
Read `docs/superpowers/specs/2026-04-24-orbiter-design.md` for the full design spec.
Read `DESIGN_SYSTEM.md` for visual design tokens and component styling.

## For Implementation Agents
1. Read the plan task assigned to you completely before starting.
2. Follow TDD: write failing test → implement → verify pass → commit.
3. Check existing code in `src/shared/` and `src/modules/` before creating new utilities.
4. Run `npm run lint` and `npm run test:unit` before committing.
5. Every API endpoint must use the `apiHandler()` wrapper from `src/shared/middleware/api-handler.ts`.
6. Every service method must be independently testable without Next.js runtime.

## For Review Agents
1. Check all code rules from CLAUDE.md.
2. Verify no raw `process.env`, no business logic in routes, no raw response construction.
3. Verify semantic color tokens used (not raw hex/Tailwind defaults).
4. Verify tests exist for the code changed.
5. Check for security: no SQL/NoSQL injection, no XSS, proper auth checks.
