# Bugs, Notifications & Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three interconnected domain modules (Notifications, Bugs, Comments) with full backend (model/service/validator/types/routes), unit+integration tests, React Query hooks, and UI components.

**Architecture:** Each module follows the established domain pattern in `src/modules/<domain>/` with 4 files: model, service, validator, types. API routes use the `apiHandler()` wrapper in `src/app/api/v1/`. Notifications is built first because Bugs and Comments dispatch notifications. Comments are polymorphic (attached to either a bug or a task).

**Tech Stack:** Mongoose 9, Zod 4, Next.js 16 App Router, React 19, TanStack React Query 5, Base UI + Shadcn components, Phosphor Icons, boring-avatars, Tailwind CSS 4.

---

## File Map

### New Files — Backend

| File | Responsibility |
|------|---------------|
| `src/modules/notifications/notification.model.ts` | Mongoose schema with TTL index |
| `src/modules/notifications/notification.service.ts` | CRUD + notify helpers |
| `src/modules/notifications/notification.validator.ts` | Zod query schema |
| `src/modules/notifications/notification.types.ts` | TypeScript interfaces |
| `src/modules/bugs/bug.model.ts` | Mongoose schema with metadata subdoc |
| `src/modules/bugs/bug.service.ts` | CRUD + linkToTask + notification dispatch |
| `src/modules/bugs/bug.validator.ts` | Zod create/update/query/link schemas |
| `src/modules/bugs/bug.types.ts` | TypeScript interfaces |
| `src/modules/comments/comment.model.ts` | Mongoose schema, polymorphic parent |
| `src/modules/comments/comment.service.ts` | CRUD + mention notification dispatch |
| `src/modules/comments/comment.validator.ts` | Zod create/query schemas |
| `src/modules/comments/comment.types.ts` | TypeScript interfaces |
| `src/app/api/v1/notifications/route.ts` | GET list |
| `src/app/api/v1/notifications/unread-count/route.ts` | GET count |
| `src/app/api/v1/notifications/mark-all-read/route.ts` | POST bulk |
| `src/app/api/v1/notifications/[id]/read/route.ts` | PATCH single |
| `src/app/api/v1/projects/[id]/bugs/route.ts` | GET list, POST create |
| `src/app/api/v1/bugs/[id]/route.ts` | GET, PATCH, DELETE |
| `src/app/api/v1/bugs/[id]/link/route.ts` | PATCH link/unlink |
| `src/app/api/v1/projects/[id]/bugs/[bugId]/comments/route.ts` | GET list, POST create |
| `src/app/api/v1/projects/[id]/tasks/[taskId]/comments/route.ts` | GET list, POST create |
| `src/app/api/v1/comments/[id]/route.ts` | DELETE |

### New Files — Tests

| File | Responsibility |
|------|---------------|
| `tests/unit/modules/notifications/notification.service.test.ts` | Service unit tests |
| `tests/unit/modules/bugs/bug.service.test.ts` | Service unit tests |
| `tests/unit/modules/comments/comment.service.test.ts` | Service unit tests |
| `tests/integration/api/notifications.test.ts` | API integration tests |
| `tests/integration/api/bugs.test.ts` | API integration tests |
| `tests/integration/api/comments.test.ts` | API integration tests |

### New Files — Frontend

| File | Responsibility |
|------|---------------|
| `src/hooks/queries/use-notifications.ts` | React Query hooks for notifications |
| `src/hooks/queries/use-bugs.ts` | React Query hooks for bugs |
| `src/hooks/queries/use-comments.ts` | React Query hooks for comments |
| `src/components/features/notifications/notification-dropdown.tsx` | Bell dropdown popover |
| `src/components/features/bugs/bug-list.tsx` | Bug table with filters |
| `src/components/features/bugs/bug-detail.tsx` | Full bug view with comments |
| `src/components/features/bugs/create-bug-dialog.tsx` | Create bug modal |
| `src/components/features/comments/comment-list.tsx` | Chronological comment thread |
| `src/components/features/comments/comment-input.tsx` | Comment box with @mention |
| `src/app/(dashboard)/projects/[id]/bugs/page.tsx` | Bug list page |
| `src/app/(dashboard)/projects/[id]/bugs/[bugId]/page.tsx` | Bug detail page |

### Modified Files

| File | Change |
|------|--------|
| `tests/helpers/factory.ts` | Add `createBug`, `createNotification`, `createComment` |
| `src/components/layouts/topbar.tsx` | Wire notification bell to real API |

---

## Task 1: Test Factory Additions

**Files:**
- Modify: `tests/helpers/factory.ts`

- [ ] **Step 1: Add bug, notification, and comment factories**

```typescript
// Add these imports at the top of tests/helpers/factory.ts
import { Bug } from '@/modules/bugs/bug.model';
import { Notification } from '@/modules/notifications/notification.model';
import { Comment } from '@/modules/comments/comment.model';
```

Add these functions after the existing `createProject` function:

```typescript
export async function createBug(
  projectId: string,
  reporterId: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    title: 'Test Bug',
    priority: 'P2',
    status: 'open',
    source: 'manual',
    project: projectId,
    reporter: reporterId,
    metadata: {},
  };
  return Bug.create({ ...defaults, ...overrides });
}

export async function createNotification(
  userId: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    user: userId,
    type: 'bug_created',
    title: 'Test Notification',
    message: 'A test notification message',
    read: false,
    emailSent: false,
  };
  return Notification.create({ ...defaults, ...overrides });
}

export async function createComment(
  authorId: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    content: 'Test comment content',
    author: authorId,
    mentions: [],
    ...overrides,
  };
  if (!defaults.bugId && !defaults.taskId && !overrides.bugId && !overrides.taskId) {
    throw new Error('createComment requires either bugId or taskId in overrides');
  }
  return Comment.create(defaults);
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/helpers/factory.ts
git commit -m "test: add bug, notification, and comment factory helpers"
```

Note: This will fail until the models exist. That's expected — the factories will be used by integration tests in later tasks. We commit now to track intent; models are created in tasks 2-4.

---

## Task 2: Notification Module — Model + Types

**Files:**
- Create: `src/modules/notifications/notification.types.ts`
- Create: `src/modules/notifications/notification.model.ts`
- Create: `src/modules/notifications/notification.validator.ts`

- [ ] **Step 1: Create types file**

Create `src/modules/notifications/notification.types.ts`:

```typescript
export const NOTIFICATION_TYPES = [
  'bug_created',
  'task_assigned',
  'comment_mention',
  'sprint_closed',
  'invite',
  'priority_changed',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification {
  id: string;
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  emailSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create model file**

Create `src/modules/notifications/notification.model.ts`:

```typescript
import { Schema, model, models, type Document } from 'mongoose';
import { NOTIFICATION_TYPES, type NotificationType } from './notification.types';

