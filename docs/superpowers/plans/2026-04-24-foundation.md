# Orbiter Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Orbiter project with auth, projects CRUD, dashboard layout, and all shared infrastructure — the foundation every other feature builds on.

**Architecture:** Next.js 15 App Router with domain modules (modules/) for business logic, thin API route handlers, shared middleware stack, and a swappable theme system. MongoDB via Mongoose, JWT auth (jose), Zod validation, React Query + Zustand for frontend state.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Mongoose 8, jose, Zod, @tanstack/react-query, zustand, Shadcn/ui, Phosphor Icons, Boring Avatars, Jest, Supertest, mongodb-memory-server

**Spec:** `docs/superpowers/specs/2026-04-24-orbiter-design.md`
**Design System:** `DESIGN_SYSTEM.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                              ← Root layout: fonts, providers
│   ├── (auth)/
│   │   ├── layout.tsx                          ← Centered card layout
│   │   ├── login/page.tsx                      ← Login page
│   │   └── register/[token]/page.tsx           ← Invite registration
│   ├── (dashboard)/
│   │   ├── layout.tsx                          ← Sidebar + topbar + AuthProvider gate
│   │   └── page.tsx                            ← Project list (dashboard home)
│   └── api/v1/
│       ├── health/route.ts                     ← Health check
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── register/route.ts
│       │   ├── refresh/route.ts
│       │   ├── forgot-password/route.ts
│       │   └── reset-password/route.ts
│       ├── users/
│       │   ├── route.ts                        ← GET (admin list)
│       │   ├── invite/route.ts                 ← POST (admin invite)
│       │   └── me/route.ts                     ← GET/PATCH (own profile)
│       └── projects/
│           ├── route.ts                        ← GET/POST
│           └── [id]/
│               ├── route.ts                    ← GET/PATCH
│               └── members/route.ts            ← POST/DELETE
│
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts                     ← Login, register, refresh, reset logic
│   │   ├── auth.validator.ts                   ← Zod schemas
│   │   └── auth.types.ts                       ← TypeScript interfaces
│   ├── users/
│   │   ├── user.model.ts                       ← Mongoose schema
│   │   ├── user.service.ts                     ← CRUD + invite
│   │   ├── user.validator.ts
│   │   └── user.types.ts
│   └── projects/
│       ├── project.model.ts
│       ├── project.service.ts
│       ├── project.validator.ts
│       └── project.types.ts
│
├── shared/
│   ├── database/
│   │   └── connection.ts                       ← Mongoose connection singleton
│   ├── middleware/
│   │   ├── auth.ts                             ← JWT verification
│   │   ├── role-guard.ts                       ← requireRole()
│   │   ├── project-access.ts                   ← requireProjectAccess()
│   │   ├── rate-limiter.ts                     ← Per-IP / per-user limits
│   │   ├── validate.ts                         ← Zod wrapper
│   │   └── api-handler.ts                      ← Route handler wrapper
│   ├── lib/
│   │   ├── tokens.ts                           ← JWT sign/verify helpers
│   │   ├── email.ts                            ← Resend wrapper
│   │   └── storage.ts                          ← R2 client (stub for now)
│   ├── types/
│   │   └── api.types.ts                        ← ApiResponse, ApiError, ErrorCode
│   └── utils/
│       ├── api-response.ts                     ← apiSuccess(), apiError() helpers
│       └── constants.ts                        ← App-wide constants
│
├── components/
│   ├── ui/                                     ← Shadcn primitives (installed via CLI)
│   ├── providers/
│   │   ├── query-provider.tsx                  ← React Query provider
│   │   └── auth-provider.tsx                   ← Auth gate + silent refresh
│   ├── layouts/
│   │   ├── dashboard-sidebar.tsx
│   │   └── topbar.tsx
│   └── shared/
│       └── loading-skeleton.tsx
│
├── hooks/
│   ├── use-auth.ts                             ← Zustand auth store
│   └── queries/
│       └── use-projects.ts                     ← React Query hooks for projects
│
├── styles/
│   ├── themes/
│   │   └── indigo.ts                           ← Default palette
│   ├── theme.config.ts                         ← Active theme + CSS var generator
│   └── globals.css                             ← Tailwind + theme tokens
│
└── config/
    └── env.ts                                  ← Zod env validation

tests/
├── unit/
│   ├── modules/
│   │   ├── auth/auth.service.test.ts
│   │   ├── users/user.service.test.ts
│   │   └── projects/project.service.test.ts
│   └── shared/
│       ├── utils/api-response.test.ts
│       └── lib/tokens.test.ts
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── users.test.ts
│   │   └── projects.test.ts
│   └── setup/
│       ├── db.ts                               ← mongodb-memory-server lifecycle
│       └── app.ts                              ← Test app instance
├── helpers/
│   ├── factory.ts                              ← buildUser(), buildProject()
│   ├── auth.ts                                 ← getAuthToken() helper
│   └── request.ts                              ← Supertest wrapper

CLAUDE.md
AGENTS.md
.env.example
```

---

### Task 1: Project Scaffold & Configuration

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.example`, `.gitignore`, `src/config/env.ts`

- [ ] **Step 1: Initialize Next.js 15 project**

```bash
npx create-next-app@latest orbiter --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd orbiter
```

- [ ] **Step 2: Install all dependencies**

```bash
# Core
npm install mongoose jose cookie zod bcryptjs

# UI
npm install @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npm install @phosphor-icons/react boring-avatars
npm install framer-motion @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers

# Utils
npm install date-fns nanoid resend

# Dev
npm install -D @types/bcryptjs @types/cookie
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
npm install -D supertest @types/supertest mongodb-memory-server
npm install -D prettier eslint-config-prettier
```

- [ ] **Step 3: Create environment validation**

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(64, 'ENCRYPTION_KEY must be 32 bytes hex (64 chars)'),
  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY: z.string().optional().default(''),
  R2_SECRET_KEY: z.string().optional().default(''),
  R2_BUCKET_NAME: z.string().optional().default('orbiter-uploads'),
  R2_PUBLIC_URL: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return parsed.data;
}

export const env = validateEnv();
```

- [ ] **Step 4: Create .env.example**

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/orbiter

# Auth (generate with: openssl rand -base64 48)
JWT_ACCESS_SECRET=change-me-min-32-characters-long-secret
JWT_REFRESH_SECRET=change-me-min-32-characters-long-secret

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=change-me-64-hex-characters-0000000000000000000000000000000000

# Cloudflare R2 (optional for local dev)
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET_NAME=orbiter-uploads
R2_PUBLIC_URL=

# Email (optional for local dev)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 5: Create .env.local from .env.example with real dev values**

Copy `.env.example` to `.env.local` and fill in `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` with generated values.

- [ ] **Step 6: Update .gitignore**

Add to `.gitignore`:
```
.env.local
.env.*.local
.superpowers/
```

- [ ] **Step 7: Update next.config.ts**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongoose'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 8: Verify project starts**

```bash
npm run dev
```
Expected: App starts on http://localhost:3000 with default Next.js page.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 project with dependencies and env validation"
```

---

### Task 2: CLAUDE.md & AGENTS.md

**Files:**
- Create: `CLAUDE.md`, `AGENTS.md`

- [ ] **Step 1: Create CLAUDE.md**

```markdown
# Orbiter — Development Rules

