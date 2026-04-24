# PRD — Project Management Platform

**Version:** 1.0 | **Date:** April 24, 2026 | **Authors:** Om Rajpal, Nitish Srivastava

## Problem

The team uses Notion for project tracking across multiple clients. Maintaining it (marking tickets done, triaging bugs, syncing statuses) takes significant manual effort. Bug reporting is slow — testers manually screenshot, copy console logs, and write tickets.

## Solution

A single-org internal platform combining an interconnected project database, a Chrome extension for one-click bug capture, and ChatGPT-powered AI agents that automate ~70% of project management overhead. Clients get a clean read-only portal; the team gets full control.

## Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — user management, all projects, system settings |
| **Internal Team** | Assigned projects — tickets, sprints, bugs, docs, env vars, GitHub data |
| **Client** | Read-only — project progress, Kanban (client-visible tasks only), timeline, links |

## Tech Stack

Next.js 14 (App Router) + Node.js | MongoDB (Mongoose) | JWT auth (email/password) | AWS S3 | ChatGPT per-user OAuth | Deepgram voice | GitHub OAuth + polling | Cloud SaaS (single-tenant) | Standard HTTP REST

## Features

### Phase 1: Core Platform

1. **Auth & Users** — Invite-only registration, email/password + JWT (15min access, 7-day refresh), role-based routing, password reset, admin user management.

2. **Projects & Epics** — Project CRUD with members/clients. Epics within projects with auto-calculated progress (completed tasks / total tasks). Timeline/Gantt view.

3. **Tasks** — Title, type (feature/chore/improvement), priority (P0-P3), status (backlog/todo/in_progress/review/done), assignee, tags, `clientVisible` flag. Drag-and-drop Kanban. Filter/sort. Bulk actions.

4. **Sprints** — Fixed 1-week (Mon-Fri). One active per project. Close → unfinished tasks rollover to next sprint. Velocity tracking (planned vs completed). Retrospective notes.

5. **Bug Tracker** — Priority, status (open/investigating/resolved/closed), source (manual/extension). Extension-captured bugs include: console logs, screenshot (S3), URL, device info, IP, viewport. Linkable to tasks.

6. **Views** — Kanban (drag-and-drop), Table (sortable/filterable, inline edit), Timeline/Gantt (epics + sprint boundaries). Client view auto-filters to `clientVisible` tasks.

7. **Rich Docs** — TipTap/Plate block editor. V1: headings, paragraphs, lists, code blocks, images. Linkable to epics/tasks/sprints. Full-text search.

8. **Environment Variables** — Per-project, per-environment (dev/staging/prod). AES-256-GCM encrypted at rest. Masked by default, reveal on click (audited). "Copy as .env" export. Admin audit trail.

9. **Links** — Centralized project links (production, staging, Figma, API docs). Card grid. Visible to all roles.

10. **Client Interface** — Same app, role-based routing. Progress card, simplified 3-column Kanban (Backlog/In Progress/Done), timeline, links. No access to bugs, env vars, docs, or admin.

11. **Notifications** — In-app bell with unread count. Email for P0/P1 bugs, sprint close, invites, client-visible task completion. Configurable digest (immediate/daily).

### Phase 2: Browser Extension (Chrome, Manifest V3)

12. **Bug Capture** — Click extension → auto-captures console logs, screenshot, URL, device info, IP (< 3 sec) → describe via text or voice → submit → bug created with full context. Estimated 70% reduction in bug-handling friction.

13. **Voice Input** — Deepgram real-time WebSocket API. Server-side API key; extension requests short-lived tokens. Fallback to text if unavailable.

14. **Extension Auth** — Login with platform credentials. JWT stored in `chrome.storage.local`. Auto-refresh.

### Phase 3: AI Agents (ChatGPT per-user OAuth)

15. **GitHub Sync Agent** — Cron every 6-8hrs. Fetches commits via GitHub OAuth, summarizes via ChatGPT, posts digest as notification + email.

16. **Priority Detection Agent** — On new ticket creation. ChatGPT classifies priority (auth/security→P0, payment→P0/P1, UI polish→P2/P3). Human can always override. Fallback: P2 if unavailable.

17. **Sprint Assignment Agent** — Suggests sprint + assignee based on priority, team capacity, and member skills. Always a draft — PM confirms or dismisses. Never auto-applied.

18. **Status Update Agent** — On merged PR (detected during GitHub sync). Extracts task ID from branch/PR title. Updates task→done, resolves linked bugs, notifies clients if task is `clientVisible`.

## Database (MongoDB — 12 Collections)

`users` `projects` `epics` `tasks` `sprints` `bugs` `docs` `links` `envVariables` `notifications` `githubSyncs` `auditLogs`

Key relationships: Project → has Epics, Sprints, Tasks, Bugs, Docs, Links, EnvVars. Task → belongs to Epic + Sprint, has linked Bugs. All entities cross-referenced via ObjectId refs.

## Build Order

**Phase 1** (Core DB + Views) → **Phase 2** (Extension) → **Phase 3** (Agents). Each phase depends on the prior.

## Key Risks

| Risk | Mitigation |
|------|-----------|
| ChatGPT OAuth token expiry | Graceful fallback + "reconnect" notification |
| Rich editor scope creep | Start basic blocks, defer embeds/tables to V1.1 |
| GitHub polling misses rapid changes | Acceptable for 6-8hr digest cadence |

## Success Metrics

- 70% PM overhead reduction (survey at 3 months)
- < 30 seconds bug report via extension
- > 80% AI priority accuracy (override rate tracking)
- Weekly client dashboard engagement
