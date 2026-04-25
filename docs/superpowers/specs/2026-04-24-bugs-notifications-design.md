# Bugs, Notifications & Comments — Design Spec

**Date:** 2026-04-24
**Branch:** feature/bugs-notifications
**Parent Spec:** [Orbiter Technical Design](2026-04-24-orbiter-design.md)

---

## Overview

Three interconnected modules for the Orbiter project management platform:

1. **Bugs** — Bug tracking with metadata capture, project scoping, and task linking
2. **Notifications** — In-app notification system with TTL auto-cleanup, polling-based unread count, and bell dropdown
3. **Comments** — Threaded comments on bugs (and tasks) with @mention support and notification dispatch

All modules follow the established domain module pattern (`model/service/validator/types`), use `apiHandler()` for routes, and are tested with TDD (unit + integration).

---

## 1. Bugs Module

### 1.1 Data Model

```
bugs collection:
  title:        String, required, trimmed
  description:  String, optional
  priority:     String, enum ['P0','P1','P2','P3'], default 'P2'
  status:       String, enum ['open','investigating','resolved','closed'], default 'open'
  source:       String, enum ['manual','extension'], default 'manual'
  project:      ObjectId → projects, required, indexed
  reporter:     ObjectId → users, required
  task:         ObjectId → tasks, optional
  metadata: {
    url:          String, optional
    consoleLogs:  String, optional
    screenshot:   String, optional (R2 URL)
    device:       String, optional
    browser:      String, optional
    os:           String, optional
    viewport: {
      width:      Number, optional
      height:     Number, optional
    }
    ip:           String, optional
  }
  timestamps:   true (createdAt, updatedAt)

Indexes:
  { project: 1, status: 1 }
  { task: 1 }

toJSON transform: converts _id to id, removes __v
```

### 1.2 Service Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `(projectId, data, userId)` | Validates project exists, sets reporter, creates bug, dispatches `bug_created` notification to project members |
| `list` | `(projectId, query)` | Paginated list with status/priority/source filters, title search, sort by `-createdAt` |
| `getById` | `(id)` | Returns bug with populated reporter (name, email, avatar) and task (title, status) |
| `update` | `(id, data)` | Partial update of title, description, priority, status, metadata |
| `delete` | `(id)` | Hard delete — bugs are disposable reports |
| `linkToTask` | `(bugId, taskId)` | Sets `task` on bug. If `taskId` is null, unlinks. If taskId provided, validates task exists and adds bugId to task's `linkedBugs[]`. If re-linking, removes from previous task's `linkedBugs[]`. |

### 1.3 Validators (Zod)

**createBugSchema:**
```
title:       z.string().min(1).max(200).trim()
description: z.string().max(5000).optional()
priority:    z.enum(['P0','P1','P2','P3']).default('P2')
source:      z.enum(['manual','extension']).default('manual')
metadata:    z.object({
  url:         z.string().url().optional()
  consoleLogs: z.string().max(50000).optional()
  screenshot:  z.string().url().optional()
  device:      z.string().max(100).optional()
  browser:     z.string().max(100).optional()
  os:          z.string().max(100).optional()
  viewport:    z.object({ width: z.number(), height: z.number() }).optional()
  ip:          z.string().ip().optional()
}).optional()
```

**updateBugSchema:** All fields from create optional (`.partial()`), plus `status` field.

**queryBugsSchema:**
```
page:     z.coerce.number().min(1).default(1)
limit:    z.coerce.number().min(1).max(100).default(20)
status:   z.enum([...]).optional()
priority: z.enum([...]).optional()
source:   z.enum([...]).optional()
search:   z.string().optional()
sort:     z.string().default('-createdAt')
```

**linkBugSchema:**
```
taskId: z.string().nullable()
```

### 1.4 API Routes