## Project
- **Name:** Orbiter — Internal Project Management Platform
- **Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, MongoDB (Mongoose 8)
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
```

- [ ] **Step 2: Create AGENTS.md**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "docs: add CLAUDE.md and AGENTS.md with project rules"
```

---

### Task 3: Theme System & Global Styles

**Files:**
- Create: `src/styles/themes/indigo.ts`, `src/styles/theme.config.ts`, `src/app/globals.css`

- [ ] **Step 1: Create the indigo theme definition**

```typescript
// src/styles/themes/indigo.ts
export const indigo = {
  name: 'indigo',
  light: {
    bg: {
      page: '#FAFAFA',
      surface: '#FFFFFF',
      elevated: '#FFFFFF',
      overlay: 'rgba(0, 0, 0, 0.45)',
      subtle: '#F4F4F5',
      muted: '#EDEDEF',
    },
    text: {
      primary: '#1C1C22',
      secondary: '#5C5C6B',
      muted: '#8B8B9A',
      disabled: '#B4B4C0',
      inverse: '#FAFAFA',
    },
    border: {
      subtle: '#EBEBEF',
      default: '#DDDDE3',
      strong: '#C2C2CC',
    },
    accent: {
      base: '#5B5FC7',
      hover: '#4E52B0',
      muted: '#E8E9F5',
      text: '#4248A6',
    },
    semantic: {
      success: { base: '#2E7D57', muted: '#E6F4ED' },
      warning: { base: '#B5850B', muted: '#FEF5E0' },
      error: { base: '#C93B3B', muted: '#FCE9E9' },
      info: { base: '#3178B9', muted: '#E5F0FA' },
    },
    priority: {
      p0: { base: '#C93B3B', muted: '#FCE9E9' },
      p1: { base: '#D97A0B', muted: '#FDF0DD' },
      p2: { base: '#5B5FC7', muted: '#E8E9F5' },
      p3: { base: '#8B8B9A', muted: '#F4F4F5' },
    },
    shadow: {
      xs: '0 1px 2px rgba(0, 0, 0, 0.04)',
      sm: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
      md: '0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
      lg: '0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03)',
    },
  },
  dark: {
    bg: {
      page: '#101012',
      surface: '#18181B',
      elevated: '#1F1F24',
      overlay: 'rgba(0, 0, 0, 0.60)',
      subtle: '#1F1F24',
      muted: '#27272C',
    },
    text: {
      primary: '#F0F0F3',
      secondary: '#A0A0AE',
      muted: '#6E6E7A',
      disabled: '#4A4A54',
      inverse: '#1C1C22',
    },
    border: {
      subtle: '#222228',
      default: '#2C2C34',
      strong: '#3C3C46',
    },
    accent: {
      base: '#7578D9',
      hover: '#8487E0',
      muted: '#1E1E30',
      text: '#9598E5',
    },
    semantic: {
      success: { base: '#3BA874', muted: '#132E22' },
      warning: { base: '#D4A030', muted: '#2E2510' },
      error: { base: '#E05555', muted: '#301414' },
      info: { base: '#4A9ADA', muted: '#121E2C' },
    },
    priority: {
      p0: { base: '#E05555', muted: '#301414' },
      p1: { base: '#E0A030', muted: '#2E2510' },
      p2: { base: '#7578D9', muted: '#1E1E30' },
      p3: { base: '#6E6E7A', muted: '#1F1F24' },
    },
    shadow: {
      xs: '0 1px 2px rgba(0, 0, 0, 0.20)',
      sm: '0 1px 3px rgba(0, 0, 0, 0.30), 0 1px 2px rgba(0, 0, 0, 0.20)',
      md: '0 4px 8px -2px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.20)',
      lg: '0 12px 24px -4px rgba(0, 0, 0, 0.45), 0 4px 8px -2px rgba(0, 0, 0, 0.15)',
    },
  },
} as const;

export type ThemeDefinition = typeof indigo;
export type ColorMode = 'light' | 'dark';
```

- [ ] **Step 2: Create theme config**

```typescript
// src/styles/theme.config.ts
import { indigo, type ColorMode } from './themes/indigo';

// CHANGE THIS ONE LINE TO SWAP THE ENTIRE PALETTE
export const activeTheme = indigo;

export function getThemeTokens(mode: ColorMode) {
  const t = activeTheme[mode];
  return {
    '--color-bg-page': t.bg.page,
    '--color-bg-surface': t.bg.surface,
    '--color-bg-elevated': t.bg.elevated,
    '--color-bg-overlay': t.bg.overlay,
    '--color-bg-subtle': t.bg.subtle,
    '--color-bg-muted': t.bg.muted,
    '--color-text-primary': t.text.primary,
    '--color-text-secondary': t.text.secondary,
    '--color-text-muted': t.text.muted,
    '--color-text-disabled': t.text.disabled,
    '--color-text-inverse': t.text.inverse,
    '--color-border-subtle': t.border.subtle,
    '--color-border-default': t.border.default,
    '--color-border-strong': t.border.strong,
    '--color-accent': t.accent.base,
    '--color-accent-hover': t.accent.hover,
    '--color-accent-muted': t.accent.muted,
    '--color-accent-text': t.accent.text,
    '--color-success': t.semantic.success.base,
    '--color-success-muted': t.semantic.success.muted,
    '--color-warning': t.semantic.warning.base,
    '--color-warning-muted': t.semantic.warning.muted,
    '--color-error': t.semantic.error.base,
    '--color-error-muted': t.semantic.error.muted,
    '--color-info': t.semantic.info.base,
    '--color-info-muted': t.semantic.info.muted,
    '--color-p0': t.priority.p0.base,
    '--color-p0-muted': t.priority.p0.muted,
    '--color-p1': t.priority.p1.base,
    '--color-p1-muted': t.priority.p1.muted,
    '--color-p2': t.priority.p2.base,
    '--color-p2-muted': t.priority.p2.muted,
    '--color-p3': t.priority.p3.base,
    '--color-p3-muted': t.priority.p3.muted,
    '--shadow-xs': t.shadow.xs,
    '--shadow-sm': t.shadow.sm,
    '--shadow-md': t.shadow.md,
    '--shadow-lg': t.shadow.lg,
  } as const;
}
```

- [ ] **Step 3: Create globals.css with all design tokens**

Write `src/app/globals.css` with:
- Tailwind import
- `:root` block with all light-mode CSS custom properties from `indigo.ts` values
- `.dark` block with all dark-mode CSS custom properties
- `@theme` block mapping Tailwind utility classes to CSS variables (e.g., `--color-surface: var(--color-bg-surface)`)
- Base body styles: `bg-page text-primary antialiased`, Inter font feature settings
- `@media (prefers-reduced-motion: reduce)` — disable all animations
- Easing custom properties: `--ease-out`, `--ease-in`, `--ease-in-out`
- Duration custom properties: `--duration-fast: 80ms`, `--duration-normal: 150ms`, `--duration-slow: 250ms`
- Skeleton pulse keyframe: `bg-subtle` to `bg-muted`, 1.5s ease-in-out
- Card hover utility class: `transition box-shadow 120ms + transform 120ms`, hover `translateY(-1px)` + `shadow-sm`
- View Transitions API pseudo-element rules for theme toggle

