# Orbiter — Technical Design Specification

**v1.0 | April 24, 2026**
**Product:** Orbiter — Internal Project Management Platform
**Companion Docs:** [PRD](../../../PRD.md) · [SPEC](../../../SPEC.md) · [Design System](../../../DESIGN_SYSTEM.md)

---

## Overview

Orbiter is a single-org, internal project management SaaS combining an interconnected project database, a Chrome extension for one-click bug capture, and ChatGPT-powered AI agents that automate ~70% of project management overhead. Clients get a clean read-only portal; the team gets full control.

**Build Phases:**
1. Core Platform (Auth, Projects, Epics, Tasks, Sprints, Bugs, Views, Docs, Env Vars, Links, Client Portal, Notifications)
2. Chrome Extension (Bug capture, Deepgram voice, extension auth)
3. AI Agents (GitHub Sync, Priority Detection, Sprint Assignment, Status Update)

---

## 1. Stack & Dependencies

### Core

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, SSR, TypeScript) |
| UI | React 19, Tailwind CSS 4, Shadcn/ui (customized tokens) |
| Database | MongoDB (Mongoose 8) via MongoDB Atlas |
| Auth | Email/password, bcryptjs, jose (JWT), httpOnly cookies |
| Storage | Cloudflare R2 (S3-compatible, zero egress fees) |
| AI | ChatGPT via per-user OAuth (Device Code Flow, RFC 8628) |
| Voice | Deepgram real-time WebSocket |
| Email | Resend |
| Deploy | Vercel |

### Full Dependency List

```
Core:        next@15, react@19, typescript@5, tailwindcss@4
DB:          mongoose@8
Auth:        bcryptjs, jose, cookie
Validation:  zod
UI:          @radix-ui/* (via shadcn), @phosphor-icons/react,
             class-variance-authority, clsx, tailwind-merge
Data:        @tanstack/react-query, zustand
Forms:       react-hook-form, @hookform/resolvers
Animation:   framer-motion
DnD:         @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
Charts:      tremor
Editor:      @tiptap/react, @tiptap/starter-kit
Search:      fuse.js
Avatars:     boring-avatars
Storage:     @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, sharp
Email:       resend
Testing:     jest, @testing-library/react, supertest,
             playwright, mongodb-memory-server
Linting:     eslint, prettier, eslint-config-next
Utils:       date-fns, nanoid
Scheduling:  Vercel Cron
```

---

## 2. Project Structure

```
orbiter/
├── src/
│   ├── app/                          ← Next.js App Router (routes + pages)
│   │   ├── api/v1/                   ← REST API endpoints
│   │   ├── (auth)/                   ← Public: login, register, reset
│   │   ├── (dashboard)/              ← Protected: internal + admin
│   │   ├── (portal)/                 ← Protected: client read-only
│   │   └── (admin)/                  ← Protected: admin-only
│   │
│   ├── modules/                      ← Domain business logic
│   │   ├── auth/                     ← auth.service, auth.validator, auth.types
│   │   ├── users/
│   │   ├── projects/
│   │   ├── epics/
│   │   ├── tasks/
│   │   ├── sprints/
│   │   ├── bugs/
│   │   ├── docs/
│   │   ├── links/
│   │   ├── env-variables/
│   │   ├── notifications/
│   │   ├── comments/
│   │   └── ai/                       ← OpenAI OAuth, Codex client, agents
│   │
│   ├── shared/                       ← Cross-cutting concerns
│   │   ├── database/                 ← Connection config
│   │   ├── middleware/               ← auth, role-guard, project-access, rate-limiter, validate, api-handler
│   │   ├── lib/                      ← Storage (R2), email, encryption
│   │   ├── types/                    ← Shared TypeScript types, API response types
│   │   └── utils/                    ← Helpers, constants
│   │
│   ├── components/                   ← UI layer
│   │   ├── ui/                       ← Shadcn primitives (customized)
│   │   ├── layouts/                  ← Dashboard sidebar, portal sidebar, topbar, project tabs
│   │   ├── shared/                   ← DataTable, EmptyState, ConfirmDialog, Pagination, FileUpload, Skeleton
│   │   └── features/                 ← Domain-specific UI (tasks/, projects/, sprints/, bugs/, etc.)
│   │
│   ├── hooks/                        ← React hooks
│   │   └── queries/                  ← React Query hooks per domain
│   │
│   ├── styles/                       ← Theme system
│   │   ├── themes/                   ← Swappable palette files (indigo.ts, etc.)
│   │   ├── theme.config.ts           ← Active theme selection + CSS variable generator
│   │   └── globals.css               ← Tailwind + theme tokens + animations
│   │
│   └── config/                       ← App config, env validation
│
├── tests/
│   ├── unit/                         ← Mirrors src/modules structure
│   ├── integration/                  ← API endpoint tests (Supertest + mongodb-memory-server)
│   ├── e2e/                          ← Playwright browser tests
│   └── helpers/                      ← Factories, auth helpers, DB setup
│
├── docs/
│   ├── api/openapi.yaml              ← OpenAPI 3.1 spec
│   └── superpowers/specs/            ← Design specs
│
├── .github/workflows/ci.yml          ← Lint + test + build pipeline
├── CLAUDE.md
├── AGENTS.md
├── README.md
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── jest.config.ts
├── playwright.config.ts
└── package.json
```

