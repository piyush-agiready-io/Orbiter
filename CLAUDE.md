# Orbiter — Development Rules

## Project
- **Name:** Orbiter — Internal Project Management Platform
- **Stack:** Next.js (App Router), React 19, TypeScript 5, Tailwind CSS 4, MongoDB (Mongoose)
- **Deploy:** Vercel + MongoDB Atlas + Cloudflare R2

## Architecture
- **Domain Modules:** All business logic in `src/modules/<domain>/` — model, service, validator, types per domain
- **Thin Route Handlers:** API routes in `src/app/api/v1/` validate → call service → respond. No business logic in routes.
- **Shared Infrastructure:** `src/shared/` for middleware, database, utilities, types
- **Components:** `src/components/ui/` (Shadcn), `src/components/features/` (domain UI), `src/components/shared/` (reusable)

## Code Rules
- Files should be focused on a single responsibility. Split when a file is doing too much, not at an arbitrary line count.
- Every API route uses the `apiHandler()` wrapper — no raw request/response handling.
- Zod for all input validation. Never manually check request bodies.
- Access environment variables via `@/config/env` — never raw `process.env` (except in env.ts itself).
- Use `@/` path alias for all imports (maps to `src/`).
- All API routes under `/api/v1/` prefix.
- Use semantic tokens for colors (`bg-surface`, `text-primary`) — never raw hex or Tailwind defaults (`bg-white`, `text-gray-900`).
- Mongoose models define schema + model export only. No business logic in models.
- Services are the single source of business logic. Route handlers call services.
- No Mongoose hooks for business logic — all side effects explicit in service methods.

## API Contract
- Success: `{ success: true, data: T, meta?: { page, limit, total, totalPages } }`
- Error: `{ success: false, error: { code: ErrorCode, message: string, details?: any } }`
- Use `apiSuccess()` and `apiError()` helpers — never construct responses manually.

## Testing
- Unit tests: `tests/unit/` — mirrors `src/modules/` structure. Pure logic, no DB.
- Integration tests: `tests/integration/` — API routes against mongodb-memory-server.
- E2E tests: `tests/e2e/` — Playwright browser tests.
- Use factory functions from `tests/helpers/factory.ts` for test data.

## Commits
- Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
- One logical change per commit. Tests committed with their implementation.

## Don't
- Don't use `any` type. Use `unknown` and narrow.
- Don't install new dependencies without checking if an existing one covers the need.
- Don't add features not in the current task's scope.
- Don't write comments explaining WHAT — only WHY when non-obvious.
- Don't use default Shadcn styling — all components use Orbiter design tokens.