Reference `DESIGN_SYSTEM.md` sections 1, 4, 5 for exact values.

- [ ] **Step 4: Verify styles load**

```bash
npm run dev
```
Confirm the page background is `#FAFAFA` (light mode page color) and the default font is Inter.

- [ ] **Step 5: Commit**

```bash
git add src/styles/ src/app/globals.css
git commit -m "feat: add theme system with indigo palette and design tokens"
```

---

### Task 4: Database Connection & Shared Types

**Files:**
- Create: `src/shared/database/connection.ts`, `src/shared/types/api.types.ts`, `src/shared/utils/api-response.ts`, `src/shared/utils/constants.ts`
- Test: `tests/unit/shared/utils/api-response.test.ts`

- [ ] **Step 1: Write tests for api-response utilities**

```typescript
// tests/unit/shared/utils/api-response.test.ts
import { apiSuccess, apiError, paginatedSuccess } from '@/shared/utils/api-response';

describe('apiSuccess', () => {
  it('wraps data in standard success format', () => {
    const result = apiSuccess({ id: '1', name: 'Test' });
    expect(result).toEqual({
      success: true,
      data: { id: '1', name: 'Test' },
    });
  });
});

describe('paginatedSuccess', () => {
  it('includes meta with pagination info', () => {
    const result = paginatedSuccess([{ id: '1' }], { page: 1, limit: 20, total: 45 });
    expect(result).toEqual({
      success: true,
      data: [{ id: '1' }],
      meta: { page: 1, limit: 20, total: 45, totalPages: 3 },
    });
  });

  it('calculates totalPages correctly', () => {
    const result = paginatedSuccess([], { page: 1, limit: 10, total: 0 });
    expect(result.meta.totalPages).toBe(0);
  });
});

describe('apiError', () => {
  it('wraps error in standard error format', () => {
    const result = apiError('VALIDATION_ERROR', 'Invalid input');
    expect(result).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
    });
  });

  it('includes optional details', () => {
    const details = [{ field: 'email', message: 'Required' }];
    const result = apiError('VALIDATION_ERROR', 'Invalid input', details);
    expect(result.error.details).toEqual(details);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/unit/shared/utils/api-response.test.ts --no-cache
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Create shared types**

```typescript
// src/shared/types/api.types.ts
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}

export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};
```

- [ ] **Step 4: Create api-response utilities**

```typescript
// src/shared/utils/api-response.ts
import type { ErrorCode, ApiSuccessResponse, ApiErrorResponse, PaginationMeta } from '@/shared/types/api.types';

export function apiSuccess<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

export function paginatedSuccess<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number },
): ApiSuccessResponse<T[]> {
  const { page, limit, total } = pagination;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    success: true,
    data,
    meta: { page, limit, total, totalPages },
  };
}

export function apiError(
  code: ErrorCode,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, ...(details !== undefined && { details }) },
  };
}
```

- [ ] **Step 5: Create constants**

```typescript
// src/shared/utils/constants.ts
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  RESET: 60 * 60 * 1000, // 1 hour in ms
  INVITE: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
} as const;

export const ROLES = ['admin', 'internal', 'client'] as const;
export type Role = (typeof ROLES)[number];
```

- [ ] **Step 6: Create database connection**

```typescript
// src/shared/database/connection.ts
import mongoose from 'mongoose';
import { env } from '@/config/env';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  if (mongoose.connections[0]?.readyState === 1) {
    isConnected = true;
    return;
  }

  await mongoose.connect(env.MONGODB_URI, {
    bufferCommands: false,
  });

  isConnected = true;
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx jest tests/unit/shared/utils/api-response.test.ts --no-cache
```
Expected: All 5 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/shared/ src/config/ tests/unit/shared/
git commit -m "feat: add database connection, shared types, and API response utilities"
```

---

### Task 5: JWT Token Utilities

**Files:**
- Create: `src/shared/lib/tokens.ts`
- Test: `tests/unit/shared/lib/tokens.test.ts`

- [ ] **Step 1: Write tests for token utilities**

```typescript
// tests/unit/shared/lib/tokens.test.ts
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/shared/lib/tokens';

// Mock env
jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  },
}));

describe('Token utilities', () => {
  const payload = { userId: '507f1f77bcf86cd799439011', role: 'internal' as const };

  it('signs and verifies an access token', async () => {
    const token = await signAccessToken(payload);
    expect(typeof token).toBe('string');
    const decoded = await verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
  });

  it('signs and verifies a refresh token', async () => {
    const token = await signRefreshToken(payload);
    const decoded = await verifyRefreshToken(token);
    expect(decoded.userId).toBe(payload.userId);
  });

  it('rejects an expired token', async () => {
    // Sign with 0s expiry
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode('a'.repeat(32));
    const token = await new SignJWT({ userId: 'test', role: 'internal' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('0s')
      .sign(secret);

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a token signed with wrong secret', async () => {
    const { SignJWT } = await import('jose');
    const wrongSecret = new TextEncoder().encode('c'.repeat(32));
    const token = await new SignJWT({ userId: 'test', role: 'internal' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(wrongSecret);

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/unit/shared/lib/tokens.test.ts --no-cache
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement token utilities**

```typescript
// src/shared/lib/tokens.ts
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/config/env';
import type { Role } from '@/shared/utils/constants';

interface TokenPayload {
  userId: string;
  role: Role;
}

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret);
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret);
  return { userId: payload.userId as string, role: payload.role as Role };
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, refreshSecret);
  return { userId: payload.userId as string, role: payload.role as Role };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/unit/shared/lib/tokens.test.ts --no-cache
```
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/tokens.ts tests/unit/shared/lib/tokens.test.ts
git commit -m "feat: add JWT token sign/verify utilities using jose"
```

---

### Task 6: Middleware Stack

**Files:**
- Create: `src/shared/middleware/auth.ts`, `src/shared/middleware/role-guard.ts`, `src/shared/middleware/project-access.ts`, `src/shared/middleware/validate.ts`, `src/shared/middleware/rate-limiter.ts`, `src/shared/middleware/api-handler.ts`

- [ ] **Step 1: Create auth middleware**

```typescript
// src/shared/middleware/auth.ts
import { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/shared/lib/tokens';
import type { Role } from '@/shared/utils/constants';

export interface AuthenticatedUser {
  userId: string;
  role: Role;
}

export async function authenticate(req: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);
  try {
    return await verifyAccessToken(token);
  } catch {
    throw new AuthError('Invalid or expired access token');
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
```

- [ ] **Step 2: Create role guard middleware**

```typescript
// src/shared/middleware/role-guard.ts
import type { Role } from '@/shared/utils/constants';
import type { AuthenticatedUser } from './auth';

export class ForbiddenError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function requireRole(...roles: Role[]) {
  return (user: AuthenticatedUser): void => {
    if (!roles.includes(user.role)) {
      throw new ForbiddenError(`Role '${user.role}' cannot access this resource`);
    }
  };
}
```