### Module Pattern (every domain module)

```
modules/<domain>/
├── <domain>.model.ts          ← Mongoose schema + model export
├── <domain>.service.ts        ← Business logic (CRUD + domain rules)
├── <domain>.validator.ts      ← Zod schemas (create, update, query)
└── <domain>.types.ts          ← TypeScript interfaces
```

---

## 3. Auth & Middleware

### Token Strategy

| Token | Storage | Expiry | Purpose |
|-------|---------|--------|---------|
| Access Token | In-memory (zustand) | 15 min | API authorization |
| Refresh Token | httpOnly secure cookie | 7 days | Silent access token renewal |

- Access token in memory: immune to XSS, dies on tab close, recovered via refresh.
- Refresh token in httpOnly cookie: invisible to JS, only sent to `/api/v1/auth/refresh`.
- No localStorage for tokens.

### Auth Flows

**Registration (invite-only):** Admin creates invite → email with token → user sets name + password → bcrypt hash stored → JWT pair issued.

**Login:** `POST /api/v1/auth/login` → bcrypt.compare → issue token pair → return user.

**Refresh:** `POST /api/v1/auth/refresh` → verify cookie → issue new access token.

**Password Reset:** Forgot password → nanoid reset token (1hr, hashed in DB) → email link → verify + update password → invalidate all refresh tokens.

### Middleware Stack

```
src/shared/middleware/
├── auth.ts              ← JWT verification, attaches user to request
├── role-guard.ts        ← requireRole('admin') / requireRole('internal')
├── project-access.ts    ← requireProjectAccess() — member/client check
├── rate-limiter.ts      ← Per-IP (auth: 10/min) and per-user (API: 100/min)
├── validate.ts          ← Generic Zod validation wrapper
└── api-handler.ts       ← Wraps handlers: middleware → validate → handler → response → error catch
```

### Route Handler Pattern

```typescript
export const POST = apiHandler({
  middleware: [authenticate, requireProjectAccess],
  validate: { body: createTaskSchema },
  handler: async (req, { params, user, body }) => {
    const task = await TaskService.create(params.id, body, user.id);
    return { data: task, status: 201 };
  },
});
```

Every route follows this pattern. No exceptions.

### Role-Based Routing

| Route Group | Roles | Layout |
|------------|-------|--------|
| `(auth)` | Public | Centered card, no sidebar |
| `(dashboard)` | admin, internal | Sidebar + topbar + AuthProvider gate |
| `(portal)` | client | Simplified sidebar, read-only |
| `(admin)` | admin | Full sidebar, admin-only nav |

### AuthProvider Gate

