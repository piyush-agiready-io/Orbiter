# Project Management Platform — Technical Specification

**v1.0 | April 24, 2026 | Om Rajpal, Nitish Srivastava**
**Companion:** [PRD](./2026-04-24-project-management-platform-prd.md)

---

## Stack

- **Frontend:** Next.js 14 (App Router, SSR, TypeScript, Tailwind CSS)
- **Backend:** Node.js via Next.js API routes (REST)
- **Database:** MongoDB + Mongoose
- **Auth:** Email/password, bcrypt, JWT (15min access + 7-day refresh httpOnly cookie)
- **Storage:** AWS S3 (screenshots, attachments)
- **AI:** ChatGPT via per-user OAuth
- **Voice:** Deepgram real-time WebSocket
- **GitHub:** OAuth + polling (6-8hr cron)
- **Email:** SES / Resend / SendGrid (abstracted)
- **Deploy:** Cloud SaaS, single-tenant

## Database — 12 Collections

| Collection | Key Fields |
|------------|-----------|
| `users` | name, email, password (bcrypt), role (admin/internal/client), skills[], chatgptOAuth, githubOAuth |
| `projects` | name, description, status, owner, members[], clients[], githubRepos[] |
| `epics` | title, project, owner, status (planning/active/done), startDate, endDate, progress |
| `tasks` | title, type, priority (P0-P3), prioritySource (ai/manual/default), status (backlog→done), epic, sprint, assignee, tags[], clientVisible, linkedBugs[] |
| `sprints` | name, goal, project, startDate, endDate (Fri), status (planning/active/closed), retroNotes, velocity {planned, completed} |
| `bugs` | title, priority, status (open→closed), source (manual/extension), reporter, task?, metadata {url, consoleLogs, screenshot, device, browser, os, viewport, ip} |
| `docs` | title, content (JSON block tree), contentPlaintext, project, author, linkedTo[] |
| `links` | label, url, type (production/staging/figma/...), project |
| `envVariables` | key, value (AES-256-GCM), iv, environment (dev/staging/prod), project — compound unique: {project, environment, key} |
| `notifications` | user, type, title, message, link, read, emailSent |
| `githubSyncs` | project, commits[], summary (ChatGPT), lastSyncAt |
| `auditLogs` | project, userId, action (env_create/update/delete/reveal/export), targetKey, environment |

## API Surface

**Auth:** `POST /auth/login` · `/auth/register` · `/auth/refresh` · `/auth/forgot-password` · `/auth/reset-password`

**Users:** `GET /users` (admin) · `POST /users/invite` (admin) · `GET/PATCH /users/me` · `PATCH /users/:id/role` · `DELETE /users/:id`

**Projects:** `GET/POST /projects` · `GET/PATCH /projects/:id` · `POST/DELETE /projects/:id/members`

**Epics:** `GET/POST /projects/:id/epics` · `GET/PATCH/DELETE /epics/:id`

**Tasks:** `GET/POST /projects/:id/tasks` · `GET/PATCH/DELETE /tasks/:id` · `PATCH /tasks/:id/status` · `PATCH /tasks/bulk`

**Sprints:** `GET/POST /projects/:id/sprints` · `GET/PATCH /sprints/:id` · `POST /sprints/:id/close` · `POST/DELETE /sprints/:id/tasks`

**Bugs:** `GET/POST /projects/:id/bugs` · `GET/PATCH/DELETE /bugs/:id` · `PATCH /bugs/:id/link`

**Docs:** `GET/POST /projects/:id/docs` · `GET /projects/:id/docs/search` · `GET/PATCH/DELETE /docs/:id` · `POST /docs/:id/upload`

**Env Vars:** `GET/POST /projects/:id/env` · `GET /projects/:id/env/export` · `GET /projects/:id/env/audit` · `GET /env/:id/reveal` · `PATCH/DELETE /env/:id`

**Links:** `GET/POST /projects/:id/links` · `PATCH/DELETE /links/:id`

**Notifications:** `GET /notifications` · `GET /notifications/unread-count` · `POST /notifications/mark-all-read` · `PATCH /notifications/:id/read`

**Health:** `GET /health`

## Auth & Access Control

- Middleware checks JWT on every request. Public paths: `/auth/*`, `/health`.
- Role routing: `admin` → full UI, `internal` → assigned projects, `client` → read-only portal.
- API-level: `requireRole()` for admin-only endpoints, `requireProjectAccess()` for project-scoped endpoints.
- Clients blocked from: bugs, env vars, docs, admin, sprint internals.

## Extension (Chrome, Manifest V3)

- **Popup** (React): login, project selector, capture button, voice toggle, description field.
- **Service worker:** auth tokens, API calls, S3 uploads.
- **Content script:** console log + page state capture.
- **Permissions:** activeTab, scripting, storage, tabs, debugger.
- **Voice:** Deepgram WebSocket. Token fetched from server per session.

## AI Agents

| Agent | Trigger | Action | Output |
|-------|---------|--------|--------|
| GitHub Sync | Cron 6-8hrs | Fetch commits → ChatGPT summarize | Digest notification + email |
| Priority Detection | New ticket created | ChatGPT classifies by domain rules | Auto-set P0-P3, human overridable |
| Sprint Assignment | New ticket / manual | Analyze capacity + skills | Suggestion banner (PM confirms) |
| Status Update | Merged PR detected | Task→done, bugs→resolved | Client notification if visible |

Fallback: token expired → skip, notify user to reconnect. ChatGPT unavailable → default P2, no suggestion.

## Build Phases

1. **Core Platform** — Auth, Projects, Epics, Tasks, Sprints, Bugs, Views, Docs, Env Vars, Links, Client Portal, Notifications
2. **Browser Extension** — Bug capture, Deepgram voice, extension auth (depends on Phase 1)
3. **AI Agents** — GitHub Sync, Priority, Sprint Assignment, Status Update, OAuth integrations (depends on Phase 1+2)