- [ ] **Step 3: Create validation middleware**

```typescript
// src/shared/middleware/validate.ts
import { ZodSchema, ZodError } from 'zod';

export class ValidationError extends Error {
  details: { field: string; message: string }[];

  constructor(error: ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    super('Validation failed');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, params: URLSearchParams): T {
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}
```

- [ ] **Step 4: Create rate limiter**

```typescript
// src/shared/middleware/rate-limiter.ts
import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export class RateLimitError extends Error {
  constructor() {
    super('Too many requests');
    this.name = 'RateLimitError';
  }
}

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: NextRequest): void => {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const key = `${ip}:${req.nextUrl.pathname}`;
    const now = Date.now();

    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      throw new RateLimitError();
    }
  };
}
```

- [ ] **Step 5: Create api-handler wrapper**

This is the most critical file — every route uses it.

```typescript
// src/shared/middleware/api-handler.ts
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { connectDB } from '@/shared/database/connection';
import { authenticate, AuthError, type AuthenticatedUser } from './auth';
import { validateBody, validateQuery, ValidationError } from './validate';
import { ForbiddenError } from './role-guard';
import { RateLimitError } from './rate-limiter';
import { apiSuccess, apiError } from '@/shared/utils/api-response';
import { ERROR_STATUS_MAP } from '@/shared/types/api.types';

interface HandlerContext {
  params: Record<string, string>;
  user: AuthenticatedUser;
  body: unknown;
  query: unknown;
}

interface HandlerConfig {
  auth?: boolean;
  middleware?: ((user: AuthenticatedUser) => void)[];
  validate?: {
    body?: ZodSchema;
    query?: ZodSchema;
  };
  rateLimit?: (req: NextRequest) => void;
  handler: (
    req: NextRequest,
    ctx: HandlerContext,
  ) => Promise<{ data?: unknown; status?: number }>;
}

export function apiHandler(config: HandlerConfig) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      await connectDB();

      // Rate limiting
      if (config.rateLimit) {
        config.rateLimit(req);
      }

      // Authentication (default: required)
      let user: AuthenticatedUser = { userId: '', role: 'internal' };
      if (config.auth !== false) {
        user = await authenticate(req);
      }

      // Role/access middleware
      if (config.middleware) {
        for (const mw of config.middleware) {
          mw(user);
        }
      }

      // Validation
      let body: unknown;
      let query: unknown;
      if (config.validate?.body) {
        const rawBody = await req.json().catch(() => ({}));
        body = validateBody(config.validate.body, rawBody);
      }
      if (config.validate?.query) {
        query = validateQuery(config.validate.query, req.nextUrl.searchParams);
      }

      // Resolve params
      const params = await context.params;

      // Execute handler
      const result = await config.handler(req, { params, user, body, query });
      const status = result.status ?? 200;

      return NextResponse.json(apiSuccess(result.data), { status });
    } catch (error) {
      return handleError(error);
    }
  };
}

function handleError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      apiError('UNAUTHORIZED', error.message),
      { status: ERROR_STATUS_MAP.UNAUTHORIZED },
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      apiError('FORBIDDEN', error.message),
      { status: ERROR_STATUS_MAP.FORBIDDEN },
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      apiError('VALIDATION_ERROR', error.message, error.details),
      { status: ERROR_STATUS_MAP.VALIDATION_ERROR },
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      apiError('RATE_LIMITED', error.message),
      { status: ERROR_STATUS_MAP.RATE_LIMITED },
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      apiError('NOT_FOUND', error.message),
      { status: ERROR_STATUS_MAP.NOT_FOUND },
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      apiError('CONFLICT', error.message),
      { status: ERROR_STATUS_MAP.CONFLICT },
    );
  }

  console.error('Unhandled error:', error);
  return NextResponse.json(
    apiError('INTERNAL_ERROR', 'An unexpected error occurred'),
    { status: ERROR_STATUS_MAP.INTERNAL_ERROR },
  );
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
```

- [ ] **Step 6: Create health check route to verify the middleware works**

```typescript
// src/app/api/v1/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
  });
}
```

- [ ] **Step 7: Test health endpoint manually**

```bash
npm run dev &
curl http://localhost:3000/api/v1/health
```
Expected: `{"success":true,"data":{"status":"ok","timestamp":"..."}}`

- [ ] **Step 8: Commit**

```bash
git add src/shared/middleware/ src/app/api/v1/health/
git commit -m "feat: add middleware stack (auth, role-guard, validation, rate-limiter, api-handler)"
```

---

### Task 7: User Model & Auth Service

**Files:**
- Create: `src/modules/users/user.model.ts`, `src/modules/users/user.types.ts`, `src/modules/auth/auth.service.ts`, `src/modules/auth/auth.validator.ts`, `src/modules/auth/auth.types.ts`
- Test: `tests/unit/modules/auth/auth.service.test.ts`

- [ ] **Step 1: Create user types**

```typescript
// src/modules/users/user.types.ts
import type { Role } from '@/shared/utils/constants';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  skills: string[];
  avatar?: string;
  isActive: boolean;
  inviteToken?: string;
  inviteExpiresAt?: Date;
  resetToken?: string;
  resetExpiresAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<IUser, 'password' | 'inviteToken' | 'inviteExpiresAt' | 'resetToken' | 'resetExpiresAt'>;
```

- [ ] **Step 2: Create user model**

```typescript
// src/modules/users/user.model.ts
import mongoose, { Schema, model, models, type Document } from 'mongoose';
import type { IUser } from './user.types';
import { ROLES } from '@/shared/utils/constants';

export type UserDocument = IUser & Document;

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'internal' },
    skills: [{ type: String, trim: true }],
    avatar: String,
    isActive: { type: Boolean, default: true },
    inviteToken: { type: String, select: false },
    inviteExpiresAt: { type: Date, select: false },
    resetToken: { type: String, select: false },
    resetExpiresAt: { type: Date, select: false },
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.inviteToken;
        delete ret.inviteExpiresAt;
        delete ret.resetToken;
        delete ret.resetExpiresAt;
        delete ret.__v;
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 });
userSchema.index({ inviteToken: 1 });

export const UserModel = (models.User as mongoose.Model<UserDocument>) || model<UserDocument>('User', userSchema);
```

- [ ] **Step 3: Create auth validators**