On mount: call `/auth/refresh` silently → if success, store user + token in zustand → render children. If fail, redirect to `/login`. While checking, show full-page loading skeleton. Global React Query error handler: on 401 → try refresh once → if still 401 → logout + redirect.

---

## 4. Data Models (15 Collections)

### users

```
name, email (unique, lowercase), password (bcrypt), role (admin/internal/client),
skills[], avatar?, chatgptOAuth?, githubOAuth?, inviteToken?, inviteExpiresAt?,
resetToken? (hashed), resetExpiresAt?, isActive (default: true), lastLoginAt?, timestamps
Indexes: { email: 1 }, { inviteToken: 1 }
.toJSON() strips password + tokens
```

### projects

```
name, description?, slug (unique, auto from name), status (active/archived),
owner → User, members[] → Users, clients[] → Users,
githubRepos [{ owner, repo, installationId? }], timestamps
Indexes: { slug: 1 }, { members: 1 }, { clients: 1 }
```

### epics

```
title, description?, project → Project, owner → User,
status (planning/active/done), startDate?, endDate?,
progress (0-100, computed in service), timestamps
Indexes: { project: 1, status: 1 }
```

### tasks

```
title, description?, type (feature/chore/improvement),
priority (P0-P3), prioritySource (ai/manual/default),
status (backlog/todo/in_progress/review/done),
project → Project, epic? → Epic, sprint? → Sprint, assignee? → User,
tags[], clientVisible (default: false), linkedBugs[] → Bugs,
order (number, for drag-and-drop), timestamps
Indexes: { project: 1, status: 1 }, { sprint: 1 }, { epic: 1 }, { assignee: 1 }
Compound: { project: 1, status: 1, order: 1 }
```

### sprints

```
name (auto: "Sprint 1", "Sprint 2"), goal?, project → Project,
startDate (Monday), endDate (Friday),
status (planning/active/closed),
velocity { planned, completed }, retroNotes?, timestamps
Indexes: { project: 1, status: 1 }
Business rule: only ONE active sprint per project (enforced in service)
```

### bugs

```
title, description?, priority (P0-P3),
status (open/investigating/resolved/closed),
source (manual/extension), project → Project, reporter → User, task? → Task,
metadata { url?, consoleLogs?, screenshot? (R2 URL), device?, browser?, os?,
           viewport? { width, height }, ip? },
timestamps
Indexes: { project: 1, status: 1 }, { task: 1 }
```

### docs

```
title, content (TipTap JSON block tree), contentPlaintext (for search),
project → Project, author → User,
linkedTo [{ type: 'epic'|'task'|'sprint', ref: ObjectId }], timestamps
Indexes: { project: 1 }, { contentPlaintext: 'text', title: 'text' }
```

### links

```
label, url, type (production/staging/figma/api_docs/repository/other),
project → Project, timestamps
Indexes: { project: 1 }
```

### envVariables

```
key, value (AES-256-GCM encrypted), iv, authTag,
environment (dev/staging/prod), project → Project, timestamps
Compound unique: { project: 1, environment: 1, key: 1 }
value NEVER returned in list queries — only via /env/:id/reveal (audited)
```

### notifications

```
user → User, type (bug_created/sprint_closed/task_assigned/invite/
  client_task_done/github_digest/priority_changed),
title, message, link?, read (default: false), emailSent (default: false), timestamps
Indexes: { user: 1, read: 1, createdAt: -1 }
TTL index: auto-delete after 90 days
```

### comments

```
content, author → User, taskId? → Task, bugId? → Bug,
mentions[] → Users, timestamps
Indexes: { taskId: 1, createdAt: 1 }, { bugId: 1, createdAt: 1 }
```

### githubSyncs

```
project → Project,
commits [{ sha, message, author, repo, branch, date }],
summary (ChatGPT-generated), lastSyncAt, timestamps
Indexes: { project: 1, createdAt: -1 }
```

### auditLogs

```
project → Project, userId → User,
action (env_create/env_update/env_delete/env_reveal/env_export),
targetKey, environment (dev/staging/prod), ipAddress?, timestamps
Indexes: { project: 1, createdAt: -1 }
Append-only — no update/delete operations
```