export interface NotificationDocument extends Document {
  user: Schema.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  emailSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const Notification =
  (models.Notification as typeof import('mongoose').Model<NotificationDocument>) ||
  model<NotificationDocument>('Notification', notificationSchema);
```

- [ ] **Step 3: Create validator file**

Create `src/modules/notifications/notification.validator.ts`:

```typescript
import { z } from 'zod';

export const queryNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type QueryNotificationsInput = z.infer<typeof queryNotificationsSchema>;
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/notifications/
git commit -m "feat: add notification model, types, and validator"
```

---

## Task 3: Notification Module — Service + Unit Tests

**Files:**
- Create: `src/modules/notifications/notification.service.ts`
- Create: `tests/unit/modules/notifications/notification.service.test.ts`

- [ ] **Step 1: Write the unit test file**

Create `tests/unit/modules/notifications/notification.service.test.ts`:

```typescript
import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createNotification } from '../../../helpers/factory';
import { NotificationService } from '@/modules/notifications/notification.service';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('NotificationService', () => {
  describe('create', () => {
    it('creates a notification with required fields', async () => {
      const user = await createUser();
      const notification = await NotificationService.create({
        user: user._id.toString(),
        type: 'bug_created',
        title: 'New bug',
        message: 'A bug was reported',
      });
      expect(notification.title).toBe('New bug');
      expect(notification.read).toBe(false);
      expect(notification.emailSent).toBe(false);
    });
  });

  describe('list', () => {
    it('returns paginated notifications for a user sorted by newest first', async () => {
      const user = await createUser();
      const other = await createUser();
      await createNotification(user._id.toString(), { title: 'First' });
      await createNotification(user._id.toString(), { title: 'Second' });
      await createNotification(other._id.toString(), { title: 'Other user' });

      const result = await NotificationService.list(user._id.toString(), { page: 1, limit: 10 });
      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.notifications[0].title).toBe('Second');
    });
  });

  describe('getUnreadCount', () => {
    it('returns count of unread notifications', async () => {
      const user = await createUser();
      await createNotification(user._id.toString(), { read: false });
      await createNotification(user._id.toString(), { read: false });
      await createNotification(user._id.toString(), { read: true });

      const result = await NotificationService.getUnreadCount(user._id.toString());
      expect(result.count).toBe(2);
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      const user = await createUser();
      const notification = await createNotification(user._id.toString());
      const updated = await NotificationService.markAsRead(
        notification._id.toString(),
        user._id.toString(),
      );
      expect(updated.read).toBe(true);
    });

    it('throws NotFoundError if notification does not belong to user', async () => {
      const user = await createUser();
      const other = await createUser();
      const notification = await createNotification(other._id.toString());
      await expect(
        NotificationService.markAsRead(notification._id.toString(), user._id.toString()),
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('markAllRead', () => {
    it('marks all unread notifications as read for user', async () => {
      const user = await createUser();
      await createNotification(user._id.toString(), { read: false });
      await createNotification(user._id.toString(), { read: false });

      const result = await NotificationService.markAllRead(user._id.toString());
      expect(result.modifiedCount).toBe(2);
    });
  });

  describe('notify', () => {
    it('creates a notification with the convenience method', async () => {
      const user = await createUser();
      const notification = await NotificationService.notify(
        user._id.toString(),
        'task_assigned',
        'Task assigned',
        'You were assigned a task',
        '/projects/123/tasks',
      );
      expect(notification.type).toBe('task_assigned');
      expect(notification.link).toBe('/projects/123/tasks');
    });
  });

  describe('notifyProjectMembers', () => {
    it('notifies all project members except the actor', async () => {
      const owner = await createUser();
      const member = await createUser();
      const project = await createProject(owner._id.toString(), {
        members: [owner._id.toString(), member._id.toString()],
      });

      await NotificationService.notifyProjectMembers(
        project._id.toString(),
        owner._id.toString(),
        'bug_created',
        'New bug',
        'A bug was created',
        '/projects/' + project._id.toString() + '/bugs',
      );

      const ownerNotifs = await NotificationService.list(owner._id.toString(), { page: 1, limit: 10 });
      const memberNotifs = await NotificationService.list(member._id.toString(), { page: 1, limit: 10 });
      expect(ownerNotifs.notifications).toHaveLength(0);
      expect(memberNotifs.notifications).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/modules/notifications/notification.service.test.ts --verbose`
Expected: FAIL — `Cannot find module '@/modules/notifications/notification.service'`

- [ ] **Step 3: Create the service**

Create `src/modules/notifications/notification.service.ts`:

```typescript
import { Notification } from '@/modules/notifications/notification.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { NotificationType } from './notification.types';

export const NotificationService = {
  async create(data: {
    user: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    return Notification.create(data);
  },

  async list(userId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter = { user: userId };

    const [notifications, total] = await Promise.all([
      Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Notification.countDocuments(filter),
    ]);

    return { notifications, page, limit, total };
  },

  async getUnreadCount(userId: string) {
    const count = await Notification.countDocuments({ user: userId, read: false });
    return { count };
  },

  async markAsRead(id: string, userId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { read: true } },
      { new: true },
    );
    if (!notification) {
      throw new NotFoundError('Notification');
    }
    return notification;
  },

  async markAllRead(userId: string) {
    return Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } },
    );
  },

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    return this.create({ user: userId, type, title, message, link });
  },

  async notifyProjectMembers(
    projectId: string,
    excludeUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    const { Project } = await import('@/modules/projects/project.model');
    const project = await Project.findById(projectId);
    if (!project) return;

    const memberIds = project.members
      .map((m: { toString(): string }) => m.toString())
      .filter((id: string) => id !== excludeUserId);

    await Promise.all(
      memberIds.map((userId: string) =>
        this.notify(userId, type, title, message, link),
      ),
    );
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/unit/modules/notifications/notification.service.test.ts --verbose`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/notifications/notification.service.ts tests/unit/modules/notifications/
git commit -m "feat: add notification service with unit tests"
```

---

## Task 4: Notification Module — API Routes + Integration Tests

**Files:**
- Create: `src/app/api/v1/notifications/route.ts`
- Create: `src/app/api/v1/notifications/unread-count/route.ts`
- Create: `src/app/api/v1/notifications/mark-all-read/route.ts`
- Create: `src/app/api/v1/notifications/[id]/read/route.ts`
- Create: `tests/integration/api/notifications.test.ts`

- [ ] **Step 1: Write the integration test file**

Create `tests/integration/api/notifications.test.ts`:

```typescript
import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';
import { createNotification } from '../../helpers/factory';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

async function callRoute(
  routeModule: { GET?: Function; POST?: Function; PATCH?: Function },
  method: 'GET' | 'POST' | 'PATCH',
  opts: { token: string; params?: Record<string, string>; body?: unknown; query?: Record<string, string> },
) {
  const url = new URL('http://localhost:3000/api/v1/notifications');
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const req = new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const handler = routeModule[method]!;
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  return { status: res.status, body: await res.json() };
}

describe('GET /api/v1/notifications', () => {
  it('returns user notifications', async () => {
    const { user, token } = await getAuthenticatedUser();
    await createNotification(user._id.toString(), { title: 'N1' });
    await createNotification(user._id.toString(), { title: 'N2' });

    const { GET } = await import('@/app/api/v1/notifications/route');
    const { status, body } = await callRoute({ GET }, 'GET', { token });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.notifications).toHaveLength(2);
    expect(body.data.total).toBe(2);
  });

  it('returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/v1/notifications/route');
    const { status, body } = await callRoute({ GET }, 'GET', { token: 'invalid' });
    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });
});

describe('GET /api/v1/notifications/unread-count', () => {
  it('returns unread count', async () => {
    const { user, token } = await getAuthenticatedUser();
    await createNotification(user._id.toString(), { read: false });
    await createNotification(user._id.toString(), { read: true });

    const { GET } = await import('@/app/api/v1/notifications/unread-count/route');
    const { status, body } = await callRoute({ GET }, 'GET', { token });
    expect(status).toBe(200);
    expect(body.data.count).toBe(1);
  });
});

describe('POST /api/v1/notifications/mark-all-read', () => {
  it('marks all notifications as read', async () => {
    const { user, token } = await getAuthenticatedUser();
    await createNotification(user._id.toString(), { read: false });
    await createNotification(user._id.toString(), { read: false });

    const { POST } = await import('@/app/api/v1/notifications/mark-all-read/route');
    const { status, body } = await callRoute({ POST }, 'POST', { token });
    expect(status).toBe(200);
    expect(body.success).toBe(true);

    const { GET } = await import('@/app/api/v1/notifications/unread-count/route');
    const countRes = await callRoute({ GET }, 'GET', { token });
    expect(countRes.body.data.count).toBe(0);
  });
});

describe('PATCH /api/v1/notifications/:id/read', () => {
  it('marks a single notification as read', async () => {
    const { user, token } = await getAuthenticatedUser();
    const notif = await createNotification(user._id.toString());

    const { PATCH } = await import('@/app/api/v1/notifications/[id]/read/route');
    const { status, body } = await callRoute(
      { PATCH },
      'PATCH',
      { token, params: { id: notif._id.toString() } },
    );
    expect(status).toBe(200);
    expect(body.data.read).toBe(true);
  });

  it('returns 404 for another users notification', async () => {
    const { user: owner, token: ownerToken } = await getAuthenticatedUser();
    const { user: other } = await getAuthenticatedUser();
    const notif = await createNotification(other._id.toString());

    const { PATCH } = await import('@/app/api/v1/notifications/[id]/read/route');
    const { status } = await callRoute(
      { PATCH },
      'PATCH',
      { token: ownerToken, params: { id: notif._id.toString() } },
    );
    expect(status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/integration/api/notifications.test.ts --verbose`
Expected: FAIL — route modules not found

- [ ] **Step 3: Create route files**

Create `src/app/api/v1/notifications/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { NotificationService } from '@/modules/notifications/notification.service';
import { queryNotificationsSchema } from '@/modules/notifications/notification.validator';
import type { QueryNotificationsInput } from '@/modules/notifications/notification.validator';

export const GET = apiHandler({
  validate: { query: queryNotificationsSchema },
  handler: async (_req, ctx) => {
    const query = ctx.query as QueryNotificationsInput;
    const result = await NotificationService.list(ctx.user.userId, query);
    return {
      data: {
        notifications: result.notifications.map((n) => n.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});
```

Create `src/app/api/v1/notifications/unread-count/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { NotificationService } from '@/modules/notifications/notification.service';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const result = await NotificationService.getUnreadCount(ctx.user.userId);
    return { data: result };
  },
});
```

Create `src/app/api/v1/notifications/mark-all-read/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { NotificationService } from '@/modules/notifications/notification.service';

export const POST = apiHandler({
  handler: async (_req, ctx) => {
    await NotificationService.markAllRead(ctx.user.userId);
    return { data: { success: true } };
  },
});
```

Create `src/app/api/v1/notifications/[id]/read/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { NotificationService } from '@/modules/notifications/notification.service';

export const PATCH = apiHandler({
  handler: async (_req, ctx) => {
    const notification = await NotificationService.markAsRead(
      ctx.params.id,
      ctx.user.userId,
    );
    return { data: notification.toJSON() };
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/integration/api/notifications.test.ts --verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/notifications/ tests/integration/api/notifications.test.ts
git commit -m "feat: add notification API routes with integration tests"
```

---

## Task 5: Bug Module — Model + Types + Validator

**Files:**
- Create: `src/modules/bugs/bug.types.ts`
- Create: `src/modules/bugs/bug.model.ts`
- Create: `src/modules/bugs/bug.validator.ts`

- [ ] **Step 1: Create types file**

Create `src/modules/bugs/bug.types.ts`:

```typescript
export const BUG_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type BugPriority = (typeof BUG_PRIORITIES)[number];

export const BUG_STATUSES = ['open', 'investigating', 'resolved', 'closed'] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const BUG_SOURCES = ['manual', 'extension'] as const;
export type BugSource = (typeof BUG_SOURCES)[number];

export interface IBugMetadata {
  url?: string;
  consoleLogs?: string;
  screenshot?: string;
  device?: string;
  browser?: string;
  os?: string;
  viewport?: { width: number; height: number };
  ip?: string;
}

export interface IBug {
  id: string;
  title: string;
  description?: string;
  priority: BugPriority;
  status: BugStatus;
  source: BugSource;
  project: string;
  reporter: string;
  task?: string;
  metadata: IBugMetadata;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create model file**

Create `src/modules/bugs/bug.model.ts`:

```typescript
import { Schema, model, models, type Document } from 'mongoose';
import {
  BUG_PRIORITIES,
  BUG_STATUSES,
  BUG_SOURCES,
  type BugPriority,
  type BugStatus,
  type BugSource,
} from './bug.types';

export interface BugDocument extends Document {
  title: string;
  description?: string;
  priority: BugPriority;
  status: BugStatus;
  source: BugSource;
  project: Schema.Types.ObjectId;
  reporter: Schema.Types.ObjectId;
  task?: Schema.Types.ObjectId;
  metadata: {
    url?: string;
    consoleLogs?: string;
    screenshot?: string;
    device?: string;
    browser?: string;
    os?: string;
    viewport?: { width: number; height: number };
    ip?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const viewportSchema = new Schema(
  {
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false },
);

const bugMetadataSchema = new Schema(
  {
    url: { type: String },
    consoleLogs: { type: String },
    screenshot: { type: String },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    viewport: { type: viewportSchema },
    ip: { type: String },
  },
  { _id: false },
);

const bugSchema = new Schema<BugDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: BUG_PRIORITIES,
      default: 'P2',
    },
    status: {
      type: String,
      enum: BUG_STATUSES,
      default: 'open',
    },
    source: {
      type: String,
      enum: BUG_SOURCES,
      default: 'manual',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    metadata: {
      type: bugMetadataSchema,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

bugSchema.index({ project: 1, status: 1 });
bugSchema.index({ task: 1 });

export const Bug =
  (models.Bug as typeof import('mongoose').Model<BugDocument>) ||
  model<BugDocument>('Bug', bugSchema);
```

- [ ] **Step 3: Create validator file**

Create `src/modules/bugs/bug.validator.ts`:

```typescript
import { z } from 'zod';

export const createBugSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
  source: z.enum(['manual', 'extension']).default('manual'),
  metadata: z
    .object({
      url: z.string().url().optional(),
      consoleLogs: z.string().max(50000).optional(),
      screenshot: z.string().url().optional(),
      device: z.string().max(100).optional(),
      browser: z.string().max(100).optional(),
      os: z.string().max(100).optional(),
      viewport: z
        .object({
          width: z.number().positive(),
          height: z.number().positive(),
        })
        .optional(),
      ip: z.string().ip().optional(),
    })
    .optional(),
});

export const updateBugSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
  metadata: z
    .object({
      url: z.string().url().optional(),
      consoleLogs: z.string().max(50000).optional(),
      screenshot: z.string().url().optional(),
      device: z.string().max(100).optional(),
      browser: z.string().max(100).optional(),
      os: z.string().max(100).optional(),
      viewport: z
        .object({
          width: z.number().positive(),
          height: z.number().positive(),
        })
        .optional(),
      ip: z.string().ip().optional(),
    })
    .optional(),
});

export const queryBugsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  source: z.enum(['manual', 'extension']).optional(),
  search: z.string().optional(),
  sort: z.string().default('-createdAt'),
});

export const linkBugSchema = z.object({
  taskId: z.string().nullable(),
});

export type CreateBugInput = z.infer<typeof createBugSchema>;
export type UpdateBugInput = z.infer<typeof updateBugSchema>;
export type QueryBugsInput = z.infer<typeof queryBugsSchema>;
export type LinkBugInput = z.infer<typeof linkBugSchema>;
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/bugs/
git commit -m "feat: add bug model, types, and validator"
```

---

## Task 6: Bug Module — Service + Unit Tests

**Files:**
- Create: `src/modules/bugs/bug.service.ts`
- Create: `tests/unit/modules/bugs/bug.service.test.ts`

- [ ] **Step 1: Write the unit test file**

Create `tests/unit/modules/bugs/bug.service.test.ts`:

```typescript
import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createBug } from '../../../helpers/factory';
import { BugService } from '@/modules/bugs/bug.service';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('BugService', () => {
  describe('create', () => {
    it('creates a bug with reporter and project', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await BugService.create(
        project._id.toString(),
        { title: 'Login broken', priority: 'P0' },
        user._id.toString(),
      );
      expect(bug.title).toBe('Login broken');
      expect(bug.priority).toBe('P0');
      expect(bug.status).toBe('open');
      expect(bug.reporter.toString()).toBe(user._id.toString());
      expect(bug.project.toString()).toBe(project._id.toString());
    });
  });

  describe('list', () => {
    it('returns paginated bugs for a project', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      await createBug(project._id.toString(), user._id.toString(), { title: 'Bug 1' });
      await createBug(project._id.toString(), user._id.toString(), { title: 'Bug 2' });

      const result = await BugService.list(project._id.toString(), { page: 1, limit: 10 });
      expect(result.bugs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by status', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      await createBug(project._id.toString(), user._id.toString(), { status: 'open' });
      await createBug(project._id.toString(), user._id.toString(), { status: 'closed' });

      const result = await BugService.list(project._id.toString(), { status: 'open' });
      expect(result.bugs).toHaveLength(1);
    });

    it('filters by priority', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      await createBug(project._id.toString(), user._id.toString(), { priority: 'P0' });
      await createBug(project._id.toString(), user._id.toString(), { priority: 'P3' });

      const result = await BugService.list(project._id.toString(), { priority: 'P0' });
      expect(result.bugs).toHaveLength(1);
    });

    it('searches by title', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      await createBug(project._id.toString(), user._id.toString(), { title: 'Login broken' });
      await createBug(project._id.toString(), user._id.toString(), { title: 'Dashboard crash' });

      const result = await BugService.list(project._id.toString(), { search: 'login' });
      expect(result.bugs).toHaveLength(1);
      expect(result.bugs[0].title).toBe('Login broken');
    });
  });

  describe('getById', () => {
    it('returns bug with populated reporter', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      const found = await BugService.getById(bug._id.toString());
      expect(found.title).toBe('Test Bug');
      expect((found.reporter as unknown as { name: string }).name).toBe('Test User');
    });

    it('throws NotFoundError for invalid id', async () => {
      await expect(BugService.getById('000000000000000000000000')).rejects.toThrow('Bug not found');
    });
  });

  describe('update', () => {
    it('updates bug fields', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      const updated = await BugService.update(bug._id.toString(), {
        status: 'investigating',
        priority: 'P1',
      });
      expect(updated.status).toBe('investigating');
      expect(updated.priority).toBe('P1');
    });
  });

  describe('delete', () => {
    it('deletes a bug', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      await BugService.delete(bug._id.toString());
      await expect(BugService.getById(bug._id.toString())).rejects.toThrow('Bug not found');
    });
  });

  describe('linkToTask', () => {
    it('links bug to null (unlink)', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      const updated = await BugService.linkToTask(bug._id.toString(), null);
      expect(updated.task).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/modules/bugs/bug.service.test.ts --verbose`
Expected: FAIL — `Cannot find module '@/modules/bugs/bug.service'`

- [ ] **Step 3: Create the service**

Create `src/modules/bugs/bug.service.ts`:

```typescript
import { Bug } from '@/modules/bugs/bug.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { CreateBugInput, UpdateBugInput, QueryBugsInput } from './bug.validator';

export const BugService = {
  async create(projectId: string, data: CreateBugInput, userId: string) {
    const bug = await Bug.create({
      ...data,
      project: projectId,
      reporter: userId,
    });

    const { NotificationService } = await import(
      '@/modules/notifications/notification.service'
    );
    await NotificationService.notifyProjectMembers(
      projectId,
      userId,
      'bug_created',
      'New bug reported',
      `${data.title}`,
      `/projects/${projectId}/bugs`,
    ).catch(() => {});

    return bug;
  },

  async list(projectId: string, query: Partial<QueryBugsInput> = {}) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;
    const sort = query.sort ?? '-createdAt';

    const filter: Record<string, unknown> = { project: projectId };
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.source) filter.source = query.source;
    if (query.search) {
      filter.title = new RegExp(query.search, 'i');
    }

    const [bugs, total] = await Promise.all([
      Bug.find(filter)
        .populate('reporter', 'name email avatar')
        .skip(skip)
        .limit(limit)
        .sort(sort),
      Bug.countDocuments(filter),
    ]);

    return { bugs, page, limit, total };
  },

  async getById(id: string) {
    const bug = await Bug.findById(id)
      .populate('reporter', 'name email avatar')
      .populate('task', 'title status');
    if (!bug) {
      throw new NotFoundError('Bug');
    }
    return bug;
  },

  async update(id: string, data: UpdateBugInput) {
    const bug = await Bug.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    );
    if (!bug) {
      throw new NotFoundError('Bug');
    }
    return bug;
  },

  async delete(id: string) {
    const bug = await Bug.findByIdAndDelete(id);
    if (!bug) {
      throw new NotFoundError('Bug');
    }
    return bug;
  },

  async linkToTask(bugId: string, taskId: string | null) {
    const bug = await Bug.findById(bugId);
    if (!bug) {
      throw new NotFoundError('Bug');
    }

    if (bug.task) {
      try {
        const { Task } = await import('@/modules/tasks/task.model');
        await Task.findByIdAndUpdate(bug.task, {
          $pull: { linkedBugs: bugId },
        });
      } catch {
        // Task model may not exist yet
      }
    }

    if (taskId) {
      try {
        const { Task } = await import('@/modules/tasks/task.model');
        const task = await Task.findById(taskId);
        if (!task) throw new NotFoundError('Task');
        await Task.findByIdAndUpdate(taskId, {
          $addToSet: { linkedBugs: bugId },
        });
      } catch (error) {
        if (error instanceof NotFoundError) throw error;
        // Task model may not exist yet
      }
      bug.task = taskId as unknown as typeof bug.task;
    } else {
      bug.task = undefined;
    }

    await bug.save();
    return bug;
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/unit/modules/bugs/bug.service.test.ts --verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/bugs/bug.service.ts tests/unit/modules/bugs/
git commit -m "feat: add bug service with unit tests"
```

---

## Task 7: Bug Module — API Routes + Integration Tests

**Files:**
- Create: `src/app/api/v1/projects/[id]/bugs/route.ts`
- Create: `src/app/api/v1/bugs/[id]/route.ts`
- Create: `src/app/api/v1/bugs/[id]/link/route.ts`
- Create: `tests/integration/api/bugs.test.ts`

- [ ] **Step 1: Write the integration test file**

Create `tests/integration/api/bugs.test.ts`:

```typescript
import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';
import { createProject, createBug } from '../../helpers/factory';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

async function callRoute(
  routeModule: Record<string, Function>,
  method: string,
  opts: { token: string; params?: Record<string, string>; body?: unknown; query?: Record<string, string> },
) {
  const url = new URL('http://localhost:3000/api/v1/test');
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const req = new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const handler = routeModule[method]!;
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  return { status: res.status, body: await res.json() };
}

describe('POST /api/v1/projects/:id/bugs', () => {
  it('creates a bug', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/bugs/route');
    const { status, body } = await callRoute(
      { POST },
      'POST',
      {
        token,
        params: { id: project._id.toString() },
        body: { title: 'New bug', priority: 'P1' },
      },
    );
    expect(status).toBe(201);
    expect(body.data.title).toBe('New bug');
    expect(body.data.priority).toBe('P1');
    expect(body.data.status).toBe('open');
  });

  it('returns 400 for missing title', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/bugs/route');
    const { status } = await callRoute(
      { POST },
      'POST',
      {
        token,
        params: { id: project._id.toString() },
        body: { priority: 'P1' },
      },
    );
    expect(status).toBe(400);
  });
});