| Method | Path | Auth | Middleware | Body/Query |
|--------|------|------|------------|------------|
| GET | `/projects/[id]/bugs` | yes | checkProjectAccess | queryBugsSchema |
| POST | `/projects/[id]/bugs` | yes | checkProjectAccess | createBugSchema |
| GET | `/bugs/[id]` | yes | — | — |
| PATCH | `/bugs/[id]` | yes | — | updateBugSchema |
| DELETE | `/bugs/[id]` | yes | requireRole('admin','internal') | — |
| PATCH | `/bugs/[id]/link` | yes | requireRole('admin','internal') | linkBugSchema |

Note: GET/PATCH/DELETE on `/bugs/[id]` verify the requesting user has access to the bug's project (checked in service via project membership lookup).

### 1.5 UI Components

**BugList** (`src/components/features/bugs/bug-list.tsx`):
- Table layout with columns: Title, Priority (badge), Status (badge), Reporter (avatar + name), Created (relative date)
- Priority badges use design token colors: P0=error, P1=warning, P2=accent, P3=muted
- Status badges: open=info, investigating=warning, resolved=success, closed=muted
- Filter bar above table: status dropdown, priority dropdown, search input
- Empty state: short text + "Report a bug" button
- Click row → navigates to bug detail

**BugDetail** (`src/components/features/bugs/bug-detail.tsx`):
- Header: title, status badge, priority badge, action dropdown (edit, delete, link to task)
- Sidebar panel: reporter info, created/updated dates, source badge, linked task (if any)
- Metadata section (collapsible): URL, device, browser, OS, viewport, IP, screenshot (if present), console logs (in `<pre>` with `font-mono`)
- Comments section at bottom (CommentList + CommentInput)

**CreateBugDialog** (`src/components/features/bugs/create-bug-dialog.tsx`):
- Dialog modal using existing Dialog component
- Form fields: title (Input), description (textarea), priority (Select)
- Metadata fields in collapsible "Technical Details" section
- Submit via `useCreateBug()` mutation

**React Query Hooks** (`src/hooks/queries/use-bugs.ts`):
- `useBugs(projectId, filters)` — GET list
- `useBug(bugId)` — GET single
- `useCreateBug(projectId)` — POST with cache invalidation
- `useUpdateBug()` — PATCH with cache invalidation
- `useDeleteBug()` — DELETE with cache invalidation
- `useLinkBug()` — PATCH link with cache invalidation

---

## 2. Notifications Module

### 2.1 Data Model

```
notifications collection:
  user:       ObjectId → users, required
  type:       String, enum [
                'bug_created', 'task_assigned', 'comment_mention',
                'sprint_closed', 'invite', 'priority_changed'
              ], required
  title:      String, required
  message:    String, required
  link:       String, optional (relative URL path)
  read:       Boolean, default false
  emailSent:  Boolean, default false
  timestamps: true

Indexes:
  { user: 1, read: 1, createdAt: -1 }
  { createdAt: 1 }, expireAfterSeconds: 7776000  (TTL: 90 days)

toJSON transform: converts _id to id, removes __v
```

### 2.2 Service Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `(data)` | Creates a notification record |
| `list` | `(userId, query)` | Paginated, user-scoped, sorted `-createdAt` |
| `getUnreadCount` | `(userId)` | Returns `{ count: number }` via `countDocuments` |
| `markAsRead` | `(id, userId)` | Sets `read: true`, validates notification belongs to user |
| `markAllRead` | `(userId)` | `updateMany({ user: userId, read: false }, { read: true })` |
| `notify` | `(userId, type, title, message, link?)` | Convenience: calls `create()` with structured data. Used by other services. |
| `notifyProjectMembers` | `(projectId, excludeUserId, type, title, message, link?)` | Fetches project members, calls `notify()` for each (excluding the actor). |

### 2.3 Validators (Zod)

**queryNotificationsSchema:**
```
page:  z.coerce.number().min(1).default(1)
limit: z.coerce.number().min(1).max(100).default(20)
```

No create/update validators exposed via API — notifications are created internally by services.

### 2.4 API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | yes | List current user's notifications |
| GET | `/notifications/unread-count` | yes | Returns `{ count: number }` |
| POST | `/notifications/mark-all-read` | yes | Mark all as read for current user |
| PATCH | `/notifications/[id]/read` | yes | Mark single notification as read |