### openaiConnections

```
userId → User (unique), authMethod (manual/oauth-device),
apiKey? (encrypted), accessToken? (encrypted), refreshToken? (encrypted),
idToken?, tokenExpiresAt?, email?, accountId?, planType?,
isActive (default: true), timestamps
Indexes: { userId: 1 }
```

### openaiDeviceSessions

```
userId → User (unique), deviceAuthId, userCode,
codeVerifier?, verificationUrl, expiresAt, pollInterval (default: 5),
status (pending/authorized/expired), createdAt
Indexes: { userId: 1 }
Cleaned up after successful exchange or expiration
```

### Service Layer Rules

- No Mongoose hooks for business logic — all side effects explicit in service methods.
- Services call other services for cross-domain operations.
- Pagination everywhere: `{ data, meta: { page, limit, total } }`. Default 20, max 100.
- Soft operations: users deactivated (not deleted), projects archived (not deleted).

---

## 5. API Design

### Route Structure

All routes versioned under `/api/v1/`.

**Auth:** `POST login` · `register` · `refresh` · `forgot-password` · `reset-password`
**Auth (OpenAI):** `POST openai` · `openai/poll` · `GET openai/status` · `POST openai/disconnect`
**Users:** `GET /users` (admin) · `POST /users/invite` · `GET|PATCH /users/me` · `PATCH /users/:id/role` · `DELETE /users/:id`
**Projects:** `GET|POST /projects` · `GET|PATCH /projects/:id` · `POST|DELETE /projects/:id/members`
**Epics:** `GET|POST /projects/:id/epics` · `GET|PATCH|DELETE /epics/:id`
**Tasks:** `GET|POST /projects/:id/tasks` · `GET|PATCH|DELETE /tasks/:id` · `PATCH /tasks/:id/status` · `PATCH /tasks/bulk`
**Sprints:** `GET|POST /projects/:id/sprints` · `GET|PATCH /sprints/:id` · `POST /sprints/:id/close` · `POST|DELETE /sprints/:id/tasks`
**Bugs:** `GET|POST /projects/:id/bugs` · `GET|PATCH|DELETE /bugs/:id` · `PATCH /bugs/:id/link`
**Docs:** `GET|POST /projects/:id/docs` · `GET /projects/:id/docs/search` · `GET|PATCH|DELETE /docs/:id` · `POST /docs/:id/upload`
**Env Vars:** `GET|POST /projects/:id/env` · `GET /projects/:id/env/export` · `GET /projects/:id/env/audit` · `GET /env/:id/reveal` · `PATCH|DELETE /env/:id`
**Links:** `GET|POST /projects/:id/links` · `PATCH|DELETE /links/:id`
**Notifications:** `GET /notifications` · `GET /notifications/unread-count` · `POST /notifications/mark-all-read` · `PATCH /notifications/:id/read`
**Upload:** `POST /upload` (returns R2 presigned URL)
**Health:** `GET /health` (public)

### Response Contract

```typescript
// Success
{ success: true, data: T, meta?: { page, limit, total, totalPages } }

// Error
{ success: false, error: { code: ErrorCode, message: string, details?: any } }
```

### Error Codes