```typescript
// src/modules/auth/auth.validator.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  inviteToken: z.string().min(1, 'Invite token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

- [ ] **Step 4: Create auth service**

```typescript
// src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { UserModel } from '@/modules/users/user.model';
import { signAccessToken, signRefreshToken } from '@/shared/lib/tokens';
import { NotFoundError, ConflictError } from '@/shared/middleware/api-handler';
import { AuthError } from '@/shared/middleware/auth';
import { TOKEN_EXPIRY } from '@/shared/utils/constants';
import type { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from './auth.validator';

const SALT_ROUNDS = 12;

export const AuthService = {
  async login(data: LoginInput) {
    const user = await UserModel.findOne({ email: data.email, isActive: true })
      .select('+password')
      .lean();

    if (!user) throw new AuthError('Invalid email or password');

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) throw new AuthError('Invalid email or password');

    const tokenPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  },

  async register(data: RegisterInput) {
    const user = await UserModel.findOne({
      inviteToken: data.inviteToken,
      inviteExpiresAt: { $gt: new Date() },
    }).select('+inviteToken +inviteExpiresAt');

    if (!user) throw new NotFoundError('Invalid or expired invite token');

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    user.name = data.name;
    user.password = hashedPassword;
    user.inviteToken = undefined;
    user.inviteExpiresAt = undefined;
    await user.save();

    const tokenPayload = { userId: user._id.toString(), role: user.role };
    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    return { user: user.toJSON(), accessToken, refreshToken };
  },

  async forgotPassword(data: ForgotPasswordInput) {
    const user = await UserModel.findOne({ email: data.email, isActive: true });
    if (!user) return; // Don't reveal if email exists

    const resetToken = nanoid(48);
    const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);

    user.resetToken = hashedToken;
    user.resetExpiresAt = new Date(Date.now() + TOKEN_EXPIRY.RESET);
    await user.save();

    // TODO: Send email with reset link containing resetToken
    return resetToken; // Return for now; email service sends in production
  },

  async resetPassword(data: ResetPasswordInput) {
    const users = await UserModel.find({
      resetExpiresAt: { $gt: new Date() },
    }).select('+resetToken +resetExpiresAt');

    let matchedUser = null;
    for (const user of users) {
      if (user.resetToken && await bcrypt.compare(data.token, user.resetToken)) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) throw new NotFoundError('Invalid or expired reset token');

    matchedUser.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    matchedUser.resetToken = undefined;
    matchedUser.resetExpiresAt = undefined;
    await matchedUser.save();
  },
};
```

- [ ] **Step 5: Create auth types**

```typescript
// src/modules/auth/auth.types.ts
import type { SafeUser } from '@/modules/users/user.types';

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/
git commit -m "feat: add user model, auth service, and auth validators"
```

---

### Task 8: Auth API Routes

**Files:**
- Create: `src/app/api/v1/auth/login/route.ts`, `src/app/api/v1/auth/register/route.ts`, `src/app/api/v1/auth/refresh/route.ts`, `src/app/api/v1/auth/forgot-password/route.ts`, `src/app/api/v1/auth/reset-password/route.ts`

- [ ] **Step 1: Create login route**

```typescript
// src/app/api/v1/auth/login/route.ts
import { NextResponse } from 'next/server';
import { serialize } from 'cookie';
import { apiHandler } from '@/shared/middleware/api-handler';
import { AuthService } from '@/modules/auth/auth.service';
import { loginSchema } from '@/modules/auth/auth.validator';

export const POST = apiHandler({
  auth: false,
  validate: { body: loginSchema },
  handler: async (_req, { body }) => {
    const result = await AuthService.login(body as any);

    const cookie = serialize('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    const response = NextResponse.json(
      { success: true, data: { user: result.user, accessToken: result.accessToken } },
      { status: 200 },
    );
    response.headers.set('Set-Cookie', cookie);
    return { data: { user: result.user, accessToken: result.accessToken } };
  },
});
```

Note: The cookie needs to be set on the response directly, so this route is an exception that constructs its own response for the cookie. Refactor `apiHandler` to support response headers, or handle it as a special case in the handler.

- [ ] **Step 2: Create register route**

```typescript
// src/app/api/v1/auth/register/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { AuthService } from '@/modules/auth/auth.service';
import { registerSchema } from '@/modules/auth/auth.validator';

export const POST = apiHandler({
  auth: false,
  validate: { body: registerSchema },
  handler: async (_req, { body }) => {
    const result = await AuthService.register(body as any);
    return { data: { user: result.user, accessToken: result.accessToken }, status: 201 };
  },
});
```

- [ ] **Step 3: Create refresh route**

```typescript
// src/app/api/v1/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { connectDB } from '@/shared/database/connection';
import { verifyRefreshToken, signAccessToken } from '@/shared/lib/tokens';
import { UserModel } from '@/modules/users/user.model';
import { apiSuccess, apiError } from '@/shared/utils/api-response';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const cookieHeader = req.headers.get('cookie') ?? '';
    const cookies = parse(cookieHeader);
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) {
      return NextResponse.json(apiError('UNAUTHORIZED', 'No refresh token'), { status: 401 });
    }

    const payload = await verifyRefreshToken(refreshToken);
    const user = await UserModel.findOne({ _id: payload.userId, isActive: true }).lean();

    if (!user) {
      return NextResponse.json(apiError('UNAUTHORIZED', 'User not found or inactive'), { status: 401 });
    }

    const accessToken = await signAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return NextResponse.json(apiSuccess({ accessToken, user }));
  } catch {
    return NextResponse.json(apiError('UNAUTHORIZED', 'Invalid refresh token'), { status: 401 });
  }
}
```

- [ ] **Step 4: Create forgot-password and reset-password routes**

```typescript
// src/app/api/v1/auth/forgot-password/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { AuthService } from '@/modules/auth/auth.service';
import { forgotPasswordSchema } from '@/modules/auth/auth.validator';

export const POST = apiHandler({
  auth: false,
  validate: { body: forgotPasswordSchema },
  handler: async (_req, { body }) => {
    await AuthService.forgotPassword(body as any);
    return { data: { message: 'If that email exists, a reset link has been sent' } };
  },
});
```

```typescript
// src/app/api/v1/auth/reset-password/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { AuthService } from '@/modules/auth/auth.service';
import { resetPasswordSchema } from '@/modules/auth/auth.validator';

export const POST = apiHandler({
  auth: false,
  validate: { body: resetPasswordSchema },
  handler: async (_req, { body }) => {
    await AuthService.resetPassword(body as any);
    return { data: { message: 'Password has been reset successfully' } };
  },
});
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/auth/
git commit -m "feat: add auth API routes (login, register, refresh, forgot/reset password)"
```

---

### Task 9: User Management Routes

**Files:**
- Create: `src/modules/users/user.service.ts`, `src/modules/users/user.validator.ts`, `src/app/api/v1/users/route.ts`, `src/app/api/v1/users/invite/route.ts`, `src/app/api/v1/users/me/route.ts`

- [ ] **Step 1: Create user validator**

```typescript
// src/modules/users/user.validator.ts
import { z } from 'zod';
import { ROLES } from '@/shared/utils/constants';

export const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional(),
  skills: z.array(z.string().trim()).optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(ROLES).optional(),
  search: z.string().optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

- [ ] **Step 2: Create user service**