All routes are user-scoped — the authenticated user can only access their own notifications.

### 2.5 UI Components

**NotificationBell** (updates to `src/components/layouts/topbar.tsx`):
- The topbar already has a bell icon with a red dot. Wire it to:
  - `useUnreadCount()` hook — polls `GET /notifications/unread-count` every 30s via `refetchInterval: 30000`
  - Show/hide red dot based on `count > 0`
  - Click opens `NotificationDropdown`

**NotificationDropdown** (`src/components/features/notifications/notification-dropdown.tsx`):
- Popover anchored to bell icon (using DropdownMenu or a custom popover)
- Header: "Notifications" title + "Mark all read" ghost button
- List of notification items, most recent first
- Each item: type icon, title (bold if unread), message preview, relative timestamp
- Click item → mark as read + navigate to `link`
- Empty state: "No notifications" text
- Max height with scroll, showing up to 20 recent items
- Unread items have `bg-accent-muted` left border or subtle background tint

**React Query Hooks** (`src/hooks/queries/use-notifications.ts`):
- `useNotifications(query)` — GET list
- `useUnreadCount()` — GET count with `refetchInterval: 30000`
- `useMarkAsRead()` — PATCH single, optimistic update
- `useMarkAllRead()` — POST bulk, invalidates queries

---

## 3. Comments Module

### 3.1 Data Model

```
comments collection:
  content:    String, required, max 10000
  author:     ObjectId → users, required
  taskId:     ObjectId → tasks, optional
  bugId:      ObjectId → bugs, optional
  mentions:   [ObjectId → users]
  timestamps: true

Indexes:
  { taskId: 1, createdAt: 1 }
  { bugId: 1, createdAt: 1 }

Validation: Exactly one of taskId or bugId must be set (enforced in service, not schema)
toJSON transform: converts _id to id, removes __v
```

### 3.2 Service Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `(data, userId)` | Validates parent (bug/task) exists, creates comment, triggers `comment_mention` notification for each mentioned user |
| `list` | `(parentType, parentId, query)` | Paginated, sorted `createdAt` ascending (chronological), populates author (name, email, avatar) |
| `delete` | `(id, userId, userRole)` | Only author or admin can delete. Hard delete. |

### 3.3 Validators (Zod)

**createCommentSchema:**
```
content:  z.string().min(1).max(10000).trim()
mentions: z.array(z.string()).default([])
```

**queryCommentsSchema:**
```
page:  z.coerce.number().min(1).default(1)
limit: z.coerce.number().min(1).max(100).default(50)
```

### 3.4 API Routes

| Method | Path | Auth | Middleware | Description |
|--------|------|------|------------|-------------|
| GET | `/projects/[id]/bugs/[bugId]/comments` | yes | checkProjectAccess | List bug comments |
| POST | `/projects/[id]/bugs/[bugId]/comments` | yes | checkProjectAccess | Create bug comment |
| GET | `/projects/[id]/tasks/[taskId]/comments` | yes | checkProjectAccess | List task comments |
| POST | `/projects/[id]/tasks/[taskId]/comments` | yes | checkProjectAccess | Create task comment |
| DELETE | `/comments/[id]` | yes | — | Delete own comment (or admin) |

### 3.5 UI Components

**CommentList** (`src/components/features/comments/comment-list.tsx`):
- Chronological list of comments
- Each comment: author avatar (boring-avatars), author name, relative timestamp, content with mention highlights
- Delete button (icon) visible on hover for own comments or admin
- Loading skeleton while fetching

**CommentInput** (`src/components/features/comments/comment-input.tsx`):
- Textarea with `@` mention trigger
- On typing `@`, show dropdown of project members (filtered by typed text)
- Select member → inserts display name, adds userId to mentions array
- Submit button, disabled when empty
- Uses `useCreateComment()` mutation