`VALIDATION_ERROR` (400) · `UNAUTHORIZED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `CONFLICT` (409) · `RATE_LIMITED` (429) · `INTERNAL_ERROR` (500)

### Query Convention (all list endpoints)

```
?page=1&limit=20&status=in_progress&priority=P0&assignee=userId&sort=-createdAt&search=login
```

Default sort: `-createdAt`. Max limit: 100. Prefix `-` for descending.

### Rate Limits

Auth endpoints: 10 req/min per IP. API endpoints: 100 req/min per user. Upload: 20 req/min per user. Health: unlimited.

### Upload Flow (R2 Presigned URLs)

```
Client: POST /api/v1/upload { filename, contentType }
Server: Generate key (uploads/{userId}/{nanoid}-{filename}) → presigned PUT URL (10min expiry) → return { uploadUrl, fileKey, publicUrl }
Client: PUT file directly to R2 → save publicUrl in record
```

---

## 6. Frontend Architecture

### Page Structure

```
(auth)/         login, register/[token], forgot-password, reset-password/[token]
(dashboard)/    projects list, projects/[id]/(board|table|timeline|backlog|sprints|bugs|docs|docs/[docId]|links|env|settings), settings/(profile|chatgpt), admin/(users|audit)
(portal)/       project list, projects/[id]/(overview|board|timeline|links)
```

### Provider Stack

```
<QueryClientProvider>     ← React Query
  <AuthProvider>          ← Silent refresh gate
    <ThemeProvider>        ← Light/dark mode
      {children}
    </ThemeProvider>
  </AuthProvider>
</QueryClientProvider>
```

### Data Fetching Pattern

React Query hooks per domain: `useTasks(projectId, filters)`, `useCreateTask(projectId)`, etc. API client wrapper attaches access token, handles 401 → refresh → retry.

### Key UI Components

**Kanban Board:** `@dnd-kit/core` + `@dnd-kit/sortable` + `framer-motion`. 5 columns (dashboard) or 3 columns (portal). Cards show priority left-border stripe, title, type badge, assignee avatar (Boring Avatars), tags. Optimistic updates via React Query.

**Table View:** Shared `<DataTable>` component. Sortable columns, inline edit (status/priority/assignee dropdowns), bulk select + bulk actions bar. Sticky header with `backdrop-blur-sm`.

**Timeline/Gantt:** Custom with `framer-motion` + `date-fns`. Horizontal time axis (weeks), epic progress bars, sprint boundary markers. Read-only for V1.

**Command Palette (Cmd+K):** `fuse.js` fuzzy search. Jump to any project/task/bug/doc. Quick actions. Positioned above center (top ~38%), `rounded-xl`, `shadow-lg`.

**Rich Doc Editor:** TipTap with starter kit. V1: headings, paragraphs, lists, code blocks, images. Full-text search via `contentPlaintext`.

**Skeleton Loaders:** Custom CSS matching design tokens. `bg-subtle → bg-muted` pulse, 1.5s duration, ease-in-out. Skeletons match the shape of actual content.

**Avatars:** Boring Avatars — geometric patterns generated from user names. Not letter-circle initials.

### Features Added Beyond PRD

| Feature | Impact |
|---------|--------|
| Command Palette (Cmd+K) | 10x navigation speed |
| My Work view | Personal task dashboard across projects |
| Task Comments & Activity | Context stays with tasks, not in Slack |
| Keyboard Shortcuts | Mouse-free workflow |
| Favorites & Recents | 1-click access to frequent destinations |
| Toast + Undo | Safety net without confirmation dialogs |
| Sprint Burndown Chart | At-a-glance sprint health (post-V1) |
| Saved Filter Views | Reusable filter combinations (post-V1) |

---

## 7. Theme System

### Architecture (one-file palette swap)

```
src/styles/
├── themes/
│   ├── indigo.ts        ← Active: muted indigo palette
│   └── [future].ts      ← Swap by changing import in theme.config.ts
├── theme.config.ts      ← Active theme selection + CSS variable generator
└── globals.css          ← Consumes tokens via CSS custom properties
```

Every component uses semantic tokens (`bg-surface`, `text-primary`, `border-subtle`) — never raw hex values. Swapping the palette = changing one import.

### Design Principles

- **Muted indigo accent (#5B5FC7)** — distinctive without being loud
- **Inter Variable** — single typeface, hierarchy via weight + size
- **6px button radius** — signature feel, between Vercel's sharp 4px and bubbly 8px+
- **Barely-there shadows** — depth via background layering, not heavy drop-shadows
- **Dark mode: three background tiers** (#101012 → #18181B → #1F1F24)
- **No gradients, no neon, no glow** — flat fills, muted semantics
- **Phosphor Icons** (6 weights: thin/light/regular/bold/fill/duotone) — not Lucide/Heroicons
- **Boring Avatars** — geometric generated avatars from user names

### Animation Rules

- Only animate `transform` and `opacity`
- Exit faster than enter (120ms exit vs 200ms enter)
- No page transitions (instant route swaps)
- No springs or bounce (smooth ease-out only)
- No loading spinner for operations < 300ms
- Respect `prefers-reduced-motion`
- Theme toggle: View Transitions API circular clip-path expansion (500ms, the ONE expressive animation)

### Anti-Patterns (never do)

Gradient buttons · Neon accents · Oversized radius (16px+) · Heavy visible shadows · Cartoon empty-state illustrations · Rainbow status colors at full brightness · Default unmodified shadcn styling · Multiple typefaces · Layout-shifting hover effects · Decorative borders

Full design token values in [DESIGN_SYSTEM.md](../../../DESIGN_SYSTEM.md).

---

## 8. ChatGPT OAuth Integration

### Device Code Flow (RFC 8628 + PKCE)

Based on production pattern from chain-linked reference.

```
User clicks "Connect ChatGPT"
  → POST /api/v1/auth/openai { mode: 'device-code' }
  → Backend requests device code from OpenAI (auth.openai.com)
  → Returns { userCode, verificationUrl, expiresIn, interval }
  → Frontend displays 8-char code, auto-copies to clipboard
  → Opens auth.openai.com/codex/device in new tab
  → Polls POST /api/v1/auth/openai/poll every 5 seconds
  → On authorization: exchange code for tokens (access + refresh + id_token)
  → Parse JWT claims (email, chatgpt_account_id, chatgpt_plan_type)
  → Store tokens encrypted (AES-256-GCM) in openaiConnections
  → Clean up device session → return success