```typescript
// src/modules/users/user.service.ts
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { UserModel } from './user.model';
import { ConflictError, NotFoundError } from '@/shared/middleware/api-handler';
import { TOKEN_EXPIRY, PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { InviteUserInput, UpdateProfileInput } from './user.validator';

export const UserService = {
  async list(query: { page?: number; limit?: number; role?: string; search?: string }) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = Math.min(query.limit ?? PAGINATION_DEFAULTS.LIMIT, PAGINATION_DEFAULTS.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      UserModel.countDocuments(filter),
    ]);

    return { users, page, limit, total };
  },

  async invite(data: InviteUserInput) {
    const existing = await UserModel.findOne({ email: data.email });
    if (existing) throw new ConflictError('A user with this email already exists');

    const inviteToken = nanoid(48);
    const user = await UserModel.create({
      email: data.email,
      role: data.role,
      name: 'Invited User',
      password: await bcrypt.hash(nanoid(32), 12), // placeholder
      inviteToken,
      inviteExpiresAt: new Date(Date.now() + TOKEN_EXPIRY.INVITE),
    });

    // TODO: Send invite email
    return { user: user.toJSON(), inviteToken };
  },

  async getById(id: string) {
    const user = await UserModel.findById(id).lean();
    if (!user) throw new NotFoundError('User');
    return user;
  },

  async updateProfile(id: string, data: UpdateProfileInput) {
    const user = await UserModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
    if (!user) throw new NotFoundError('User');
    return user;
  },

  async deactivate(id: string) {
    const user = await UserModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
    if (!user) throw new NotFoundError('User');
    return user;
  },
};
```

- [ ] **Step 3: Create user API routes**

```typescript
// src/app/api/v1/users/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { UserService } from '@/modules/users/user.service';
import { userQuerySchema } from '@/modules/users/user.validator';
import { paginatedSuccess } from '@/shared/utils/api-response';

export const GET = apiHandler({
  middleware: [requireRole('admin')],
  validate: { query: userQuerySchema },
  handler: async (_req, { query }) => {
    const result = await UserService.list(query as any);
    return {
      data: paginatedSuccess(result.users, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      }).data,
    };
  },
});
```

```typescript
// src/app/api/v1/users/invite/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { UserService } from '@/modules/users/user.service';
import { inviteUserSchema } from '@/modules/users/user.validator';

export const POST = apiHandler({
  middleware: [requireRole('admin')],
  validate: { body: inviteUserSchema },
  handler: async (_req, { body }) => {
    const result = await UserService.invite(body as any);
    return { data: result, status: 201 };
  },
});
```

```typescript
// src/app/api/v1/users/me/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { UserService } from '@/modules/users/user.service';
import { updateProfileSchema } from '@/modules/users/user.validator';

export const GET = apiHandler({
  handler: async (_req, { user }) => {
    const profile = await UserService.getById(user.userId);
    return { data: profile };
  },
});

export const PATCH = apiHandler({
  validate: { body: updateProfileSchema },
  handler: async (_req, { user, body }) => {
    const updated = await UserService.updateProfile(user.userId, body as any);
    return { data: updated };
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/users/ src/app/api/v1/users/
git commit -m "feat: add user service and API routes (list, invite, profile)"
```

---

### Task 10: Project Model, Service & Routes

**Files:**
- Create: `src/modules/projects/project.model.ts`, `src/modules/projects/project.types.ts`, `src/modules/projects/project.service.ts`, `src/modules/projects/project.validator.ts`, `src/app/api/v1/projects/route.ts`, `src/app/api/v1/projects/[id]/route.ts`, `src/app/api/v1/projects/[id]/members/route.ts`

- [ ] **Step 1: Create project types and model**

```typescript
// src/modules/projects/project.types.ts
export interface IProject {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  status: 'active' | 'archived';
  owner: string;
  members: string[];
  clients: string[];
  githubRepos: { owner: string; repo: string; installationId?: string }[];
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
// src/modules/projects/project.model.ts
import mongoose, { Schema, model, models, type Document } from 'mongoose';
import type { IProject } from './project.types';

export type ProjectDocument = IProject & Document;

const projectSchema = new Schema<ProjectDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    clients: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    githubRepos: [{
      owner: String,
      repo: String,
      installationId: String,
    }],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

projectSchema.index({ slug: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ clients: 1 });

export const ProjectModel = (models.Project as mongoose.Model<ProjectDocument>) || model<ProjectDocument>('Project', projectSchema);
```

- [ ] **Step 2: Create project validator**

```typescript
// src/modules/projects/project.validator.ts
import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['active', 'archived']).optional(),
  search: z.string().optional(),
});

export const memberActionSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['member', 'client']).default('member'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
```

- [ ] **Step 3: Create project service**

```typescript
// src/modules/projects/project.service.ts
import { nanoid } from 'nanoid';
import { ProjectModel } from './project.model';
import { NotFoundError, ConflictError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { CreateProjectInput, UpdateProjectInput } from './project.validator';
import type { Role } from '@/shared/utils/constants';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .concat('-', nanoid(6));
}

export const ProjectService = {
  async create(data: CreateProjectInput, userId: string) {
    const slug = slugify(data.name);
    const project = await ProjectModel.create({
      ...data,
      slug,
      owner: userId,
      members: [userId],
    });
    return project.toJSON();
  },

  async list(
    query: { page?: number; limit?: number; status?: string; search?: string },
    userId: string,
    role: Role,
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = Math.min(query.limit ?? PAGINATION_DEFAULTS.LIMIT, PAGINATION_DEFAULTS.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };

    // Non-admins only see projects they belong to
    if (role !== 'admin') {
      if (role === 'client') {
        filter.clients = userId;
      } else {
        filter.members = userId;
      }
    }

    const [projects, total] = await Promise.all([
      ProjectModel.find(filter)
        .populate('owner', 'name email avatar')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProjectModel.countDocuments(filter),
    ]);

    return { projects, page, limit, total };
  },

  async getById(id: string) {
    const project = await ProjectModel.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar role')
      .populate('clients', 'name email avatar')
      .lean();
    if (!project) throw new NotFoundError('Project');
    return project;
  },

  async update(id: string, data: UpdateProjectInput) {
    const project = await ProjectModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
    if (!project) throw new NotFoundError('Project');
    return project;
  },

  async addMember(projectId: string, userId: string, role: 'member' | 'client') {
    const field = role === 'client' ? 'clients' : 'members';
    const project = await ProjectModel.findByIdAndUpdate(
      projectId,
      { $addToSet: { [field]: userId } },
      { new: true },
    ).lean();
    if (!project) throw new NotFoundError('Project');
    return project;
  },

  async removeMember(projectId: string, userId: string) {
    const project = await ProjectModel.findByIdAndUpdate(
      projectId,
      { $pull: { members: userId, clients: userId } },
      { new: true },
    ).lean();
    if (!project) throw new NotFoundError('Project');
    return project;
  },

  async checkAccess(projectId: string, userId: string, role: Role): Promise<boolean> {
    if (role === 'admin') return true;
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) throw new NotFoundError('Project');
    const allMembers = [...project.members.map(String), ...project.clients.map(String)];
    return allMembers.includes(userId);
  },
};
```

- [ ] **Step 4: Create project-access middleware**

```typescript
// src/shared/middleware/project-access.ts
import { ProjectService } from '@/modules/projects/project.service';
import { ForbiddenError } from './role-guard';
import type { AuthenticatedUser } from './auth';

export function requireProjectAccess(user: AuthenticatedUser, params?: Record<string, string>): void {
  // This is called as middleware, but needs params which aren't available in the middleware signature.
  // Instead, we'll check access inside apiHandler after params resolve.
  // This function is a placeholder that gets called in the handler.
}

export async function checkProjectAccess(
  projectId: string,
  userId: string,
  role: string,
): Promise<void> {
  const { ProjectService: PS } = await import('@/modules/projects/project.service');
  const hasAccess = await PS.checkAccess(projectId, userId, role as any);
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this project');
  }
}
```