describe('GET /api/v1/projects/:id/bugs', () => {
  it('lists bugs with pagination', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    await createBug(project._id.toString(), user._id.toString());
    await createBug(project._id.toString(), user._id.toString());

    const { GET } = await import('@/app/api/v1/projects/[id]/bugs/route');
    const { status, body } = await callRoute(
      { GET },
      'GET',
      { token, params: { id: project._id.toString() } },
    );
    expect(status).toBe(200);
    expect(body.data.bugs).toHaveLength(2);
    expect(body.data.total).toBe(2);
  });
});

describe('GET /api/v1/bugs/:id', () => {
  it('returns bug with populated reporter', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { GET } = await import('@/app/api/v1/bugs/[id]/route');
    const { status, body } = await callRoute(
      { GET },
      'GET',
      { token, params: { id: bug._id.toString() } },
    );
    expect(status).toBe(200);
    expect(body.data.title).toBe('Test Bug');
    expect(body.data.reporter.name).toBe('Test User');
  });
});

describe('PATCH /api/v1/bugs/:id', () => {
  it('updates bug status', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { PATCH } = await import('@/app/api/v1/bugs/[id]/route');
    const { status, body } = await callRoute(
      { PATCH },
      'PATCH',
      {
        token,
        params: { id: bug._id.toString() },
        body: { status: 'investigating' },
      },
    );
    expect(status).toBe(200);
    expect(body.data.status).toBe('investigating');
  });
});