```

### Making AI Calls

Token resolution priority: OAuth access_token → manual API key → graceful skip.

OAuth calls use Codex Responses API:
```
POST https://chatgpt.com/backend-api/codex/responses
Headers: Authorization: Bearer {access_token}, ChatGPT-Account-ID: {account_id}
Body: { model, instructions, input, store: false, stream: true }
```

Bills against user's ChatGPT subscription — no API keys needed.

### Auto-Refresh (implemented from day one)

When access token expires: use stored refresh_token → `POST https://auth.openai.com/oauth/token` with `grant_type: refresh_token` → update stored tokens → retry original request.

### Fallback

Token expired + refresh fails → skip agent, notify user to reconnect. ChatGPT unavailable → default P2 priority, no sprint suggestion, no status update.

---

## 9. AI Agents

| Agent | Trigger | Input | Output | Fallback |
|-------|---------|-------|--------|----------|
| GitHub Sync | Vercel Cron (6-8hrs) | Commits from GitHub OAuth | Digest notification + email | Skip, log warning |
| Priority Detection | New task created | Task title + description | Auto-set P0-P3, human overridable | Default P2 |
| Sprint Assignment | New task / manual trigger | Priority, team capacity, member skills | Suggestion banner (PM confirms) | No suggestion |
| Status Update | Merged PR detected (during sync) | Branch/PR title → task ID | Task→done, bugs→resolved, client notification | Skip, log warning |

All agents run via the user's own ChatGPT OAuth token. All suggestions are drafts — human always confirms. Never auto-applied (except priority, which is overridable).

Module structure:
```
modules/ai/
├── openai-oauth.ts                ← Device code flow, PKCE, token exchange/refresh
├── openai-connection.model.ts
├── openai-connection.service.ts
├── codex-client.ts                ← Codex Responses API wrapper
└── agents/
    ├── github-sync.agent.ts
    ├── priority-detection.agent.ts
    ├── sprint-assignment.agent.ts
    └── status-update.agent.ts
```

Vercel function timeout: `maxDuration: 300` on the cron route (Pro plan). If exceeded, move to Inngest.

---

## 10. Testing Strategy

### Pyramid