- [ ] **Step 5: Create project API routes**

```typescript
// src/app/api/v1/projects/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { ProjectService } from '@/modules/projects/project.service';
import { createProjectSchema, projectQuerySchema } from '@/modules/projects/project.validator';
import { requireRole } from '@/shared/middleware/role-guard';

export const GET = apiHandler({
  validate: { query: projectQuerySchema },
  handler: async (_req, { user, query }) => {
    const result = await ProjectService.list(query as any, user.userId, user.role);
    return { data: result };
  },
});

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: createProjectSchema },
  handler: async (_req, { user, body }) => {
    const project = await ProjectService.create(body as any, user.userId);
    return { data: project, status: 201 };
  },
});
```

```typescript
// src/app/api/v1/projects/[id]/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { ProjectService } from '@/modules/projects/project.service';
import { updateProjectSchema } from '@/modules/projects/project.validator';
import { checkProjectAccess } from '@/shared/middleware/project-access';

export const GET = apiHandler({
  handler: async (_req, { params, user }) => {
    await checkProjectAccess(params.id, user.userId, user.role);
    const project = await ProjectService.getById(params.id);
    return { data: project };
  },
});

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: updateProjectSchema },
  handler: async (_req, { params, user, body }) => {
    await checkProjectAccess(params.id, user.userId, user.role);
    const project = await ProjectService.update(params.id, body as any);
    return { data: project };
  },
});
```

```typescript
// src/app/api/v1/projects/[id]/members/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { memberActionSchema } from '@/modules/projects/project.validator';
import { checkProjectAccess } from '@/shared/middleware/project-access';

export const POST = apiHandler({
  middleware: [requireRole('admin')],
  validate: { body: memberActionSchema },
  handler: async (_req, { params, body }) => {
    const { userId, role } = body as any;
    const project = await ProjectService.addMember(params.id, userId, role);
    return { data: project };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin')],
  validate: { body: memberActionSchema },
  handler: async (_req, { params, body }) => {
    const { userId } = body as any;
    const project = await ProjectService.removeMember(params.id, userId);
    return { data: project };
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/projects/ src/app/api/v1/projects/ src/shared/middleware/project-access.ts
git commit -m "feat: add project model, service, and API routes (CRUD + members)"
```

---

### Task 11: Test Helpers & Integration Tests

**Files:**
- Create: `tests/helpers/factory.ts`, `tests/helpers/auth.ts`, `tests/helpers/db.ts`, `tests/integration/setup/db.ts`, `tests/integration/api/auth.test.ts`, `tests/integration/api/projects.test.ts`
- Create: `jest.config.ts` (update for path aliases and test setup)

- [ ] **Step 1: Configure Jest**

```typescript
// jest.config.ts
import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: pathsToModuleNameMapper(
    { '@/*': ['./src/*'] },
    { prefix: '<rootDir>/' },
  ),
  setupFilesAfterSetup: [],
  testTimeout: 30000,
};

export default config;
```

- [ ] **Step 2: Create test DB helper**

```typescript
// tests/helpers/db.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

export async function setupTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

export async function teardownTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
}

export async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const col of Object.values(collections)) {
    await col.deleteMany({});
  }
}
```

- [ ] **Step 3: Create test factory**

```typescript
// tests/helpers/factory.ts
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { UserModel } from '@/modules/users/user.model';
import { ProjectModel } from '@/modules/projects/project.model';
import type { Role } from '@/shared/utils/constants';

const DEFAULT_PASSWORD = 'TestPassword1';

export async function createUser(overrides: Record<string, unknown> = {}) {
  const defaults = {
    name: 'Test User',
    email: `user-${new Types.ObjectId()}@test.com`,
    password: await bcrypt.hash(DEFAULT_PASSWORD, 4), // low rounds for speed
    role: 'internal' as Role,
    isActive: true,
    skills: [],
  };
  return UserModel.create({ ...defaults, ...overrides });
}

export async function createProject(ownerId: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    name: 'Test Project',
    slug: `test-project-${new Types.ObjectId()}`,
    status: 'active',
    owner: ownerId,
    members: [ownerId],
    clients: [],
    githubRepos: [],
  };
  return ProjectModel.create({ ...defaults, ...overrides });
}

export { DEFAULT_PASSWORD };
```

- [ ] **Step 4: Create auth test helper**

```typescript
// tests/helpers/auth.ts
import { signAccessToken } from '@/shared/lib/tokens';
import { createUser } from './factory';
import type { Role } from '@/shared/utils/constants';

export async function getAuthenticatedUser(role: Role = 'internal') {
  const user = await createUser({ role });
  const token = await signAccessToken({ userId: user._id.toString(), role });
  return { user, token };
}
```

- [ ] **Step 5: Write auth integration tests**

```typescript
// tests/integration/api/auth.test.ts
import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { createUser, DEFAULT_PASSWORD } from '../../helpers/factory';

// Use dynamic imports for Next.js route handlers — exact pattern depends on test runner setup
// This is a skeleton; the actual test harness may use supertest with a custom server or
// direct handler invocation

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('POST /api/v1/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const user = await createUser({ email: 'test@orbiter.io' });
    // Test: call login handler with { email: 'test@orbiter.io', password: DEFAULT_PASSWORD }
    // Assert: status 200, body has accessToken and user object
  });

  it('returns 401 for wrong password', async () => {
    await createUser({ email: 'test@orbiter.io' });
    // Test: call login handler with wrong password
    // Assert: status 401, body.success === false
  });

  it('returns 401 for inactive user', async () => {
    await createUser({ email: 'test@orbiter.io', isActive: false });
    // Test: call login handler
    // Assert: status 401
  });

  it('returns 400 for missing email', async () => {
    // Test: call login handler with no email
    // Assert: status 400, VALIDATION_ERROR
  });
});
```

Note: Integration tests need a test harness that invokes Next.js route handlers. This can be done via `next-test-api-route-handler` package or by creating a lightweight Express wrapper for testing. Add `npm install -D next-test-api-route-handler` and configure accordingly.

- [ ] **Step 6: Commit**

```bash
git add tests/ jest.config.ts
git commit -m "test: add test helpers (factory, db, auth) and auth integration test skeleton"
```

---

### Task 12: Frontend Providers & Auth UI

**Files:**
- Create: `src/components/providers/query-provider.tsx`, `src/components/providers/auth-provider.tsx`, `src/hooks/use-auth.ts`, `src/shared/lib/api-client.ts`, `src/app/layout.tsx` (update), `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create zustand auth store**

```typescript
// src/hooks/use-auth.ts
import { create } from 'zustand';
import type { SafeUser } from '@/modules/users/user.types';

