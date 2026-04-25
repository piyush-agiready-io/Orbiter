# Orbiter

**Internal Project Management Platform by Agiready**

Orbiter combines project tracking, sprint management, bug reporting via Chrome extension, GitHub integration with AI-powered summaries, and a client portal — all in one platform.

**Live:** https://orbiteragiready.vercel.app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| Styling | Tailwind CSS 4 + Shadcn/ui (Orbiter design tokens) |
| Database | MongoDB (Mongoose 9) via MongoDB Atlas |
| Auth | JWT (jose) — access token in memory, refresh in httpOnly cookie |
| Email | Nodemailer + Gmail SMTP |
| Storage | Cloudflare R2 (S3-compatible) with base64 fallback |
| AI | ChatGPT Codex Responses API (device code OAuth) |
| Icons | Phosphor Icons |
| Drag & Drop | @dnd-kit |
| Rich Text | TipTap with @mentions |
| Cron | Inngest (GitHub sync every 6 hours) |

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — manage users, projects, settings, AI connection |
| **Internal** | Work on assigned projects — board, tasks, sprints, bugs, docs |
| **Client** | Read-only portal — view project progress, board, links |

## Core Features

### Project Management
- Kanban board with drag-and-drop (5 columns: Backlog → Todo → In Progress → Review → Done)
- Task creation with multiple assignees, priority (P0-P3), sprints, tags
- Table view, backlog, timeline (Gantt)
- Sprint management — create, start, close with velocity tracking

### GitHub Integration (per-project)
- Connect GitHub OAuth per project
- Search and link repositories from dropdown
- Sync commits + pull requests (manual + every 6 hours via Inngest cron)
- AI-powered commit/PR summaries using ChatGPT
- README overview display

### Bug Tracking
- Report bugs manually or via Chrome extension
- AI auto-classifies priority (P0-P3)
- Comments with @mentions + email notifications
- Screenshot capture from extension

### Team & Invite Management
- Invite users via email (Gmail SMTP)
- Track invite status: Active / Pending / Expired
- Resend expired invitations
- Per-project member management (auto-role from platform role)

### AI Pipeline (org-wide)
- One admin connects ChatGPT → all AI features work
- Priority detection on task creation (ChatGPT first, keyword fallback)
- GitHub sync summaries with project history context
- Sprint assignment suggestions
- Uses ChatGPT Codex Responses API with gpt-5.4 model

### Client Portal
- Read-only dashboard for client users
- Project progress card with completion percentage
- Simplified 3-column Kanban (Planned / Working On / Completed)
- Links page for shared resources
- Sign out button

### Other Features
- Dark/light theme with View Transitions API circular animation
- Command palette (Cmd+K) with fuzzy search
- Keyboard shortcuts with cheat sheet
- Env variables with AES-256 encryption (dev/prod)
- Document editor (TipTap rich text + file uploads)
- Notification system with email alerts
- @mentions in comments and documents

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (or local MongoDB)

### Setup

```bash
git clone https://github.com/piyush-agiready-io/Orbiter.git
cd Orbiter
npm install
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Min 32 chars for access tokens |
| `JWT_REFRESH_SECRET` | Min 32 chars for refresh tokens |
| `ENCRYPTION_KEY` | 64-char hex string for AES-256 encryption |
| `SMTP_USER` | Gmail address for sending emails |
| `SMTP_PASS` | Gmail App Password (16 chars) |
| `NEXT_PUBLIC_APP_URL` | Deployed URL (e.g. https://orbiteragiready.vercel.app) |

### Optional Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App secret |
| `R2_ACCOUNT_ID` | Cloudflare R2 account |
| `R2_ACCESS_KEY` / `R2_SECRET_KEY` | R2 credentials |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Inngest for cron jobs |
| `CRON_SECRET` | Bearer token for manual cron triggers |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/v1/             # REST API endpoints
│   ├── (auth)/             # Login, register, forgot/reset password
│   ├── (dashboard)/        # Main app (projects, admin, settings)
│   └── portal/             # Client portal
├── modules/                # Domain business logic
│   ├── ai/                 # ChatGPT OAuth, Codex client, agents
│   ├── auth/               # Auth service + validators
│   ├── bugs/               # Bug tracking
│   ├── comments/           # Comments with mentions
│   ├── docs/               # Documents (rich text + file uploads)
│   ├── github/             # GitHub OAuth, sync, commit fetching
│   ├── notifications/      # In-app + email notifications
│   ├── projects/           # Projects, members
│   ├── sprints/            # Sprint management
│   ├── tasks/              # Task CRUD, priority, status
│   └── users/              # User management, invites
├── shared/                 # Cross-cutting concerns
│   ├── middleware/          # apiHandler, auth, validation, rate-limiting
│   ├── lib/                # JWT, email, encryption, Inngest
│   └── database/           # MongoDB connection (serverless-safe)
├── components/             # UI components
│   ├── ui/                 # Shadcn primitives
│   ├── features/           # Domain UI (kanban, sprints, github, etc.)
│   ├── shared/             # InfoTip, ConfirmDialog, MentionInput
│   └── layouts/            # Sidebar, topbar, portal sidebar
├── hooks/                  # React Query hooks + state
└── config/                 # Env validation (lazy for Vercel)

extension/                  # Chrome extension (Manifest V3)
├── popup/                  # React popup UI
├── content/                # Console capture content script
├── background/             # Service worker
└── shared/                 # Storage, API client, types
```

## API Convention

All endpoints under `/api/v1/`. Every route uses `apiHandler()` wrapper.

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

## Deployment

Deployed on Vercel. Push to `master` triggers auto-deploy.

```bash
git push origin master
```

Ensure all env vars are set in Vercel Dashboard → Settings → Environment Variables.

## License

Proprietary — Agiready internal use only.