```
Unit (~150):        Services, utils, validators, components (Jest)
Integration (~80):  Every API endpoint (Supertest + mongodb-memory-server)
E2E (~15):          Critical user journeys (Playwright)
```

### Test Structure

```
tests/
├── unit/modules/        ← Mirrors src/modules
├── unit/shared/         ← Middleware, encryption, utils
├── unit/components/     ← Key UI components
├── integration/api/     ← One file per domain (auth, tasks, sprints, etc.)
├── integration/setup/   ← DB lifecycle, fixtures
├── e2e/                 ← auth, kanban, sprint-lifecycle, bug-report, docs, env, client-portal, admin, cmd-k
└── helpers/             ← Factory (test data builders), auth helpers, DB utils, request wrapper
```

### Key Principles

- Integration tests hit a real MongoDB via `mongodb-memory-server`.
- Each test suite gets a fresh database. `clearCollections()` between tests.
- Factory functions: `buildUser()`, `buildProject()`, `buildTask()` — override only what matters.
- E2E tests run against a built app with seeded data.

### CI Pipeline (GitHub Actions)

Lint → Unit tests → Integration tests → E2E tests → Build. All must pass before merge.

---

## 11. Parallel Development Strategy

### Phase A: Sequential (main branch)

Shared foundation everything depends on:
- Project scaffolding, folder structure, CLAUDE.md, AGENTS.md
- Database connection, base Mongoose config
- Shared TypeScript types & interfaces
- Auth system (JWT, middleware, role guards)
- Project CRUD (root entity)
- Theme system + Shadcn setup

### Phase B: Parallel Worktrees (after foundation merges)

```
Stream 1: feature/epics-tasks-sprints
├── Epics CRUD + API
├── Tasks CRUD + Kanban + Table + API
└── Sprints CRUD + close/rollover + API

Stream 2: feature/bugs-notifications
├── Bugs CRUD + API
├── Notifications system + API
└── Bug-Task linking

Stream 3: feature/docs-links-envvars
├── Rich Docs (TipTap editor) + API
├── Links CRUD + API
└── Env Variables (encrypted) + API

Stream 4: feature/client-portal-views
├── Client role routing + portal UI
├── Kanban/Table/Timeline views
└── Client-visible filtering + Command Palette
```

### Phase C: Sequential (merge streams, then)

Integration testing → Chrome Extension (Phase 2) → AI Agents (Phase 3)

---

## 12. Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Auth
JWT_ACCESS_SECRET=<min 32 chars>
JWT_REFRESH_SECRET=<min 32 chars>

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Encryption (for env vars + OAuth tokens)
ENCRYPTION_KEY=<32-byte hex>

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://...

# GitHub OAuth (Phase 3)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# OpenAI (public client ID for device code flow)
OPENAI_CLIENT_ID=app_EMoamEEZ73f0CkXaXp7hrann
```

All validated at startup via Zod schema in `src/config/env.ts`. Missing required var → crash with clear error.

---

## 13. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Domain modules + thin route handlers | Worktree-friendly, natural file sizes, testable services |
| Zod for all validation | Same schemas validate API input and frontend forms |
| No Mongoose hooks for business logic | Hooks hide behavior and make debugging hard |
| React Query for server state | Caching, optimistic updates, background refetch built-in |
| Zustand for client state | Lightweight, simpler than Redux, complements React Query |
| jose over jsonwebtoken | Edge-compatible, works in Next.js middleware on Vercel |
| R2 over S3 | Zero egress fees, S3-compatible API, generous free tier |
| Phosphor over Lucide | 6 weights, 7000+ icons, duotone for active states, less common |
| Boring Avatars | Distinctive geometric avatars, not generic letter circles |
| Single theme file swap | Change one import to change entire color palette |
| mongodb-memory-server for tests | Real MongoDB behavior without external service dependency |
| maxDuration: 300 for AI cron | Handles long-running GitHub sync, Inngest as fallback |
| View Transitions API for theme toggle | One expressive animation; everything else is invisible-fast |
| No page transitions | Speed IS the animation. Instant route swaps feel premium. |