interface AuthState {
  user: SafeUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: SafeUser, token: string) => void;
  clearAuth: () => void;
  setAccessToken: (token: string) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
  setAccessToken: (token) => set({ accessToken: token }),
}));
```

- [ ] **Step 2: Create API client**

```typescript
// src/shared/lib/api-client.ts
import { useAuth } from '@/hooks/use-auth';

const BASE_URL = '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return useAuth.getState().accessToken;
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      const token = data.data.accessToken;
      useAuth.getState().setAuth(data.data.user, token);
      return token;
    } catch {
      return null;
    }
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (res.status === 401 && token) {
      const newToken = await this.refreshToken();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      } else {
        useAuth.getState().clearAuth();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    const json = await res.json();
    if (!json.success) {
      throw new ApiError(json.error.code, json.error.message, json.error.details);
    }
    return json.data;
  }

  get<T>(path: string, params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<T>(`${path}${query}`);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  }

  delete<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });
  }
}

export class ApiError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const api = new ApiClient();
```

- [ ] **Step 3: Create query provider**

```typescript
// src/components/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: Create auth provider**

```typescript
// src/components/providers/auth-provider.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const { setAuth, clearAuth, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setAuth(data.data.user, data.data.accessToken);
        } else {
          clearAuth();
          if (!PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
            router.replace('/login');
          }
        }
      } catch {
        clearAuth();
      } finally {
        setIsChecking(false);
      }
    }

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-page">
        <div className="skeleton h-8 w-32 rounded-md" />
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Update root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/components/providers/query-provider';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Orbiter',
  description: 'Internal Project Management Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-page text-primary antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create auth layout and login page**

```typescript
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
```

Create a login page at `src/app/(auth)/login/page.tsx` with:
- Email + password form using `react-hook-form` + `@hookform/resolvers/zod` + `loginSchema`
- Submit calls `api.post('/auth/login', data)`
- On success: `setAuth(user, token)` then `router.push('/')`
- Error state shown below form
- Styled with Orbiter design tokens (bg-surface, border-subtle, accent buttons, etc.)
- Link to forgot-password

- [ ] **Step 7: Create dashboard layout (shell)**

```typescript
// src/app/(dashboard)/layout.tsx
import { AuthProvider } from '@/components/providers/auth-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen">
        {/* Sidebar placeholder — built in Task 13 */}
        <aside className="w-60 shrink-0 border-r border-subtle bg-surface" />
        <main className="flex-1 overflow-y-auto bg-page">{children}</main>
      </div>
    </AuthProvider>
  );
}
```

- [ ] **Step 8: Create dashboard home page (project list)**

```typescript
// src/app/(dashboard)/page.tsx
'use client';

import { useProjects } from '@/hooks/queries/use-projects';

export default function DashboardPage() {
  const { data, isLoading } = useProjects();

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
      {/* Project list — built out in later tasks */}
    </div>
  );
}
```

- [ ] **Step 9: Create projects React Query hook**

```typescript
// src/hooks/queries/use-projects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';

export function useProjects(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => api.get('/projects', filters),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

- [ ] **Step 10: Commit**

```bash
git add src/components/ src/hooks/ src/shared/lib/api-client.ts src/app/
git commit -m "feat: add auth UI, providers, API client, and dashboard shell"
```

---

### Task 13: Dashboard Sidebar & Topbar

**Files:**
- Create: `src/components/layouts/dashboard-sidebar.tsx`, `src/components/layouts/topbar.tsx`

- [ ] **Step 1: Build the sidebar component**

Build `src/components/layouts/dashboard-sidebar.tsx` with:
- Orbiter logo/name at top
- Search trigger (shows `Cmd+K` hint, opens command palette later)
- Favorites section (hardcoded empty for now)
- Projects section (from `useProjects()` hook)
  - Each project shows a colored dot + name
  - Active project highlighted with `bg-muted`
- "My Work" link
- Settings link at bottom
- Collapsible (200ms linear width transition)
- All styled with design tokens: `bg-surface`, `border-subtle`, sidebar nav items per DESIGN_SYSTEM.md

- [ ] **Step 2: Build the topbar component**

Build `src/components/layouts/topbar.tsx` with:
- Current page/project title (left)
- Right side: notification bell (placeholder) + user avatar (Boring Avatars)
- Styled per design tokens: `bg-surface`, `border-subtle`

- [ ] **Step 3: Wire sidebar and topbar into dashboard layout**

Update `src/app/(dashboard)/layout.tsx` to use the real sidebar and topbar components instead of the placeholder `<aside>`.

- [ ] **Step 4: Verify visually**

```bash
npm run dev
```
Login and verify: sidebar shows on the left, topbar at top, content area fills remaining space. Colors match the design system.

- [ ] **Step 5: Commit**

```bash
git add src/components/layouts/ src/app/(dashboard)/layout.tsx
git commit -m "feat: add dashboard sidebar and topbar with design system styling"
```

---

### Task 14: Shadcn UI Setup & README

**Files:**
- Create: Shadcn config + initial components, `README.md`

- [ ] **Step 1: Initialize Shadcn**

```bash
npx shadcn@latest init
```

Configure: New York style, CSS variables, `@/components/ui` path, tailwind config path.

- [ ] **Step 2: Install essential Shadcn components**

```bash
npx shadcn@latest add button input label card dialog dropdown-menu select badge toast skeleton tabs separator avatar tooltip
```

- [ ] **Step 3: Customize Shadcn components with Orbiter tokens**

Update each installed component in `src/components/ui/` to use Orbiter CSS variables instead of Shadcn defaults. Key changes:
- Replace `bg-background` → `bg-surface`
- Replace `text-foreground` → `text-primary`
- Replace `border-border` → `border-default`
- Replace default radii with `rounded-md` (6px)
- Replace focus rings with Orbiter focus style
- Button active state: `active:scale-[0.98]`

- [ ] **Step 4: Create README.md**

Write a comprehensive README covering:
- Project name, description, tech stack
- Prerequisites (Node 20+, MongoDB)
- Quick start (clone, install, env setup, dev server)
- Project structure overview
- Available scripts
- Architecture summary (domain modules, middleware stack)
- Testing instructions
- Contributing guidelines
- License

- [ ] **Step 5: Create .env.example if not already present**

Verify `.env.example` exists with all required variables documented.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add Shadcn UI with Orbiter theme customization and README"
```

---

## Plan Summary

| Task | Description | Estimated Time |
|------|-------------|---------------|
| 1 | Project scaffold & config | 15 min |
| 2 | CLAUDE.md & AGENTS.md | 10 min |
| 3 | Theme system & global styles | 20 min |
| 4 | Database connection & shared types | 15 min |
| 5 | JWT token utilities | 10 min |
| 6 | Middleware stack | 25 min |
| 7 | User model & auth service | 25 min |
| 8 | Auth API routes | 15 min |
| 9 | User management routes | 15 min |
| 10 | Project model, service & routes | 25 min |
| 11 | Test helpers & integration tests | 20 min |
| 12 | Frontend providers & auth UI | 30 min |
| 13 | Dashboard sidebar & topbar | 20 min |
| 14 | Shadcn UI setup & README | 20 min |

**Total: ~4.5 hours**

After this plan is complete, the foundation is ready and we branch into parallel worktrees for Plans 2-4.