describe('DELETE /api/v1/bugs/:id', () => {
  it('deletes a bug', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { DELETE } = await import('@/app/api/v1/bugs/[id]/route');
    const { status } = await callRoute(
      { DELETE },
      'DELETE',
      { token, params: { id: bug._id.toString() } },
    );
    expect(status).toBe(200);
  });

  it('returns 403 for client role', async () => {
    const { user: admin, token: adminToken } = await getAuthenticatedUser('admin');
    const { token: clientToken } = await getAuthenticatedUser('client');
    const project = await createProject(admin._id.toString());
    const bug = await createBug(project._id.toString(), admin._id.toString());

    const { DELETE } = await import('@/app/api/v1/bugs/[id]/route');
    const { status } = await callRoute(
      { DELETE },
      'DELETE',
      { token: clientToken, params: { id: bug._id.toString() } },
    );
    expect(status).toBe(403);
  });
});

describe('PATCH /api/v1/bugs/:id/link', () => {
  it('unlinks a bug from task', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { PATCH } = await import('@/app/api/v1/bugs/[id]/link/route');
    const { status, body } = await callRoute(
      { PATCH },
      'PATCH',
      {
        token,
        params: { id: bug._id.toString() },
        body: { taskId: null },
      },
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/integration/api/bugs.test.ts --verbose`
Expected: FAIL — route modules not found

- [ ] **Step 3: Create route files**

Create `src/app/api/v1/projects/[id]/bugs/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { BugService } from '@/modules/bugs/bug.service';
import {
  createBugSchema,
  queryBugsSchema,
} from '@/modules/bugs/bug.validator';
import type { CreateBugInput, QueryBugsInput } from '@/modules/bugs/bug.validator';

export const GET = apiHandler({
  validate: { query: queryBugsSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as QueryBugsInput;
    const result = await BugService.list(ctx.params.id, query);
    return {
      data: {
        bugs: result.bugs.map((b) => b.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  validate: { body: createBugSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateBugInput;
    const bug = await BugService.create(ctx.params.id, body, ctx.user.userId);
    return { data: bug.toJSON(), status: 201 };
  },
});
```

Create `src/app/api/v1/bugs/[id]/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { BugService } from '@/modules/bugs/bug.service';
import { updateBugSchema } from '@/modules/bugs/bug.validator';
import type { UpdateBugInput } from '@/modules/bugs/bug.validator';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const bug = await BugService.getById(ctx.params.id);
    return { data: bug.toJSON() };
  },
});

export const PATCH = apiHandler({
  validate: { body: updateBugSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as UpdateBugInput;
    const bug = await BugService.update(ctx.params.id, body);
    return { data: bug.toJSON() };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    await BugService.delete(ctx.params.id);
    return { data: { deleted: true } };
  },
});
```

Create `src/app/api/v1/bugs/[id]/link/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { BugService } from '@/modules/bugs/bug.service';
import { linkBugSchema } from '@/modules/bugs/bug.validator';
import type { LinkBugInput } from '@/modules/bugs/bug.validator';

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: linkBugSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as LinkBugInput;
    const bug = await BugService.linkToTask(ctx.params.id, body.taskId);
    return { data: bug.toJSON() };
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/integration/api/bugs.test.ts --verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/projects/[id]/bugs/ src/app/api/v1/bugs/ tests/integration/api/bugs.test.ts
git commit -m "feat: add bug API routes with integration tests"
```

---

## Task 8: Comment Module — Model + Types + Validator

**Files:**
- Create: `src/modules/comments/comment.types.ts`
- Create: `src/modules/comments/comment.model.ts`
- Create: `src/modules/comments/comment.validator.ts`

- [ ] **Step 1: Create types file**

Create `src/modules/comments/comment.types.ts`:

```typescript
export interface IComment {
  id: string;
  content: string;
  author: string;
  taskId?: string;
  bugId?: string;
  mentions: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create model file**

Create `src/modules/comments/comment.model.ts`:

```typescript
import { Schema, model, models, type Document } from 'mongoose';

export interface CommentDocument extends Document {
  content: string;
  author: Schema.Types.ObjectId;
  taskId?: Schema.Types.ObjectId;
  bugId?: Schema.Types.ObjectId;
  mentions: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDocument>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    bugId: {
      type: Schema.Types.ObjectId,
      ref: 'Bug',
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

commentSchema.index({ taskId: 1, createdAt: 1 });
commentSchema.index({ bugId: 1, createdAt: 1 });

export const Comment =
  (models.Comment as typeof import('mongoose').Model<CommentDocument>) ||
  model<CommentDocument>('Comment', commentSchema);
```

- [ ] **Step 3: Create validator file**

Create `src/modules/comments/comment.validator.ts`:

```typescript
import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1).max(10000).trim(),
  mentions: z.array(z.string()).default([]),
});

export const queryCommentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type QueryCommentsInput = z.infer<typeof queryCommentsSchema>;
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/comments/
git commit -m "feat: add comment model, types, and validator"
```

---

## Task 9: Comment Module — Service + Unit Tests

**Files:**
- Create: `src/modules/comments/comment.service.ts`
- Create: `tests/unit/modules/comments/comment.service.test.ts`

- [ ] **Step 1: Write the unit test file**

Create `tests/unit/modules/comments/comment.service.test.ts`:

```typescript
import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createBug, createComment } from '../../../helpers/factory';
import { CommentService } from '@/modules/comments/comment.service';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('CommentService', () => {
  describe('create', () => {
    it('creates a comment on a bug', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      const comment = await CommentService.create(
        { content: 'This is a comment', mentions: [] },
        user._id.toString(),
        'bug',
        bug._id.toString(),
      );
      expect(comment.content).toBe('This is a comment');
      expect(comment.author.toString()).toBe(user._id.toString());
      expect(comment.bugId!.toString()).toBe(bug._id.toString());
    });

    it('dispatches mention notifications', async () => {
      const author = await createUser();
      const mentioned = await createUser();
      const project = await createProject(author._id.toString());
      const bug = await createBug(project._id.toString(), author._id.toString());

      await CommentService.create(
        { content: 'Hey check this', mentions: [mentioned._id.toString()] },
        author._id.toString(),
        'bug',
        bug._id.toString(),
      );

      const { NotificationService } = await import(
        '@/modules/notifications/notification.service'
      );
      const result = await NotificationService.list(mentioned._id.toString(), { page: 1, limit: 10 });
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].type).toBe('comment_mention');
    });
  });

  describe('list', () => {
    it('returns comments for a bug in chronological order', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      await createComment(user._id.toString(), { bugId: bug._id.toString(), content: 'First' });
      await createComment(user._id.toString(), { bugId: bug._id.toString(), content: 'Second' });

      const result = await CommentService.list('bug', bug._id.toString(), { page: 1, limit: 50 });
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0].content).toBe('First');
      expect(result.comments[1].content).toBe('Second');
    });
  });

  describe('delete', () => {
    it('allows author to delete their comment', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());
      const comment = await createComment(user._id.toString(), { bugId: bug._id.toString() });

      await CommentService.delete(comment._id.toString(), user._id.toString(), 'internal');
      const result = await CommentService.list('bug', bug._id.toString(), { page: 1, limit: 50 });
      expect(result.comments).toHaveLength(0);
    });

    it('allows admin to delete any comment', async () => {
      const user = await createUser();
      const admin = await createUser({ role: 'admin' });
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());
      const comment = await createComment(user._id.toString(), { bugId: bug._id.toString() });

      await CommentService.delete(comment._id.toString(), admin._id.toString(), 'admin');
      const result = await CommentService.list('bug', bug._id.toString(), { page: 1, limit: 50 });
      expect(result.comments).toHaveLength(0);
    });

    it('throws ForbiddenError when non-author non-admin tries to delete', async () => {
      const author = await createUser();
      const other = await createUser();
      const project = await createProject(author._id.toString());
      const bug = await createBug(project._id.toString(), author._id.toString());
      const comment = await createComment(author._id.toString(), { bugId: bug._id.toString() });

      await expect(
        CommentService.delete(comment._id.toString(), other._id.toString(), 'internal'),
      ).rejects.toThrow('Only the author or an admin can delete this comment');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/modules/comments/comment.service.test.ts --verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Create the service**

Create `src/modules/comments/comment.service.ts`:

```typescript
import { Comment } from '@/modules/comments/comment.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { ForbiddenError } from '@/shared/middleware/role-guard';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { Role } from '@/shared/utils/constants';
import type { CreateCommentInput, QueryCommentsInput } from './comment.validator';

export const CommentService = {
  async create(
    data: CreateCommentInput,
    userId: string,
    parentType: 'bug' | 'task',
    parentId: string,
  ) {
    const parentField = parentType === 'bug' ? 'bugId' : 'taskId';

    const comment = await Comment.create({
      content: data.content,
      author: userId,
      [parentField]: parentId,
      mentions: data.mentions,
    });

    if (data.mentions.length > 0) {
      const { NotificationService } = await import(
        '@/modules/notifications/notification.service'
      );
      const link =
        parentType === 'bug'
          ? `/bugs/${parentId}`
          : `/tasks/${parentId}`;

      await Promise.all(
        data.mentions.map((mentionedUserId) =>
          NotificationService.notify(
            mentionedUserId,
            'comment_mention',
            'You were mentioned in a comment',
            data.content.slice(0, 100),
            link,
          ),
        ),
      ).catch(() => {});
    }

    return comment;
  },

  async list(
    parentType: 'bug' | 'task',
    parentId: string,
    query: Partial<QueryCommentsInput> = {},
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const parentField = parentType === 'bug' ? 'bugId' : 'taskId';
    const filter = { [parentField]: parentId };

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate('author', 'name email avatar')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: 1 }),
      Comment.countDocuments(filter),
    ]);

    return { comments, page, limit, total };
  },

  async delete(id: string, userId: string, userRole: Role) {
    const comment = await Comment.findById(id);
    if (!comment) {
      throw new NotFoundError('Comment');
    }

    if (comment.author.toString() !== userId && userRole !== 'admin') {
      throw new ForbiddenError('Only the author or an admin can delete this comment');
    }

    await Comment.findByIdAndDelete(id);
    return comment;
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/unit/modules/comments/comment.service.test.ts --verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/comments/comment.service.ts tests/unit/modules/comments/
git commit -m "feat: add comment service with unit tests"
```

---

## Task 10: Comment Module — API Routes + Integration Tests

**Files:**
- Create: `src/app/api/v1/projects/[id]/bugs/[bugId]/comments/route.ts`
- Create: `src/app/api/v1/projects/[id]/tasks/[taskId]/comments/route.ts`
- Create: `src/app/api/v1/comments/[id]/route.ts`
- Create: `tests/integration/api/comments.test.ts`

- [ ] **Step 1: Write the integration test file**

Create `tests/integration/api/comments.test.ts`:

```typescript
import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';
import { createProject, createBug, createComment } from '../../helpers/factory';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

async function callRoute(
  routeModule: Record<string, Function>,
  method: string,
  opts: { token: string; params?: Record<string, string>; body?: unknown; query?: Record<string, string> },
) {
  const url = new URL('http://localhost:3000/api/v1/test');
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const req = new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const handler = routeModule[method]!;
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  return { status: res.status, body: await res.json() };
}

describe('POST /api/v1/projects/:id/bugs/:bugId/comments', () => {
  it('creates a comment on a bug', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/bugs/[bugId]/comments/route');
    const { status, body } = await callRoute(
      { POST },
      'POST',
      {
        token,
        params: { id: project._id.toString(), bugId: bug._id.toString() },
        body: { content: 'A bug comment', mentions: [] },
      },
    );
    expect(status).toBe(201);
    expect(body.data.content).toBe('A bug comment');
  });

  it('returns 400 for empty content', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/bugs/[bugId]/comments/route');
    const { status } = await callRoute(
      { POST },
      'POST',
      {
        token,
        params: { id: project._id.toString(), bugId: bug._id.toString() },
        body: { content: '', mentions: [] },
      },
    );
    expect(status).toBe(400);
  });
});

describe('GET /api/v1/projects/:id/bugs/:bugId/comments', () => {
  it('lists bug comments', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());
    await createComment(user._id.toString(), { bugId: bug._id.toString(), content: 'C1' });
    await createComment(user._id.toString(), { bugId: bug._id.toString(), content: 'C2' });

    const { GET } = await import('@/app/api/v1/projects/[id]/bugs/[bugId]/comments/route');
    const { status, body } = await callRoute(
      { GET },
      'GET',
      { token, params: { id: project._id.toString(), bugId: bug._id.toString() } },
    );
    expect(status).toBe(200);
    expect(body.data.comments).toHaveLength(2);
  });
});