**React Query Hooks** (`src/hooks/queries/use-comments.ts`):
- `useComments(parentType, parentId, query)` — GET list
- `useCreateComment(parentType, parentId)` — POST with cache invalidation
- `useDeleteComment()` — DELETE with cache invalidation

---

## 4. Cross-Module Integration

### Notification Dispatch Points

| Trigger | Notification Type | Recipients | Link |
|---------|-------------------|------------|------|
| Bug created | `bug_created` | All project members except reporter | `/projects/{projectId}/bugs` |
| Comment with @mentions | `comment_mention` | Each mentioned user | `/projects/{projectId}/bugs/{bugId}` or `/projects/{projectId}/tasks/{taskId}` |

### Bug-Task Linking

- `PATCH /bugs/:id/link` with `{ taskId }` or `{ taskId: null }`
- BugService updates bug's `task` field
- BugService also updates the Task model's `linkedBugs[]` array (add/remove)
- Bidirectional: reading a task shows its linked bugs, reading a bug shows its linked task

### Service Dependencies

```
CommentService → NotificationService (mention notifications)
BugService → NotificationService (bug_created notifications)
BugService → ProjectService (member lookup for notifications)
BugService → TaskModel (linkedBugs array updates)
```

---

## 5. Testing Plan

### Factory Additions (`tests/helpers/factory.ts`)

```typescript
createBug(projectId, reporterId, overrides?)
createNotification(userId, overrides?)
createComment(authorId, overrides?)  // overrides must include bugId or taskId
```

### Unit Tests (~30)

**BugService** (~12):
- create: sets reporter, validates project
- list: pagination, filters (status, priority, source), search, sort
- getById: populates refs, throws NotFoundError
- update: partial update, status transitions
- delete: removes bug
- linkToTask: links, unlinks, re-links, validates task exists

**NotificationService** (~8):
- create: stores notification
- list: user-scoped, paginated, sorted
- getUnreadCount: counts correctly
- markAsRead: validates ownership, sets read
- markAllRead: bulk update
- notify: convenience method creates correct structure
- notifyProjectMembers: excludes actor, creates for each member

**CommentService** (~6):
- create: validates parent, sets author
- create with mentions: triggers notifications
- list: chronological, populates author
- delete: author can delete own
- delete: admin can delete any
- delete: non-author non-admin throws ForbiddenError

### Integration Tests (~25)

**Bug Routes** (~10):
- POST /projects/:id/bugs — create with valid data, validation errors, auth required
- GET /projects/:id/bugs — list with filters, pagination, project access
- GET /bugs/:id — get with populated refs, not found
- PATCH /bugs/:id — update fields, validation
- DELETE /bugs/:id — admin/internal only, not found
- PATCH /bugs/:id/link — link, unlink, invalid task

**Notification Routes** (~8):
- GET /notifications — lists user's notifications only, pagination
- GET /notifications/unread-count — returns correct count
- POST /notifications/mark-all-read — marks all for user
- PATCH /notifications/:id/read — marks single, ownership check

**Comment Routes** (~7):
- POST /projects/:id/bugs/:bugId/comments — create, with mentions
- GET /projects/:id/bugs/:bugId/comments — list, pagination
- POST /projects/:id/tasks/:taskId/comments — create task comment
- GET /projects/:id/tasks/:taskId/comments — list task comments
- DELETE /comments/:id — author delete, admin delete, forbidden

---

## 6. Implementation Order

1. **Notification model + service + tests** (foundation — other modules depend on it)
2. **Notification API routes + integration tests**
3. **Bug model + service + tests**
4. **Bug API routes + integration tests**
5. **Comment model + service + tests**
6. **Comment API routes + integration tests**
7. **Bug-task linking (service + route + tests)**
8. **Factory additions for test helpers**
9. **React Query hooks** (bugs, notifications, comments)
10. **Notification bell + dropdown UI** (wire up topbar)
11. **Bug list + bug detail + create bug dialog UI**
12. **Comment list + comment input UI** (embedded in bug detail)
13. **Bug page route** (`(dashboard)/projects/[id]/bugs/page.tsx`)