describe('DELETE /api/v1/comments/:id', () => {
  it('allows author to delete', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());
    const comment = await createComment(user._id.toString(), { bugId: bug._id.toString() });

    const { DELETE } = await import('@/app/api/v1/comments/[id]/route');
    const { status } = await callRoute(
      { DELETE },
      'DELETE',
      { token, params: { id: comment._id.toString() } },
    );
    expect(status).toBe(200);
  });

  it('returns 403 for non-author non-admin', async () => {
    const { user } = await getAuthenticatedUser();
    const { token: otherToken } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());
    const comment = await createComment(user._id.toString(), { bugId: bug._id.toString() });

    const { DELETE } = await import('@/app/api/v1/comments/[id]/route');
    const { status } = await callRoute(
      { DELETE },
      'DELETE',
      { token: otherToken, params: { id: comment._id.toString() } },
    );
    expect(status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/integration/api/comments.test.ts --verbose`
Expected: FAIL — route modules not found

- [ ] **Step 3: Create route files**

Create `src/app/api/v1/projects/[id]/bugs/[bugId]/comments/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { CommentService } from '@/modules/comments/comment.service';
import {
  createCommentSchema,
  queryCommentsSchema,
} from '@/modules/comments/comment.validator';
import type { CreateCommentInput, QueryCommentsInput } from '@/modules/comments/comment.validator';

export const GET = apiHandler({
  validate: { query: queryCommentsSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as QueryCommentsInput;
    const result = await CommentService.list('bug', ctx.params.bugId, query);
    return {
      data: {
        comments: result.comments.map((c) => c.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  validate: { body: createCommentSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateCommentInput;
    const comment = await CommentService.create(
      body,
      ctx.user.userId,
      'bug',
      ctx.params.bugId,
    );
    return { data: comment.toJSON(), status: 201 };
  },
});
```

Create `src/app/api/v1/projects/[id]/tasks/[taskId]/comments/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { CommentService } from '@/modules/comments/comment.service';
import {
  createCommentSchema,
  queryCommentsSchema,
} from '@/modules/comments/comment.validator';
import type { CreateCommentInput, QueryCommentsInput } from '@/modules/comments/comment.validator';

export const GET = apiHandler({
  validate: { query: queryCommentsSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as QueryCommentsInput;
    const result = await CommentService.list('task', ctx.params.taskId, query);
    return {
      data: {
        comments: result.comments.map((c) => c.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  validate: { body: createCommentSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateCommentInput;
    const comment = await CommentService.create(
      body,
      ctx.user.userId,
      'task',
      ctx.params.taskId,
    );
    return { data: comment.toJSON(), status: 201 };
  },
});
```

Create `src/app/api/v1/comments/[id]/route.ts`:

```typescript
import { apiHandler } from '@/shared/middleware/api-handler';
import { CommentService } from '@/modules/comments/comment.service';

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    await CommentService.delete(ctx.params.id, ctx.user.userId, ctx.user.role);
    return { data: { deleted: true } };
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/integration/api/comments.test.ts --verbose`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/projects/[id]/bugs/[bugId]/ src/app/api/v1/projects/[id]/tasks/[taskId]/ src/app/api/v1/comments/ tests/integration/api/comments.test.ts
git commit -m "feat: add comment API routes with integration tests"
```

---

## Task 11: React Query Hooks

**Files:**
- Create: `src/hooks/queries/use-notifications.ts`
- Create: `src/hooks/queries/use-bugs.ts`
- Create: `src/hooks/queries/use-comments.ts`

- [ ] **Step 1: Create notification hooks**

Create `src/hooks/queries/use-notifications.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';

export function useNotifications(query?: Record<string, string>) {
  return useQuery({
    queryKey: ['notifications', query],
    queryFn: () => api.get('/notifications', query),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 30000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

- [ ] **Step 2: Create bug hooks**

Create `src/hooks/queries/use-bugs.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';

export function useBugs(projectId: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['bugs', projectId, filters],
    queryFn: () => api.get(`/projects/${projectId}/bugs`, filters),
    enabled: !!projectId,
  });
}

export function useBug(bugId: string) {
  return useQuery({
    queryKey: ['bug', bugId],
    queryFn: () => api.get(`/bugs/${bugId}`),
    enabled: !!bugId,
  });
}

export function useCreateBug(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      priority?: string;
      source?: string;
      metadata?: Record<string, unknown>;
    }) => api.post(`/projects/${projectId}/bugs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs', projectId] });
    },
  });
}

export function useUpdateBug(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bugId, data }: { bugId: string; data: Record<string, unknown> }) =>
      api.patch(`/bugs/${bugId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bug'] });
    },
  });
}

export function useDeleteBug(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bugId: string) => api.delete(`/bugs/${bugId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs', projectId] });
    },
  });
}

export function useLinkBug(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bugId, taskId }: { bugId: string; taskId: string | null }) =>
      api.patch(`/bugs/${bugId}/link`, { taskId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['bug'] });
    },
  });
}
```

- [ ] **Step 3: Create comment hooks**

Create `src/hooks/queries/use-comments.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';

export function useComments(
  projectId: string,
  parentType: 'bug' | 'task',
  parentId: string,
  query?: Record<string, string>,
) {
  const path =
    parentType === 'bug'
      ? `/projects/${projectId}/bugs/${parentId}/comments`
      : `/projects/${projectId}/tasks/${parentId}/comments`;

  return useQuery({
    queryKey: ['comments', parentType, parentId, query],
    queryFn: () => api.get(path, query),
    enabled: !!projectId && !!parentId,
  });
}

export function useCreateComment(
  projectId: string,
  parentType: 'bug' | 'task',
  parentId: string,
) {
  const queryClient = useQueryClient();
  const path =
    parentType === 'bug'
      ? `/projects/${projectId}/bugs/${parentId}/comments`
      : `/projects/${projectId}/tasks/${parentId}/comments`;

  return useMutation({
    mutationFn: (data: { content: string; mentions: string[] }) =>
      api.post(path, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', parentType, parentId] });
    },
  });
}

export function useDeleteComment(parentType: 'bug' | 'task', parentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.delete(`/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', parentType, parentId] });
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/queries/use-notifications.ts src/hooks/queries/use-bugs.ts src/hooks/queries/use-comments.ts
git commit -m "feat: add React Query hooks for notifications, bugs, and comments"
```

---

## Task 12: Notification Bell + Dropdown UI

**Files:**
- Modify: `src/components/layouts/topbar.tsx`
- Create: `src/components/features/notifications/notification-dropdown.tsx`

- [ ] **Step 1: Create the notification dropdown component**

Create `src/components/features/notifications/notification-dropdown.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Bug, UserCircle, ChatCircle, Flag } from '@phosphor-icons/react';
import { useNotifications, useMarkAsRead, useMarkAllRead } from '@/hooks/queries/use-notifications';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'bug_created':
      return <Bug size={16} className="shrink-0 text-error" />;
    case 'task_assigned':
      return <UserCircle size={16} className="shrink-0 text-accent" />;
    case 'comment_mention':
      return <ChatCircle size={16} className="shrink-0 text-info" />;
    case 'priority_changed':
      return <Flag size={16} className="shrink-0 text-warning" />;
    default:
      return <Bug size={16} className="shrink-0 text-secondary" />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const { data, isLoading } = useNotifications({ limit: '20' });
  const markAsRead = useMarkAsRead();
  const markAllRead = useMarkAllRead();

  const notifications: NotificationItem[] =
    (data as { notifications?: NotificationItem[] })?.notifications ?? [];

  function handleClick(notification: NotificationItem) {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
    onClose();
  }

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-default bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-subtle px-3 py-2">
        <span className="text-sm font-medium text-primary">Notifications</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleMarkAllRead}
          disabled={markAllRead.isPending}
        >
          Mark all read
        </Button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted">
            No notifications
          </div>
        )}

        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleClick(notification)}
            className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-[120ms] ease-[ease] hover:bg-subtle ${
              !notification.read ? 'bg-accent-muted/30' : ''
            }`}
          >
            <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm ${
                  !notification.read ? 'font-medium text-primary' : 'text-secondary'
                }`}
              >
                {notification.title}
              </p>
              <p className="truncate text-xs text-muted">{notification.message}</p>
              <p className="mt-0.5 text-xs text-muted">{timeAgo(notification.createdAt)}</p>
            </div>
            {!notification.read && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update topbar to wire the bell**

Replace the full content of `src/components/layouts/topbar.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadCount } from '@/hooks/queries/use-notifications';
import { NotificationDropdown } from '@/components/features/notifications/notification-dropdown';

export function Topbar() {
  const { user } = useAuth();
  const { data: unreadData } = useUnreadCount();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = (unreadData as { count?: number })?.count ?? 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-subtle bg-surface px-6">
      <h1 className="text-base font-semibold tracking-tight text-primary">
        Projects
      </h1>

      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown((prev) => !prev)}
            className="relative flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors duration-[120ms] ease-[ease] hover:bg-subtle"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 h-[7px] w-[7px] rounded-full border-2 border-surface bg-error" />
            )}
          </button>

          {showDropdown && (
            <NotificationDropdown onClose={() => setShowDropdown(false)} />
          )}
        </div>

        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full">
          <Avatar
            size={28}
            variant="beam"
            name={user?.name ?? 'User'}
            colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
          />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layouts/topbar.tsx src/components/features/notifications/
git commit -m "feat: wire notification bell with dropdown and real-time unread count"
```

---

## Task 13: Bug List Page + Create Bug Dialog

**Files:**
- Create: `src/components/features/bugs/bug-list.tsx`
- Create: `src/components/features/bugs/create-bug-dialog.tsx`
- Create: `src/app/(dashboard)/projects/[id]/bugs/page.tsx`

- [ ] **Step 1: Create bug list component**

Create `src/components/features/bugs/bug-list.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Avatar from 'boring-avatars';
import { Bug as BugIcon, Plus } from '@phosphor-icons/react';
import { useBugs } from '@/hooks/queries/use-bugs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateBugDialog } from './create-bug-dialog';

const PRIORITY_STYLES: Record<string, string> = {
  P0: 'bg-[var(--color-p0-muted)] text-[var(--color-p0)]',
  P1: 'bg-[var(--color-p1-muted)] text-[var(--color-p1)]',
  P2: 'bg-[var(--color-p2-muted)] text-[var(--color-p2)]',
  P3: 'bg-[var(--color-p3-muted)] text-[var(--color-p3)]',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
  investigating: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  resolved: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  closed: 'bg-subtle text-muted',
};

interface BugItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  source: string;
  reporter: { name: string; email: string; avatar?: string };
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function BugList({ projectId }: { projectId: string }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);

  const filters: Record<string, string> = {};
  if (search) filters.search = search;
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (priorityFilter !== 'all') filters.priority = priorityFilter;

  const { data, isLoading } = useBugs(projectId, filters);
  const bugs: BugItem[] = (data as { bugs?: BugItem[] })?.bugs ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-primary">Bugs</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={14} data-icon="inline-start" />
          Report Bug
        </Button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex items-center gap-2">
        <Input
          placeholder="Search bugs..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="P0">P0 — Urgent</SelectItem>
            <SelectItem value="P1">P1 — High</SelectItem>
            <SelectItem value="P2">P2 — Medium</SelectItem>
            <SelectItem value="P3">P3 — Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-lg border border-subtle">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_80px_100px_120px_100px] gap-4 border-b border-default bg-subtle px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Title</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Priority</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Status</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Reporter</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Created</span>
        </div>

        {/* Loading state */}
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_120px_100px] gap-4 border-b border-subtle px-4 py-2.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}

        {/* Empty state */}
        {!isLoading && bugs.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <BugIcon size={24} className="text-muted" />
            <p className="text-sm text-muted">No bugs found</p>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
              Report a bug
            </Button>
          </div>
        )}

        {/* Bug rows */}
        {bugs.map((bug) => (
          <Link
            key={bug.id}
            href={`/projects/${projectId}/bugs/${bug.id}`}
            className="grid grid-cols-[1fr_80px_100px_120px_100px] gap-4 border-b border-subtle px-4 py-2.5 transition-colors duration-[120ms] ease-[ease] last:border-b-0 hover:bg-subtle"
          >
            <span className="truncate text-sm text-primary">{bug.title}</span>
            <span>
              <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[bug.priority]}`}>
                {bug.priority}
              </span>
            </span>
            <span>
              <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[bug.status]}`}>
                {bug.status}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-5 w-5 overflow-hidden rounded-full">
                <Avatar size={20} variant="beam" name={bug.reporter.name} colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']} />
              </div>
              <span className="truncate text-xs text-secondary">{bug.reporter.name}</span>
            </span>
            <span className="text-xs text-muted">{timeAgo(bug.createdAt)}</span>
          </Link>
        ))}
      </div>

      <CreateBugDialog
        projectId={projectId}
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the create-bug dialog**

Create `src/components/features/bugs/create-bug-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateBug } from '@/hooks/queries/use-bugs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface CreateBugDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBugDialog({ projectId, open, onOpenChange }: CreateBugDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('P2');
  const createBug = useCreateBug(projectId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    createBug.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      },
      {
        onSuccess: () => {
          toast.success('Bug reported');
          setTitle('');
          setDescription('');
          setPriority('P2');
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Failed to report bug');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Describe the issue you encountered.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bug-title">Title</Label>
            <Input
              id="bug-title"
              placeholder="Brief description of the bug"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bug-description">Description</Label>
            <textarea
              id="bug-description"
              placeholder="Steps to reproduce, expected vs actual behavior..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-default bg-surface px-2.5 py-1.5 text-sm text-primary placeholder:text-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P0">P0 — Urgent</SelectItem>
                <SelectItem value="P1">P1 — High</SelectItem>
                <SelectItem value="P2">P2 — Medium</SelectItem>
                <SelectItem value="P3">P3 — Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createBug.isPending}>
              {createBug.isPending ? 'Reporting...' : 'Report Bug'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create the bug list page**

Create `src/app/(dashboard)/projects/[id]/bugs/page.tsx`:

```typescript
'use client';

import { use } from 'react';
import { BugList } from '@/components/features/bugs/bug-list';

export default function BugsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="p-6">
      <BugList projectId={id} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/features/bugs/ src/app/(dashboard)/projects/[id]/bugs/
git commit -m "feat: add bug list page with create dialog"
```

---

## Task 14: Bug Detail Page + Comments UI

**Files:**
- Create: `src/components/features/bugs/bug-detail.tsx`
- Create: `src/components/features/comments/comment-list.tsx`
- Create: `src/components/features/comments/comment-input.tsx`
- Create: `src/app/(dashboard)/projects/[id]/bugs/[bugId]/page.tsx`

- [ ] **Step 1: Create comment list component**

Create `src/components/features/comments/comment-list.tsx`:

```typescript
'use client';

import { Trash } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { useComments, useDeleteComment } from '@/hooks/queries/use-comments';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface CommentItem {
  id: string;
  content: string;
  author: { id?: string; _id?: string; name: string; email: string; avatar?: string };
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface CommentListProps {
  projectId: string;
  parentType: 'bug' | 'task';
  parentId: string;
}

export function CommentList({ projectId, parentType, parentId }: CommentListProps) {
  const { user } = useAuth();
  const { data, isLoading } = useComments(projectId, parentType, parentId);
  const deleteComment = useDeleteComment(parentType, parentId);

  const comments: CommentItem[] =
    (data as { comments?: CommentItem[] })?.comments ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-2.5">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted">No comments yet</p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const authorId = comment.author.id ?? comment.author._id ?? '';
        const isOwn = user?.id === authorId;
        const isAdmin = user?.role === 'admin';

        return (
          <div key={comment.id} className="group flex gap-2.5">
            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
              <Avatar
                size={24}
                variant="beam"
                name={comment.author.name}
                colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  {comment.author.name}
                </span>
                <span className="text-xs text-muted">{timeAgo(comment.createdAt)}</span>
                {(isOwn || isAdmin) && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    <Trash size={12} />
                  </Button>
                )}
              </div>
              <p className="mt-0.5 text-sm text-secondary whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create comment input component**

Create `src/components/features/comments/comment-input.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { useCreateComment } from '@/hooks/queries/use-comments';
import { Button } from '@/components/ui/button';

interface CommentInputProps {
  projectId: string;
  parentType: 'bug' | 'task';
  parentId: string;
}

export function CommentInput({ projectId, parentType, parentId }: CommentInputProps) {
  const [content, setContent] = useState('');
  const createComment = useCreateComment(projectId, parentType, parentId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    createComment.mutate(
      { content: content.trim(), mentions: [] },
      {
        onSuccess: () => setContent(''),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        placeholder="Add a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="flex-1 rounded-md border border-default bg-surface px-2.5 py-1.5 text-sm text-primary placeholder:text-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e);
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!content.trim() || createComment.isPending}
        className="self-end"
      >
        <PaperPlaneTilt size={16} />
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create bug detail component**

Create `src/components/features/bugs/bug-detail.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash, LinkSimple } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { toast } from 'sonner';
import { useBug, useUpdateBug, useDeleteBug } from '@/hooks/queries/use-bugs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentList } from '@/components/features/comments/comment-list';
import { CommentInput } from '@/components/features/comments/comment-input';

const PRIORITY_STYLES: Record<string, string> = {
  P0: 'bg-[var(--color-p0-muted)] text-[var(--color-p0)]',
  P1: 'bg-[var(--color-p1-muted)] text-[var(--color-p1)]',
  P2: 'bg-[var(--color-p2-muted)] text-[var(--color-p2)]',
  P3: 'bg-[var(--color-p3-muted)] text-[var(--color-p3)]',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-[var(--color-info-muted)] text-[var(--color-info)]',
  investigating: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  resolved: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  closed: 'bg-subtle text-muted',
};

interface BugData {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  source: string;
  reporter: { name: string; email: string; avatar?: string };
  task?: { title: string; status: string };
  metadata: {
    url?: string;
    device?: string;
    browser?: string;
    os?: string;
    viewport?: { width: number; height: number };
    consoleLogs?: string;
    screenshot?: string;
  };
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BugDetail({ projectId, bugId }: { projectId: string; bugId: string }) {
  const router = useRouter();
  const { data, isLoading } = useBug(bugId);
  const updateBug = useUpdateBug(projectId);
  const deleteBug = useDeleteBug(projectId);

  const bug = data as BugData | undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!bug) return null;

  function handleStatusChange(status: string) {
    updateBug.mutate({ bugId, data: { status } });
  }

  function handlePriorityChange(priority: string) {
    updateBug.mutate({ bugId, data: { priority } });
  }

  function handleDelete() {
    deleteBug.mutate(bugId, {
      onSuccess: () => {
        toast.success('Bug deleted');
        router.push(`/projects/${projectId}/bugs`);
      },
    });
  }

  const hasMetadata =
    bug.metadata.url ||
    bug.metadata.device ||
    bug.metadata.browser ||
    bug.metadata.os ||
    bug.metadata.consoleLogs ||
    bug.metadata.screenshot;

  return (
    <div>
      {/* Back button + actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}/bugs`)}
        >
          <ArrowLeft size={14} data-icon="inline-start" />
          Back to bugs
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={handleDelete}>
          <Trash size={16} className="text-error" />
        </Button>
      </div>

      {/* Title + badges */}
      <div className="mt-4">
        <h1 className="text-xl font-semibold tracking-tight text-primary">{bug.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[bug.priority]}`}>
            {bug.priority}
          </span>
          <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[bug.status]}`}>
            {bug.status}
          </span>
          <Badge variant="secondary">{bug.source}</Badge>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mt-6 grid grid-cols-[1fr_240px] gap-6">
        {/* Main content */}
        <div className="min-w-0">
          {bug.description && (
            <div className="rounded-lg border border-subtle p-4">
              <p className="text-sm text-secondary whitespace-pre-wrap">{bug.description}</p>
            </div>
          )}

          {/* Metadata */}
          {hasMetadata && (
            <div className="mt-4 rounded-lg border border-subtle p-4">
              <h3 className="text-sm font-medium text-primary">Technical Details</h3>
              <div className="mt-3 space-y-2 text-sm">
                {bug.metadata.url && (
                  <div className="flex gap-2">
                    <span className="text-muted">URL:</span>
                    <span className="font-mono text-xs text-secondary">{bug.metadata.url}</span>
                  </div>
                )}
                {bug.metadata.device && (
                  <div className="flex gap-2">
                    <span className="text-muted">Device:</span>
                    <span className="text-secondary">{bug.metadata.device}</span>
                  </div>
                )}
                {bug.metadata.browser && (
                  <div className="flex gap-2">
                    <span className="text-muted">Browser:</span>
                    <span className="text-secondary">{bug.metadata.browser}</span>
                  </div>
                )}
                {bug.metadata.os && (
                  <div className="flex gap-2">
                    <span className="text-muted">OS:</span>
                    <span className="text-secondary">{bug.metadata.os}</span>
                  </div>
                )}
                {bug.metadata.viewport && (
                  <div className="flex gap-2">
                    <span className="text-muted">Viewport:</span>
                    <span className="text-secondary">
                      {bug.metadata.viewport.width}×{bug.metadata.viewport.height}
                    </span>
                  </div>
                )}
                {bug.metadata.consoleLogs && (
                  <div>
                    <span className="text-muted">Console:</span>
                    <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-subtle p-2 font-mono text-xs text-secondary">
                      {bug.metadata.consoleLogs}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-primary">Comments</h3>
            <Separator className="my-3" />
            <CommentList projectId={projectId} parentType="bug" parentId={bugId} />
            <div className="mt-4">
              <CommentInput projectId={projectId} parentType="bug" parentId={bugId} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-lg border border-subtle p-3">
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Status</span>
                <Select value={bug.status} onValueChange={handleStatusChange}>
                  <SelectTrigger size="sm" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Priority</span>
                <Select value={bug.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger size="sm" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 — Urgent</SelectItem>
                    <SelectItem value="P1">P1 — High</SelectItem>
                    <SelectItem value="P2">P2 — Medium</SelectItem>
                    <SelectItem value="P3">P3 — Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Reporter</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-5 w-5 overflow-hidden rounded-full">
                    <Avatar size={20} variant="beam" name={bug.reporter.name} colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']} />
                  </div>
                  <span className="text-sm text-secondary">{bug.reporter.name}</span>
                </div>
              </div>
              {bug.task && (
                <>
                  <Separator />
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">Linked Task</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <LinkSimple size={14} className="text-muted" />
                      <span className="text-sm text-accent-text">{bug.task.title}</span>
                    </div>
                  </div>
                </>
              )}
              <Separator />
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Created</span>
                <p className="mt-0.5 text-sm text-secondary">{formatDate(bug.createdAt)}</p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Updated</span>
                <p className="mt-0.5 text-sm text-secondary">{formatDate(bug.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create bug detail page**

Create `src/app/(dashboard)/projects/[id]/bugs/[bugId]/page.tsx`:

```typescript
'use client';

import { use } from 'react';
import { BugDetail } from '@/components/features/bugs/bug-detail';

export default function BugDetailPage({
  params,
}: {
  params: Promise<{ id: string; bugId: string }>;
}) {
  const { id, bugId } = use(params);
  return (
    <div className="p-6">
      <BugDetail projectId={id} bugId={bugId} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/features/bugs/bug-detail.tsx src/components/features/comments/ src/app/(dashboard)/projects/[id]/bugs/[bugId]/
git commit -m "feat: add bug detail page with comments UI"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `npx jest tests/unit/ --verbose`
Expected: All tests PASS

- [ ] **Step 2: Run all integration tests**

Run: `npx jest tests/integration/ --verbose`
Expected: All tests PASS

- [ ] **Step 3: Run lint**

Run: `npx next lint`
Expected: No errors (warnings acceptable)

- [ ] **Step 4: Run build**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 5: Start dev server and verify UI**

Run: `npx next dev`

Manual checks:
- Navigate to `/projects/{id}/bugs` — see empty bug list with "Report a bug" button
- Click "Report Bug" — dialog opens, fill in title/priority, submit
- Bug appears in the list with correct priority/status badges
- Click bug row — navigates to bug detail page
- Change status/priority via sidebar selects — updates persist
- Add a comment — appears in comment list
- Delete own comment — disappears
- Click notification bell in topbar — dropdown opens
- Check for red dot when unread notifications exist
- "Mark all read" clears the dot

- [ ] **Step 6: Final commit if any lint/type fixes were needed**

```bash
git add -A
git commit -m "fix: address lint and type issues from final verification"
```
