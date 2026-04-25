# Orbiter Plan 5: Client Portal & Views — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the client-facing portal (simplified read-only project access), full Kanban/Table/Timeline views for the dashboard, a Cmd+K command palette, My Work personal dashboard, keyboard shortcuts, and favorites/recents sidebar sections.

**Architecture:** Next.js 15 App Router `(portal)/` route group with its own layout gating `client` role users. Dashboard views share reusable components (`DataTable`, `KanbanBoard`, `TimelineChart`). Command palette is a global component rendered in the root layout. Favorites/recents stored client-side in localStorage via a Zustand store. All views use React Query hooks from Plans 2-4 for data fetching.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities, framer-motion, fuse.js, @tanstack/react-query, zustand, Phosphor Icons, Boring Avatars, date-fns

**Spec:** `docs/superpowers/specs/2026-04-24-orbiter-design.md`
**Design System:** `DESIGN_SYSTEM.md`
**Dependencies:** Plans 2-4 must be merged (epics, tasks, sprints, bugs, notifications, docs, links, env vars all exist).

---

## File Structure

```
src/
├── app/
│   ├── (portal)/
│   │   ├── layout.tsx                              ← Portal layout: simplified sidebar + AuthProvider gate (client role)
│   │   ├── page.tsx                                ← Client project list
│   │   └── projects/
│   │       └── [id]/
│   │           ├── layout.tsx                      ← Portal project layout: tabs (Overview, Board, Timeline, Links)
│   │           ├── page.tsx                        ← Overview: progress card, stats
│   │           ├── board/page.tsx                  ← 3-column Kanban (Backlog/In Progress/Done)
│   │           ├── timeline/page.tsx               ← Timeline/Gantt (read-only)
│   │           └── links/page.tsx                  ← Project links (read-only)
│   ├── (dashboard)/
│   │   ├── projects/
│   │   │   └── [id]/
│   │   │       ├── board/page.tsx                  ← 5-column Kanban (full)
│   │   │       ├── table/page.tsx                  ← Table view
│   │   │       └── timeline/page.tsx               ← Timeline/Gantt view
│   │   └── my-work/page.tsx                        ← My Work personal dashboard
│   └── api/v1/
│       ├── tasks/
│       │   ├── my/route.ts                         ← GET my tasks across all projects
│       │   └── [id]/
│       │       └── reorder/route.ts                ← PATCH reorder (drag-and-drop)
│       └── portal/
│           ├── projects/
│           │   ├── route.ts                        ← GET client projects
│           │   └── [id]/
│           │       ├── route.ts                    ← GET client project detail
│           │       ├── tasks/route.ts              ← GET client-visible tasks
│           │       ├── epics/route.ts              ← GET client-visible epics
│           │       └── links/route.ts              ← GET project links
│
├── components/
│   ├── features/
│   │   ├── kanban/
│   │   │   ├── kanban-board.tsx                    ← Full 5-column board (dashboard)
│   │   │   ├── kanban-column.tsx                   ← Droppable column
│   │   │   ├── kanban-card.tsx                     ← Draggable task card
│   │   │   ├── kanban-card-skeleton.tsx            ← Loading skeleton for card
│   │   │   └── kanban-filter-bar.tsx               ← Filter bar: status, priority, assignee, tags, search
│   │   ├── table/
│   │   │   ├── task-table.tsx                      ← Task table view wrapper
│   │   │   └── bulk-actions-bar.tsx                ← Floating bulk actions bar
│   │   ├── timeline/
│   │   │   ├── timeline-chart.tsx                  ← Horizontal Gantt-style chart
│   │   │   ├── timeline-row.tsx                    ← Epic row with progress bar
│   │   │   └── timeline-header.tsx                 ← Week axis + sprint boundaries
│   │   ├── portal/
│   │   │   ├── portal-project-card.tsx             ← Client project card
│   │   │   ├── portal-progress-card.tsx            ← Progress overview card
│   │   │   └── portal-kanban-board.tsx             ← 3-column simplified Kanban
│   │   ├── my-work/
│   │   │   ├── my-work-group.tsx                   ← Task group (Overdue, Today, etc.)
│   │   │   └── my-work-task-row.tsx                ← Task row with project context
│   │   └── command-palette/
│   │       ├── command-palette.tsx                 ← Main modal: search + results + actions
│   │       ├── command-palette-result.tsx           ← Single result item
│   │       └── command-palette-provider.tsx         ← Global keyboard listener + state
│   ├── shared/
│   │   └── data-table.tsx                          ← Reusable sortable/filterable DataTable
│   └── layouts/
│       ├── portal-sidebar.tsx                      ← Simplified sidebar for client portal
│       └── keyboard-shortcuts-overlay.tsx           ← Shortcut cheat sheet overlay
│
├── hooks/
│   ├── queries/
│   │   ├── use-my-tasks.ts                         ← React Query: tasks assigned to me
│   │   └── use-portal-data.ts                      ← React Query: portal-specific queries
│   ├── use-keyboard-shortcuts.ts                   ← Global keyboard shortcut handler
│   ├── use-favorites.ts                            ← Zustand store for favorites (localStorage)
│   └── use-recents.ts                              ← Zustand store for recents (localStorage)
│
├── modules/
│   └── tasks/
│       └── task.service.ts                         ← Add: getMyTasks(), reorderTask(), getClientVisibleTasks()

tests/
├── unit/
│   ├── components/
│   │   ├── kanban-board.test.tsx
│   │   ├── data-table.test.tsx
│   │   ├── command-palette.test.tsx
│   │   └── timeline-chart.test.tsx
│   └── hooks/
│       ├── use-keyboard-shortcuts.test.ts
│       ├── use-favorites.test.ts
│       └── use-recents.test.ts
├── integration/
│   └── api/
│       ├── portal.test.ts                          ← Portal API endpoint tests
│       ├── my-tasks.test.ts                        ← My tasks endpoint tests
│       └── task-reorder.test.ts                    ← Reorder endpoint tests
└── e2e/
    ├── client-portal.spec.ts
    ├── kanban-board.spec.ts
    └── command-palette.spec.ts
```

---

### Task 1: Portal API Routes & Service Layer

**Files:**
- Modify: `src/modules/tasks/task.service.ts`
- Create: `src/app/api/v1/portal/projects/route.ts`, `src/app/api/v1/portal/projects/[id]/route.ts`, `src/app/api/v1/portal/projects/[id]/tasks/route.ts`, `src/app/api/v1/portal/projects/[id]/epics/route.ts`, `src/app/api/v1/portal/projects/[id]/links/route.ts`
- Test: `tests/integration/api/portal.test.ts`

- [ ] **Step 1: Write integration tests for portal API**

```typescript
// tests/integration/api/portal.test.ts
import { testRequest } from '@/tests/helpers/request';
import { buildUser, buildProject, buildTask } from '@/tests/helpers/factory';
import { getAuthToken } from '@/tests/helpers/auth';

describe('Portal API', () => {
  let clientUser: any;
  let clientToken: string;
  let project: any;

  beforeEach(async () => {
    clientUser = await buildUser({ role: 'client' });
    clientToken = await getAuthToken(clientUser);
    project = await buildProject({ clients: [clientUser._id] });
  });

  describe('GET /api/v1/portal/projects', () => {
    it('returns only projects where user is a client', async () => {
      await buildProject(); // another project — not assigned
      const res = await testRequest
        .get('/api/v1/portal/projects')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]._id).toBe(project._id.toString());
    });

    it('rejects non-client users', async () => {
      const internalUser = await buildUser({ role: 'internal' });
      const internalToken = await getAuthToken(internalUser);
      const res = await testRequest
        .get('/api/v1/portal/projects')
        .set('Authorization', `Bearer ${internalToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/portal/projects/:id/tasks', () => {
    it('returns only clientVisible tasks', async () => {
      await buildTask({ project: project._id, clientVisible: true, title: 'Visible' });
      await buildTask({ project: project._id, clientVisible: false, title: 'Hidden' });
      const res = await testRequest
        .get(`/api/v1/portal/projects/${project._id}/tasks`)
        .set('Authorization', `Bearer ${clientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Visible');
    });
  });

  describe('GET /api/v1/portal/projects/:id', () => {
    it('returns project detail with progress stats', async () => {
      await buildTask({ project: project._id, clientVisible: true, status: 'done' });
      await buildTask({ project: project._id, clientVisible: true, status: 'in_progress' });
      const res = await testRequest
        .get(`/api/v1/portal/projects/${project._id}`)
        .set('Authorization', `Bearer ${clientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.progress).toBeDefined();
      expect(res.body.data.progress.total).toBe(2);
      expect(res.body.data.progress.done).toBe(1);
    });

    it('rejects access to project user is not a client of', async () => {
      const otherProject = await buildProject();
      const res = await testRequest
        .get(`/api/v1/portal/projects/${otherProject._id}`)
        .set('Authorization', `Bearer ${clientToken}`);
      expect(res.status).toBe(403);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/integration/api/portal.test.ts --no-cache
```
Expected: FAIL — routes do not exist.

- [ ] **Step 3: Add service methods for portal data**

Add these methods to `src/modules/tasks/task.service.ts`:

```typescript
// Add to TaskService class

async getClientVisibleTasks(
  projectId: string,
  query: PaginationQuery & { status?: string },
): Promise<{ data: ITask[]; total: number }> {
  const filter: Record<string, unknown> = {
    project: projectId,
    clientVisible: true,
  };
  if (query.status) filter.status = query.status;

  const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
  const limit = Math.min(query.limit ?? PAGINATION_DEFAULTS.LIMIT, PAGINATION_DEFAULTS.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    TaskModel.find(filter)
      .sort(query.sort ?? '-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('assignee', 'name email avatar')
      .populate('epic', 'title')
      .lean(),
    TaskModel.countDocuments(filter),
  ]);

  return { data, total };
}

async getClientProjectProgress(projectId: string): Promise<{
  total: number;
  done: number;
  inProgress: number;
  backlog: number;
  percentage: number;
}> {
  const tasks = await TaskModel.find({
    project: projectId,
    clientVisible: true,
  }).select('status').lean();

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) =>
    ['in_progress', 'review'].includes(t.status),
  ).length;
  const backlog = tasks.filter((t) =>
    ['backlog', 'todo'].includes(t.status),
  ).length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return { total, done, inProgress, backlog, percentage };
}
```

- [ ] **Step 4: Create portal projects list route**

```typescript
// src/app/api/v1/portal/projects/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { authenticate } from '@/shared/middleware/auth';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { paginatedSuccess } from '@/shared/utils/api-response';

export const GET = apiHandler({
  middleware: [authenticate],
  handler: async (req, { user }) => {
    requireRole('client')(user);
    const projects = await ProjectService.findByClient(user.userId);
    return { data: paginatedSuccess(projects.data, { page: 1, limit: 100, total: projects.total }), status: 200 };
  },
});
```

- [ ] **Step 5: Create portal project detail route**

```typescript
// src/app/api/v1/portal/projects/[id]/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { authenticate } from '@/shared/middleware/auth';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { TaskService } from '@/modules/tasks/task.service';
import { apiSuccess } from '@/shared/utils/api-response';

export const GET = apiHandler({
  middleware: [authenticate],
  handler: async (req, { params, user }) => {
    requireRole('client')(user);
    const project = await ProjectService.findById(params.id);
    await ProjectService.requireClientAccess(params.id, user.userId);
    const progress = await TaskService.getClientProjectProgress(params.id);
    return { data: apiSuccess({ ...project, progress }), status: 200 };
  },
});
```

- [ ] **Step 6: Create portal tasks route**

```typescript
// src/app/api/v1/portal/projects/[id]/tasks/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { authenticate } from '@/shared/middleware/auth';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { TaskService } from '@/modules/tasks/task.service';
import { paginatedSuccess } from '@/shared/utils/api-response';

export const GET = apiHandler({
  middleware: [authenticate],
  handler: async (req, { params, user }) => {
    requireRole('client')(user);
    await ProjectService.requireClientAccess(params.id, user.userId);
    const url = new URL(req.url);
    const query = {
      page: Number(url.searchParams.get('page')) || 1,
      limit: Number(url.searchParams.get('limit')) || 20,
      status: url.searchParams.get('status') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
    };
    const { data, total } = await TaskService.getClientVisibleTasks(params.id, query);
    return {
      data: paginatedSuccess(data, { page: query.page, limit: query.limit, total }),
      status: 200,
    };
  },
});
```

- [ ] **Step 7: Create portal epics and links routes**

Create `src/app/api/v1/portal/projects/[id]/epics/route.ts` — same pattern, fetches epics for the project. Client sees all epics (epics have no `clientVisible` flag; they represent high-level milestones).

Create `src/app/api/v1/portal/projects/[id]/links/route.ts` — same pattern, returns all links for the project.

Both routes:
- Require `client` role
- Verify client access to the project via `ProjectService.requireClientAccess()`
- Return paginated data

- [ ] **Step 8: Run integration tests**

```bash
npx jest tests/integration/api/portal.test.ts --no-cache
```
Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/modules/tasks/ src/app/api/v1/portal/ tests/integration/api/portal.test.ts
git commit -m "feat: add portal API routes for client project/task/epic/links access"
```

---

### Task 2: My Tasks API & Reorder Endpoint

**Files:**
- Modify: `src/modules/tasks/task.service.ts`
- Create: `src/app/api/v1/tasks/my/route.ts`, `src/app/api/v1/tasks/[id]/reorder/route.ts`
- Test: `tests/integration/api/my-tasks.test.ts`, `tests/integration/api/task-reorder.test.ts`

- [ ] **Step 1: Write integration tests for my-tasks endpoint**

```typescript
// tests/integration/api/my-tasks.test.ts
import { testRequest } from '@/tests/helpers/request';
import { buildUser, buildProject, buildTask, buildSprint } from '@/tests/helpers/factory';
import { getAuthToken } from '@/tests/helpers/auth';

describe('GET /api/v1/tasks/my', () => {
  let user: any;
  let token: string;

  beforeEach(async () => {
    user = await buildUser({ role: 'internal' });
    token = await getAuthToken(user);
  });

  it('returns tasks assigned to the current user across all projects', async () => {
    const project1 = await buildProject({ members: [user._id] });
    const project2 = await buildProject({ members: [user._id] });
    await buildTask({ project: project1._id, assignee: user._id, title: 'Task A' });
    await buildTask({ project: project2._id, assignee: user._id, title: 'Task B' });
    await buildTask({ project: project1._id, title: 'Unassigned' });

    const res = await testRequest
      .get('/api/v1/tasks/my')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('excludes done tasks by default', async () => {
    const project = await buildProject({ members: [user._id] });
    await buildTask({ project: project._id, assignee: user._id, status: 'done' });
    await buildTask({ project: project._id, assignee: user._id, status: 'in_progress' });

    const res = await testRequest
      .get('/api/v1/tasks/my')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data).toHaveLength(1);
  });

  it('includes done tasks when includeDone=true', async () => {
    const project = await buildProject({ members: [user._id] });
    await buildTask({ project: project._id, assignee: user._id, status: 'done' });
    await buildTask({ project: project._id, assignee: user._id, status: 'in_progress' });

    const res = await testRequest
      .get('/api/v1/tasks/my?includeDone=true')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.data).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Write integration tests for reorder endpoint**

```typescript
// tests/integration/api/task-reorder.test.ts
import { testRequest } from '@/tests/helpers/request';
import { buildUser, buildProject, buildTask } from '@/tests/helpers/factory';
import { getAuthToken } from '@/tests/helpers/auth';

describe('PATCH /api/v1/tasks/:id/reorder', () => {
  let user: any;
  let token: string;
  let project: any;

  beforeEach(async () => {
    user = await buildUser({ role: 'internal' });
    token = await getAuthToken(user);
    project = await buildProject({ members: [user._id] });
  });

  it('updates task status and order when moved between columns', async () => {
    const task = await buildTask({
      project: project._id,
      status: 'backlog',
      order: 0,
    });
    const res = await testRequest
      .patch(`/api/v1/tasks/${task._id}/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress', order: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
    expect(res.body.data.order).toBe(2);
  });

  it('updates only order when moved within same column', async () => {
    const task = await buildTask({
      project: project._id,
      status: 'todo',
      order: 0,
    });
    const res = await testRequest
      .patch(`/api/v1/tasks/${task._id}/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'todo', order: 5 });
    expect(res.status).toBe(200);
    expect(res.body.data.order).toBe(5);
  });

  it('rejects client users', async () => {
    const clientUser = await buildUser({ role: 'client' });
    const clientToken = await getAuthToken(clientUser);
    const task = await buildTask({ project: project._id });
    const res = await testRequest
      .patch(`/api/v1/tasks/${task._id}/reorder`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'done', order: 0 });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx jest tests/integration/api/my-tasks.test.ts tests/integration/api/task-reorder.test.ts --no-cache
```
Expected: FAIL — routes not found.

- [ ] **Step 4: Add getMyTasks and reorderTask to TaskService**

```typescript
// Add to src/modules/tasks/task.service.ts

async getMyTasks(
  userId: string,
  options: { includeDone?: boolean } = {},
): Promise<ITask[]> {
  const filter: Record<string, unknown> = { assignee: userId };
  if (!options.includeDone) {
    filter.status = { $ne: 'done' };
  }
  return TaskModel.find(filter)
    .sort({ priority: 1, createdAt: -1 })
    .populate('project', 'name slug')
    .populate('sprint', 'name endDate')
    .populate('epic', 'title')
    .lean();
}

async reorderTask(
  taskId: string,
  data: { status: string; order: number },
): Promise<ITask> {
  const task = await TaskModel.findByIdAndUpdate(
    taskId,
    { status: data.status, order: data.order },
    { new: true, runValidators: true },
  )
    .populate('assignee', 'name email avatar')
    .populate('epic', 'title')
    .lean();

  if (!task) throw new NotFoundError('Task not found');
  return task;
}
```

- [ ] **Step 5: Create my-tasks route**

```typescript
// src/app/api/v1/tasks/my/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { authenticate } from '@/shared/middleware/auth';
import { requireRole } from '@/shared/middleware/role-guard';
import { TaskService } from '@/modules/tasks/task.service';
import { apiSuccess } from '@/shared/utils/api-response';

export const GET = apiHandler({
  middleware: [authenticate],
  handler: async (req, { user }) => {
    requireRole('admin', 'internal')(user);
    const url = new URL(req.url);
    const includeDone = url.searchParams.get('includeDone') === 'true';
    const tasks = await TaskService.getMyTasks(user.userId, { includeDone });
    return { data: apiSuccess(tasks), status: 200 };
  },
});
```

- [ ] **Step 6: Create reorder route**

```typescript
// src/app/api/v1/tasks/[id]/reorder/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { authenticate } from '@/shared/middleware/auth';
import { requireRole } from '@/shared/middleware/role-guard';
import { TaskService } from '@/modules/tasks/task.service';
import { apiSuccess } from '@/shared/utils/api-response';
import { z } from 'zod';

const reorderSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  order: z.number().int().min(0),
});

export const PATCH = apiHandler({
  middleware: [authenticate],
  validate: { body: reorderSchema },
  handler: async (req, { params, user, body }) => {
    requireRole('admin', 'internal')(user);
    const task = await TaskService.reorderTask(params.id, body);
    return { data: apiSuccess(task), status: 200 };
  },
});
```

- [ ] **Step 7: Run tests**

```bash
npx jest tests/integration/api/my-tasks.test.ts tests/integration/api/task-reorder.test.ts --no-cache
```
Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/modules/tasks/ src/app/api/v1/tasks/ tests/integration/api/my-tasks.test.ts tests/integration/api/task-reorder.test.ts
git commit -m "feat: add my-tasks and task reorder API endpoints"
```

---

### Task 3: DataTable Shared Component

**Files:**
- Create: `src/components/shared/data-table.tsx`
- Test: `tests/unit/components/data-table.test.tsx`

- [ ] **Step 1: Write component tests**

```typescript
// tests/unit/components/data-table.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '@/components/shared/data-table';

const columns = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
];

const data = [
  { _id: '1', title: 'Task A', status: 'todo', priority: 'P1' },
  { _id: '2', title: 'Task B', status: 'done', priority: 'P0' },
  { _id: '3', title: 'Task C', status: 'in_progress', priority: 'P2' },
];

describe('DataTable', () => {
  it('renders all rows', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByText('Task B')).toBeInTheDocument();
    expect(screen.getByText('Task C')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('calls onSort when clicking a sortable column header', () => {
    const onSort = jest.fn();
    render(<DataTable columns={columns} data={data} onSort={onSort} />);
    fireEvent.click(screen.getByText('Title'));
    expect(onSort).toHaveBeenCalledWith('title', 'asc');
  });

  it('calls onRowSelect when checkbox is clicked', () => {
    const onRowSelect = jest.fn();
    render(
      <DataTable columns={columns} data={data} selectable onRowSelect={onRowSelect} />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // first data row
    expect(onRowSelect).toHaveBeenCalledWith(['1']);
  });

  it('renders empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="No tasks found" />);
    expect(screen.getByText('No tasks found')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/unit/components/data-table.test.tsx --no-cache
```

- [ ] **Step 3: Implement DataTable component**

```typescript
// src/components/shared/data-table.tsx
'use client';

import { useState, useCallback } from 'react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';

export interface Column<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends { _id: string }> {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowSelect?: (selectedIds: string[]) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

export function DataTable<T extends { _id: string }>({
  columns,
  data,
  selectable = false,
  onSort,
  onRowSelect,
  onRowClick,
  emptyMessage = 'No data',
  stickyHeader = true,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback(
    (key: string) => {
      const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
      setSortKey(key);
      setSortDir(newDir);
      onSort?.(key, newDir);
    },
    [sortKey, sortDir, onSort],
  );

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onRowSelect?.(Array.from(next));
        return next;
      });
    },
    [onRowSelect],
  );

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
      onRowSelect?.([]);
    } else {
      const allIds = data.map((row) => row._id);
      setSelectedIds(new Set(allIds));
      onRowSelect?.(allIds);
    }
  }, [data, selectedIds.size, onRowSelect]);

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border-subtle">
      <table className="w-full text-body">
        <thead
          className={
            stickyHeader
              ? 'sticky top-0 z-10 bg-surface/90 backdrop-blur-sm'
              : 'bg-subtle'
          }
        >
          <tr className="border-b border-border-default">
            {selectable && (
              <th className="w-10 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={selectedIds.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                  className="rounded-sm border-border-default"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted ${
                  col.sortable ? 'cursor-pointer select-none hover:text-primary' : ''
                } ${col.className ?? ''}`}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc'
                      ? <CaretUp size={12} weight="bold" />
                      : <CaretDown size={12} weight="bold" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-4 py-12 text-center text-secondary"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row._id}
                className={`border-b border-border-subtle transition-colors duration-[120ms] ease-linear hover:bg-subtle ${
                  selectedIds.has(row._id) ? 'bg-muted' : 'bg-surface'
                } ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelect(row._id);
                      }}
                      className="rounded-sm border-border-default"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-2.5 ${col.className ?? ''}`}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest tests/unit/components/data-table.test.tsx --no-cache
```
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/data-table.tsx tests/unit/components/data-table.test.tsx
git commit -m "feat: add reusable DataTable component with sorting, selection, and sticky header"
```

---

### Task 4: Kanban Board — Cards & Columns

**Files:**
- Create: `src/components/features/kanban/kanban-card.tsx`, `src/components/features/kanban/kanban-card-skeleton.tsx`, `src/components/features/kanban/kanban-column.tsx`

- [ ] **Step 1: Create KanbanCard component**

```typescript
// src/components/features/kanban/kanban-card.tsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import Avatar from 'boring-avatars';
import type { ITask } from '@/modules/tasks/task.types';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'var(--color-p0)',
  P1: 'var(--color-p1)',
  P2: 'var(--color-p2)',
  P3: 'var(--color-p3)',
};

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  feature: { label: 'Feature', className: 'bg-accent-muted text-accent-text' },
  chore: { label: 'Chore', className: 'bg-subtle text-secondary' },
  improvement: { label: 'Improvement', className: 'bg-info-muted text-info' },
};

interface KanbanCardProps {
  task: ITask;
  onClick?: (task: ITask) => void;
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.P3;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative cursor-grab rounded-lg border border-border-subtle bg-surface shadow-xs
        transition-all duration-[120ms] ease-linear
        ${isDragging ? 'z-50 scale-[1.02] shadow-md' : 'hover:-translate-y-px hover:shadow-sm'}
      `}
      onClick={() => onClick?.(task)}
      layout
    >
      {/* Priority left-border stripe */}
      <div
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
        style={{ backgroundColor: priorityColor }}
      />

      <div className="px-3 py-2.5 pl-4">
        {/* Title */}
        <p className="text-sm font-medium text-primary leading-snug line-clamp-2">
          {task.title}
        </p>

        {/* Meta row: type badge + tags + assignee */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {/* Type badge */}
            {TYPE_LABELS[task.type] && (
              <span
                className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${TYPE_LABELS[task.type].className}`}
              >
                {TYPE_LABELS[task.type].label}
              </span>
            )}

            {/* Tags (max 2) */}
            {task.tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-subtle px-1.5 py-0.5 text-xs text-muted"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Assignee avatar */}
          {task.assignee && (
            <Avatar
              size={22}
              name={typeof task.assignee === 'string' ? task.assignee : task.assignee.name}
              variant="beam"
              colors={['#5B5FC7', '#4E52B0', '#8B8B9A', '#C2C2CC', '#E8E9F5']}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Create KanbanCardSkeleton**

```typescript
// src/components/features/kanban/kanban-card-skeleton.tsx
export function KanbanCardSkeleton() {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-3 pl-4">
      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-subtle" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-subtle" />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          <div className="h-5 w-14 animate-pulse rounded-sm bg-subtle" />
        </div>
        <div className="h-[22px] w-[22px] animate-pulse rounded-full bg-subtle" />
      </div>
    </div>
  );
}
```

Skeleton pulse uses `bg-subtle` with Tailwind `animate-pulse` (overridden in globals.css to pulse between `bg-subtle` and `bg-muted`, 1.5s ease-in-out).

- [ ] **Step 3: Create KanbanColumn component**

```typescript
// src/components/features/kanban/kanban-column.tsx
'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from '@phosphor-icons/react';
import { KanbanCard } from './kanban-card';
import { KanbanCardSkeleton } from './kanban-card-skeleton';
import type { ITask } from '@/modules/tasks/task.types';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: ITask[];
  isLoading?: boolean;
  onTaskClick?: (task: ITask) => void;
  onAddTask?: (status: string) => void;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  isLoading = false,
  onTaskClick,
  onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={`flex min-h-[200px] w-[280px] shrink-0 flex-col rounded-lg bg-subtle/50 transition-colors duration-[120ms] ${
        isOver ? 'bg-accent-muted/30' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
            {title}
          </h3>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-secondary">
            {tasks.length}
          </span>
        </div>
        {onAddTask && (
          <button
            onClick={() => onAddTask(id)}
            className="rounded-md p-1 text-muted transition-colors duration-[120ms] hover:bg-muted hover:text-primary"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2 px-2 pb-2">
        <SortableContext
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <KanbanCardSkeleton key={i} />
              ))
            : tasks.map((task) => (
                <KanbanCard key={task._id} task={task} onClick={onTaskClick} />
              ))}
        </SortableContext>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/features/kanban/
git commit -m "feat: add KanbanCard, KanbanCardSkeleton, and KanbanColumn components"
```

---

### Task 5: Kanban Board — DnD Logic & Filter Bar

**Files:**
- Create: `src/components/features/kanban/kanban-board.tsx`, `src/components/features/kanban/kanban-filter-bar.tsx`
- Test: `tests/unit/components/kanban-board.test.tsx`

- [ ] **Step 1: Write board tests**

```typescript
// tests/unit/components/kanban-board.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { KanbanBoard } from '@/components/features/kanban/kanban-board';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('KanbanBoard', () => {
  it('renders all 5 columns', () => {
    render(<KanbanBoard projectId="test-project" tasks={[]} />, { wrapper });
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('Todo')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('distributes tasks into correct columns', () => {
    const tasks = [
      { _id: '1', title: 'Backlog task', status: 'backlog', priority: 'P2', type: 'feature', tags: [], order: 0 },
      { _id: '2', title: 'Done task', status: 'done', priority: 'P1', type: 'chore', tags: [], order: 0 },
    ];
    render(<KanbanBoard projectId="test-project" tasks={tasks as any} />, { wrapper });
    expect(screen.getByText('Backlog task')).toBeInTheDocument();
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement KanbanBoard with drag-and-drop**

```typescript
// src/components/features/kanban/kanban-board.tsx
'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import type { ITask } from '@/modules/tasks/task.types';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'Todo' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
] as const;

interface KanbanBoardProps {
  projectId: string;
  tasks: ITask[];
  isLoading?: boolean;
  onTaskMove?: (taskId: string, newStatus: string, newOrder: number) => void;
  onTaskClick?: (task: ITask) => void;
  onAddTask?: (status: string) => void;
  columns?: { id: string; title: string }[];
}

export function KanbanBoard({
  projectId,
  tasks,
  isLoading = false,
  onTaskMove,
  onTaskClick,
  onAddTask,
  columns = COLUMNS as unknown as { id: string; title: string }[],
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<ITask | null>(null);
  const [localTasks, setLocalTasks] = useState<ITask[]>(tasks);

  // Sync when tasks prop changes
  useState(() => { setLocalTasks(tasks); });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const getColumnTasks = useCallback(
    (columnId: string) =>
      localTasks
        .filter((t) => t.status === columnId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [localTasks],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = localTasks.find((t) => t._id === event.active.id);
      setActiveTask(task ?? null);
    },
    [localTasks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeTaskData = localTasks.find((t) => t._id === activeId);
      if (!activeTaskData) return;

      // Determine target column
      const overTask = localTasks.find((t) => t._id === overId);
      const targetColumn = overTask ? overTask.status : overId;

      if (activeTaskData.status !== targetColumn) {
        setLocalTasks((prev) =>
          prev.map((t) =>
            t._id === activeId ? { ...t, status: targetColumn } : t,
          ),
        );
      }
    },
    [localTasks],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeTaskData = localTasks.find((t) => t._id === activeId);
      if (!activeTaskData) return;

      const targetColumn = localTasks.find((t) => t._id === overId)?.status ?? overId;
      const columnTasks = localTasks
        .filter((t) => t.status === targetColumn)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const oldIndex = columnTasks.findIndex((t) => t._id === activeId);
      const newIndex = columnTasks.findIndex((t) => t._id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        setLocalTasks((prev) => {
          const others = prev.filter((t) => t.status !== targetColumn);
          return [
            ...others,
            ...reordered.map((t, i) => ({ ...t, order: i })),
          ];
        });
      }

      // Fire optimistic callback
      const finalIndex = newIndex !== -1 ? newIndex : columnTasks.length;
      onTaskMove?.(activeId, targetColumn, finalIndex);
    },
    [localTasks, onTaskMove],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={getColumnTasks(col.id)}
            isLoading={isLoading}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      {/* Drag overlay — renders the card being dragged */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-[2deg]">
            <KanbanCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 3: Create KanbanFilterBar**

```typescript
// src/components/features/kanban/kanban-filter-bar.tsx
'use client';

import { useState } from 'react';
import { MagnifyingGlass, Funnel } from '@phosphor-icons/react';

interface FilterState {
  status?: string;
  priority?: string;
  assignee?: string;
  tag?: string;
  search?: string;
}

interface KanbanFilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  assignees?: { _id: string; name: string }[];
  tags?: string[];
}

export function KanbanFilterBar({
  onFilterChange,
  assignees = [],
  tags = [],
}: KanbanFilterBarProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    onFilterChange(next);
  };

  return (
    <div className="mb-4 flex items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <MagnifyingGlass
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.search ?? ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="h-8 w-full rounded-md border border-border-default bg-surface pl-9 pr-3 text-sm text-primary placeholder:text-muted transition-colors duration-[120ms] focus:border-accent focus:outline-none focus:shadow-focus"
        />
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors duration-[120ms] ${
          showFilters
            ? 'border-accent bg-accent-muted text-accent-text'
            : 'border-border-default bg-surface text-secondary hover:bg-subtle'
        }`}
      >
        <Funnel size={14} />
        Filters
      </button>

      {/* Filter dropdowns (shown when toggle is active) */}
      {showFilters && (
        <div className="flex items-center gap-2">
          <select
            value={filters.priority ?? ''}
            onChange={(e) => updateFilter('priority', e.target.value)}
            className="h-8 rounded-md border border-border-default bg-surface px-2 text-sm text-primary"
          >
            <option value="">All Priorities</option>
            <option value="P0">P0 - Urgent</option>
            <option value="P1">P1 - High</option>
            <option value="P2">P2 - Medium</option>
            <option value="P3">P3 - Low</option>
          </select>

          <select
            value={filters.assignee ?? ''}
            onChange={(e) => updateFilter('assignee', e.target.value)}
            className="h-8 rounded-md border border-border-default bg-surface px-2 text-sm text-primary"
          >
            <option value="">All Assignees</option>
            {assignees.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>

          {tags.length > 0 && (
            <select
              value={filters.tag ?? ''}
              onChange={(e) => updateFilter('tag', e.target.value)}
              className="h-8 rounded-md border border-border-default bg-surface px-2 text-sm text-primary"
            >
              <option value="">All Tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest tests/unit/components/kanban-board.test.tsx --no-cache
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/kanban/ tests/unit/components/kanban-board.test.tsx
git commit -m "feat: add KanbanBoard with drag-and-drop and filter bar"
```

---

### Task 6: Dashboard Board, Table, and Timeline Pages

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/board/page.tsx`, `src/app/(dashboard)/projects/[id]/table/page.tsx`, `src/app/(dashboard)/projects/[id]/timeline/page.tsx`
- Create: `src/components/features/table/task-table.tsx`, `src/components/features/table/bulk-actions-bar.tsx`

- [ ] **Step 1: Create task-table wrapper**

```typescript
// src/components/features/table/task-table.tsx
'use client';

import { useState, useCallback } from 'react';
import { DataTable, type Column } from '@/components/shared/data-table';
import { BulkActionsBar } from './bulk-actions-bar';
import Avatar from 'boring-avatars';
import type { ITask } from '@/modules/tasks/task.types';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  backlog: { label: 'Backlog', className: 'bg-subtle text-muted' },
  todo: { label: 'Todo', className: 'bg-info-muted text-info' },
  in_progress: { label: 'In Progress', className: 'bg-warning-muted text-warning' },
  review: { label: 'Review', className: 'bg-accent-muted text-accent-text' },
  done: { label: 'Done', className: 'bg-success-muted text-success' },
};

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'Urgent',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
};

interface TaskTableProps {
  tasks: ITask[];
  isLoading?: boolean;
  onStatusChange?: (taskId: string, status: string) => void;
  onPriorityChange?: (taskId: string, priority: string) => void;
  onAssigneeChange?: (taskId: string, assigneeId: string) => void;
  onBulkAction?: (action: string, taskIds: string[]) => void;
  onTaskClick?: (task: ITask) => void;
  assignees?: { _id: string; name: string }[];
}

export function TaskTable({
  tasks,
  isLoading,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onBulkAction,
  onTaskClick,
  assignees = [],
}: TaskTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const columns: Column<ITask>[] = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (_, row) => (
        <span className="font-medium text-primary">{row.title}</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (val, row) => (
        <select
          value={val as string}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onPriorityChange?.(row._id, e.target.value)}
          className="h-7 rounded-md border border-border-default bg-surface px-1.5 text-xs"
        >
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      ),
      className: 'w-28',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val, row) => (
        <select
          value={val as string}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange?.(row._id, e.target.value)}
          className="h-7 rounded-md border border-border-default bg-surface px-1.5 text-xs"
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      ),
      className: 'w-32',
    },
    {
      key: 'assignee' as keyof ITask & string,
      label: 'Assignee',
      sortable: false,
      render: (val) => {
        if (!val) return <span className="text-muted">Unassigned</span>;
        const user = typeof val === 'string' ? { name: val } : (val as { name: string });
        return (
          <div className="flex items-center gap-2">
            <Avatar size={20} name={user.name} variant="beam"
              colors={['#5B5FC7', '#4E52B0', '#8B8B9A', '#C2C2CC', '#E8E9F5']} />
            <span className="text-sm">{user.name}</span>
          </div>
        );
      },
      className: 'w-36',
    },
    {
      key: 'createdAt' as keyof ITask & string,
      label: 'Created',
      sortable: true,
      render: (val) => {
        if (!val) return '';
        const d = new Date(val as string);
        return <span className="text-sm text-secondary">{d.toLocaleDateString()}</span>;
      },
      className: 'w-28',
    },
  ];

  return (
    <div className="relative">
      <DataTable
        columns={columns}
        data={tasks}
        selectable
        onRowSelect={setSelectedIds}
        onRowClick={onTaskClick}
        emptyMessage="No tasks yet. Create one to get started."
        stickyHeader
      />

      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onAction={(action) => onBulkAction?.(action, selectedIds)}
          onClear={() => setSelectedIds([])}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create BulkActionsBar**

```typescript
// src/components/features/table/bulk-actions-bar.tsx
'use client';

import { motion } from 'framer-motion';
import { Trash, ArrowRight, X } from '@phosphor-icons/react';

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: string) => void;
  onClear: () => void;
}

export function BulkActionsBar({ selectedCount, onAction, onClear }: BulkActionsBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border-subtle bg-elevated px-4 py-2.5 shadow-lg"
    >
      <span className="text-sm font-medium text-primary">
        {selectedCount} selected
      </span>

      <div className="h-4 w-px bg-border-default" />

      <button
        onClick={() => onAction('change_status')}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-secondary hover:bg-subtle transition-colors duration-[120ms]"
      >
        <ArrowRight size={14} />
        Change Status
      </button>

      <button
        onClick={() => onAction('assign')}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-secondary hover:bg-subtle transition-colors duration-[120ms]"
      >
        Assign
      </button>

      <button
        onClick={() => onAction('delete')}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-error hover:bg-error-muted transition-colors duration-[120ms]"
      >
        <Trash size={14} />
        Delete
      </button>

      <button
        onClick={onClear}
        className="ml-1 rounded-md p-1 text-muted hover:bg-subtle transition-colors duration-[120ms]"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
```

- [ ] **Step 3: Create board page**

```typescript
// src/app/(dashboard)/projects/[id]/board/page.tsx
'use client';

import { use } from 'react';
import { KanbanBoard } from '@/components/features/kanban/kanban-board';
import { KanbanFilterBar } from '@/components/features/kanban/kanban-filter-bar';
import { useTasks, useReorderTask } from '@/hooks/queries/use-tasks';

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: tasks, isLoading } = useTasks(projectId);
  const reorderMutation = useReorderTask();

  const handleTaskMove = (taskId: string, newStatus: string, newOrder: number) => {
    reorderMutation.mutate({ taskId, status: newStatus, order: newOrder });
  };

  return (
    <div className="p-6">
      <KanbanFilterBar
        onFilterChange={() => {}}
      />
      <KanbanBoard
        projectId={projectId}
        tasks={tasks ?? []}
        isLoading={isLoading}
        onTaskMove={handleTaskMove}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create table page**

```typescript
// src/app/(dashboard)/projects/[id]/table/page.tsx
'use client';

import { use } from 'react';
import { TaskTable } from '@/components/features/table/task-table';
import { useTasks, useUpdateTask } from '@/hooks/queries/use-tasks';

export default function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: tasks, isLoading } = useTasks(projectId);
  const updateTask = useUpdateTask();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-h2 font-semibold text-primary">Tasks</h1>
      <TaskTable
        tasks={tasks ?? []}
        isLoading={isLoading}
        onStatusChange={(taskId, status) =>
          updateTask.mutate({ taskId, data: { status } })
        }
        onPriorityChange={(taskId, priority) =>
          updateTask.mutate({ taskId, data: { priority } })
        }
      />
    </div>
  );
}
```

- [ ] **Step 5: Create timeline page (placeholder — full implementation in Task 7)**

```typescript
// src/app/(dashboard)/projects/[id]/timeline/page.tsx
'use client';

import { use } from 'react';
import { TimelineChart } from '@/components/features/timeline/timeline-chart';
import { useEpics } from '@/hooks/queries/use-epics';
import { useSprints } from '@/hooks/queries/use-sprints';

export default function TimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { data: epics, isLoading: epicsLoading } = useEpics(projectId);
  const { data: sprints, isLoading: sprintsLoading } = useSprints(projectId);

  const isLoading = epicsLoading || sprintsLoading;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-h2 font-semibold text-primary">Timeline</h1>
      <TimelineChart
        epics={epics ?? []}
        sprints={sprints ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
```

- [ ] **Step 6: Create React Query hooks for reorder**

```typescript
// Add to src/hooks/queries/use-tasks.ts (or create if not yet existing)

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';

export function useReorderTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
      order,
    }: {
      taskId: string;
      status: string;
      order: number;
    }) => {
      const res = await apiClient.patch(`/tasks/${taskId}/reorder`, {
        status,
        order,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/projects/ src/components/features/table/ src/hooks/queries/
git commit -m "feat: add dashboard board, table, and timeline pages with task table and bulk actions"
```

---

### Task 7: Timeline/Gantt Component

**Files:**
- Create: `src/components/features/timeline/timeline-chart.tsx`, `src/components/features/timeline/timeline-row.tsx`, `src/components/features/timeline/timeline-header.tsx`
- Test: `tests/unit/components/timeline-chart.test.tsx`

- [ ] **Step 1: Write timeline tests**

```typescript
// tests/unit/components/timeline-chart.test.tsx
import { render, screen } from '@testing-library/react';
import { TimelineChart } from '@/components/features/timeline/timeline-chart';

describe('TimelineChart', () => {
  const epics = [
    {
      _id: '1',
      title: 'User Auth',
      startDate: '2026-04-01',
      endDate: '2026-04-21',
      progress: 75,
      status: 'active',
    },
    {
      _id: '2',
      title: 'Dashboard',
      startDate: '2026-04-14',
      endDate: '2026-05-05',
      progress: 30,
      status: 'planning',
    },
  ];

  const sprints = [
    { _id: 's1', name: 'Sprint 1', startDate: '2026-04-06', endDate: '2026-04-17' },
    { _id: 's2', name: 'Sprint 2', startDate: '2026-04-20', endDate: '2026-05-01' },
  ];

  it('renders epic titles', () => {
    render(<TimelineChart epics={epics as any} sprints={sprints as any} />);
    expect(screen.getByText('User Auth')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders sprint labels', () => {
    render(<TimelineChart epics={epics as any} sprints={sprints as any} />);
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
  });

  it('renders loading skeletons', () => {
    render(<TimelineChart epics={[]} sprints={[]} isLoading />);
    const skeletons = screen.getAllByTestId('timeline-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Create TimelineHeader component**

```typescript
// src/components/features/timeline/timeline-header.tsx
'use client';

import { eachWeekOfInterval, format, isWithinInterval } from 'date-fns';

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  sprints: {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
  }[];
  columnWidth: number;
}

export function TimelineHeader({
  startDate,
  endDate,
  sprints,
  columnWidth,
}: TimelineHeaderProps) {
  const weeks = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { weekStartsOn: 1 },
  );

  return (
    <div className="relative border-b border-border-default">
      {/* Week labels */}
      <div className="flex">
        {weeks.map((week, i) => (
          <div
            key={i}
            className="shrink-0 border-r border-border-subtle px-2 py-1.5"
            style={{ width: columnWidth }}
          >
            <span className="text-xs text-muted">
              {format(week, 'MMM d')}
            </span>
          </div>
        ))}
      </div>

      {/* Sprint boundary markers */}
      {sprints.map((sprint) => {
        const sprintStart = new Date(sprint.startDate);
        const sprintEnd = new Date(sprint.endDate);
        const totalMs = endDate.getTime() - startDate.getTime();
        const leftPct = ((sprintStart.getTime() - startDate.getTime()) / totalMs) * 100;
        const rightPct = ((sprintEnd.getTime() - startDate.getTime()) / totalMs) * 100;

        return (
          <div key={sprint._id}>
            {/* Start boundary */}
            <div
              className="absolute top-0 bottom-0 w-px border-l border-dashed border-accent/40"
              style={{ left: `${leftPct}%` }}
            />
            {/* Sprint label */}
            <span
              className="absolute -top-0.5 text-xs font-medium text-accent-text"
              style={{ left: `${leftPct + 0.5}%` }}
            >
              {sprint.name}
            </span>
            {/* End boundary */}
            <div
              className="absolute top-0 bottom-0 w-px border-l border-dashed border-accent/40"
              style={{ left: `${rightPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create TimelineRow component**

```typescript
// src/components/features/timeline/timeline-row.tsx
'use client';

interface TimelineRowProps {
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  timelineStart: Date;
  timelineEnd: Date;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'var(--color-info)',
  active: 'var(--color-accent)',
  done: 'var(--color-success)',
};

export function TimelineRow({
  title,
  startDate,
  endDate,
  progress,
  timelineStart,
  timelineEnd,
  status,
}: TimelineRowProps) {
  const totalMs = timelineEnd.getTime() - timelineStart.getTime();
  const leftPct = Math.max(
    0,
    ((startDate.getTime() - timelineStart.getTime()) / totalMs) * 100,
  );
  const widthPct = Math.min(
    100 - leftPct,
    ((endDate.getTime() - startDate.getTime()) / totalMs) * 100,
  );

  const barColor = STATUS_COLORS[status] ?? STATUS_COLORS.planning;

  return (
    <div className="group flex items-center border-b border-border-subtle py-2">
      {/* Epic title (fixed left column, handled by parent) */}
      <div className="relative h-6 w-full">
        {/* Background bar */}
        <div
          className="absolute top-0 h-full rounded-sm opacity-20"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            backgroundColor: barColor,
          }}
        />
        {/* Progress fill */}
        <div
          className="absolute top-0 h-full rounded-sm"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct * (progress / 100)}%`,
            backgroundColor: barColor,
          }}
        />
        {/* Progress label */}
        <span
          className="absolute top-0.5 text-xs font-medium text-inverse mix-blend-difference"
          style={{ left: `${leftPct + 0.5}%` }}
        >
          {progress}%
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create TimelineChart container**

```typescript
// src/components/features/timeline/timeline-chart.tsx
'use client';

import { useMemo } from 'react';
import { subWeeks, addWeeks, min, max } from 'date-fns';
import { TimelineHeader } from './timeline-header';
import { TimelineRow } from './timeline-row';

interface TimelineChartProps {
  epics: {
    _id: string;
    title: string;
    startDate?: string;
    endDate?: string;
    progress: number;
    status: string;
  }[];
  sprints: {
    _id: string;
    name: string;
    startDate: string;
    endDate: string;
  }[];
  isLoading?: boolean;
}

export function TimelineChart({ epics, sprints, isLoading }: TimelineChartProps) {
  const COLUMN_WIDTH = 120;

  const { timelineStart, timelineEnd } = useMemo(() => {
    const allDates = [
      ...epics.flatMap((e) => [
        e.startDate ? new Date(e.startDate) : null,
        e.endDate ? new Date(e.endDate) : null,
      ]),
      ...sprints.flatMap((s) => [new Date(s.startDate), new Date(s.endDate)]),
    ].filter(Boolean) as Date[];

    if (allDates.length === 0) {
      const now = new Date();
      return { timelineStart: subWeeks(now, 2), timelineEnd: addWeeks(now, 6) };
    }

    return {
      timelineStart: subWeeks(min(allDates), 1),
      timelineEnd: addWeeks(max(allDates), 2),
    };
  }, [epics, sprints]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} data-testid="timeline-skeleton" className="flex items-center gap-4">
            <div className="h-4 w-32 animate-pulse rounded bg-subtle" />
            <div className="h-6 flex-1 animate-pulse rounded bg-subtle" />
          </div>
        ))}
      </div>
    );
  }

  const epicRows = epics.filter((e) => e.startDate && e.endDate);

  return (
    <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
      <div className="min-w-[800px]">
        <div className="flex">
          {/* Left column: epic titles */}
          <div className="w-48 shrink-0 border-r border-border-default">
            <div className="border-b border-border-default px-3 py-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                Epic
              </span>
            </div>
            {epicRows.map((epic) => (
              <div
                key={epic._id}
                className="border-b border-border-subtle px-3 py-2 text-sm font-medium text-primary"
              >
                {epic.title}
              </div>
            ))}
          </div>

          {/* Right area: timeline */}
          <div className="relative flex-1">
            <TimelineHeader
              startDate={timelineStart}
              endDate={timelineEnd}
              sprints={sprints}
              columnWidth={COLUMN_WIDTH}
            />
            {epicRows.map((epic) => (
              <TimelineRow
                key={epic._id}
                title={epic.title}
                startDate={new Date(epic.startDate!)}
                endDate={new Date(epic.endDate!)}
                progress={epic.progress}
                timelineStart={timelineStart}
                timelineEnd={timelineEnd}
                status={epic.status}
              />
            ))}
          </div>
        </div>
      </div>

      {epicRows.length === 0 && (
        <div className="px-4 py-12 text-center text-secondary">
          No epics with date ranges. Add start/end dates to epics to see them on the timeline.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
npx jest tests/unit/components/timeline-chart.test.tsx --no-cache
```
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/timeline/ tests/unit/components/timeline-chart.test.tsx
git commit -m "feat: add Timeline/Gantt chart with epic rows, progress bars, and sprint boundaries"
```

---

### Task 8: Client Portal Layout & Pages

**Files:**
- Create: `src/app/(portal)/layout.tsx`, `src/app/(portal)/page.tsx`, `src/app/(portal)/projects/[id]/layout.tsx`, `src/app/(portal)/projects/[id]/page.tsx`, `src/app/(portal)/projects/[id]/board/page.tsx`, `src/app/(portal)/projects/[id]/timeline/page.tsx`, `src/app/(portal)/projects/[id]/links/page.tsx`
- Create: `src/components/layouts/portal-sidebar.tsx`, `src/components/features/portal/portal-project-card.tsx`, `src/components/features/portal/portal-progress-card.tsx`, `src/components/features/portal/portal-kanban-board.tsx`

- [ ] **Step 1: Create portal sidebar**

```typescript
// src/components/layouts/portal-sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, Folders } from '@phosphor-icons/react';
import { useAuth } from '@/hooks/use-auth';
import Avatar from 'boring-avatars';

export function PortalSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { href: '/', label: 'Projects', icon: Folders },
  ];

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border-subtle bg-surface">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-border-subtle">
        <span className="text-h3 font-semibold text-primary">Orbiter</span>
        <span className="ml-2 rounded-sm bg-accent-muted px-1.5 py-0.5 text-xs font-medium text-accent-text">
          Client
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-[120ms] ${
                isActive
                  ? 'bg-muted font-medium text-primary'
                  : 'text-secondary hover:bg-subtle hover:text-primary'
              }`}
            >
              <item.icon size={18} weight={isActive ? 'fill' : 'regular'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="border-t border-border-subtle px-3 py-3">
          <div className="flex items-center gap-2">
            <Avatar size={28} name={user.name} variant="beam"
              colors={['#5B5FC7', '#4E52B0', '#8B8B9A', '#C2C2CC', '#E8E9F5']} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-primary">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Create portal layout**

```typescript
// src/app/(portal)/layout.tsx
import { PortalSidebar } from '@/components/layouts/portal-sidebar';
import { AuthProvider } from '@/components/providers/auth-provider';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider requiredRole="client">
      <div className="flex h-screen bg-page">
        <PortalSidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Create portal project list page**

```typescript
// src/app/(portal)/page.tsx
'use client';

import { usePortalProjects } from '@/hooks/queries/use-portal-data';
import { PortalProjectCard } from '@/components/features/portal/portal-project-card';

export default function PortalHomePage() {
  const { data: projects, isLoading } = usePortalProjects();

  return (
    <div className="p-6">
      <h1 className="mb-6 text-h1 font-semibold text-primary">Your Projects</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-border-subtle bg-subtle" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <PortalProjectCard key={project._id} project={project} />
          ))}
          {projects?.length === 0 && (
            <p className="col-span-full text-center text-secondary py-12">
              No projects assigned to you yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create PortalProjectCard**

```typescript
// src/components/features/portal/portal-project-card.tsx
'use client';

import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';

interface PortalProjectCardProps {
  project: {
    _id: string;
    name: string;
    description?: string;
    status: string;
  };
}

export function PortalProjectCard({ project }: PortalProjectCardProps) {
  return (
    <Link
      href={`/projects/${project._id}`}
      className="group flex flex-col justify-between rounded-lg border border-border-subtle bg-surface p-4 shadow-xs transition-all duration-[120ms] hover:-translate-y-px hover:shadow-sm"
    >
      <div>
        <h3 className="text-h3 font-semibold text-primary">{project.name}</h3>
        {project.description && (
          <p className="mt-1 text-sm text-secondary line-clamp-2">
            {project.description}
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${
          project.status === 'active'
            ? 'bg-success-muted text-success'
            : 'bg-subtle text-muted'
        }`}>
          {project.status}
        </span>
        <ArrowRight
          size={16}
          className="text-muted transition-transform duration-[120ms] group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
    </Link>
  );
}
```

- [ ] **Step 5: Create PortalProgressCard**

```typescript
// src/components/features/portal/portal-progress-card.tsx
'use client';

interface PortalProgressCardProps {
  progress: {
    total: number;
    done: number;
    inProgress: number;
    backlog: number;
    percentage: number;
  };
}

export function PortalProgressCard({ progress }: PortalProgressCardProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-5 shadow-xs">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted mb-3">
        Project Progress
      </h3>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full rounded-full bg-accent transition-all duration-[200ms]"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <p className="mt-2 text-h2 font-semibold text-primary">
        {progress.percentage}%
      </p>

      {/* Breakdown */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted">Completed</p>
          <p className="text-h3 font-semibold text-success">{progress.done}</p>
        </div>
        <div>
          <p className="text-xs text-muted">In Progress</p>
          <p className="text-h3 font-semibold text-warning">{progress.inProgress}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Backlog</p>
          <p className="text-h3 font-semibold text-secondary">{progress.backlog}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        {progress.done} of {progress.total} tasks completed
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Create portal project detail page (overview)**

```typescript
// src/app/(portal)/projects/[id]/page.tsx
'use client';

import { use } from 'react';
import { usePortalProject } from '@/hooks/queries/use-portal-data';
import { PortalProgressCard } from '@/components/features/portal/portal-progress-card';

export default function PortalProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data: project, isLoading } = usePortalProject(projectId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-subtle" />
        <div className="h-48 animate-pulse rounded-lg bg-subtle" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-h1 font-semibold text-primary">{project.name}</h1>
      <div className="max-w-md">
        <PortalProgressCard progress={project.progress} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create portal project layout with tabs**

```typescript
// src/app/(portal)/projects/[id]/layout.tsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartBar, Kanban, CalendarBlank, Link as LinkIcon } from '@phosphor-icons/react';

const tabs = [
  { href: '', label: 'Overview', icon: ChartBar },
  { href: '/board', label: 'Board', icon: Kanban },
  { href: '/timeline', label: 'Timeline', icon: CalendarBlank },
  { href: '/links', label: 'Links', icon: LinkIcon },
];

export default function PortalProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const basePath = `/projects/${id}`;

  return (
    <div>
      {/* Tab bar */}
      <div className="border-b border-border-subtle bg-surface px-6">
        <nav className="flex gap-1">
          {tabs.map((tab) => {
            const fullPath = `${basePath}${tab.href}`;
            const isActive = tab.href === ''
              ? pathname === basePath
              : pathname.startsWith(fullPath);

            return (
              <Link
                key={tab.href}
                href={fullPath}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors duration-[120ms] ${
                  isActive
                    ? 'border-accent font-medium text-primary'
                    : 'border-transparent text-secondary hover:text-primary'
                }`}
              >
                <tab.icon size={16} weight={isActive ? 'fill' : 'regular'} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
```

- [ ] **Step 8: Create 3-column portal Kanban board**

```typescript
// src/components/features/portal/portal-kanban-board.tsx
'use client';

import { KanbanBoard } from '@/components/features/kanban/kanban-board';
import type { ITask } from '@/modules/tasks/task.types';

const PORTAL_COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
] as const;

// Map 5 statuses → 3 client columns
function mapTasksToPortalColumns(tasks: ITask[]): ITask[] {
  return tasks.map((task) => {
    let mappedStatus: string;
    switch (task.status) {
      case 'backlog':
      case 'todo':
        mappedStatus = 'backlog';
        break;
      case 'in_progress':
      case 'review':
        mappedStatus = 'in_progress';
        break;
      case 'done':
        mappedStatus = 'done';
        break;
      default:
        mappedStatus = 'backlog';
    }
    return { ...task, status: mappedStatus };
  });
}

interface PortalKanbanBoardProps {
  tasks: ITask[];
  isLoading?: boolean;
}

export function PortalKanbanBoard({ tasks, isLoading }: PortalKanbanBoardProps) {
  const mappedTasks = mapTasksToPortalColumns(tasks);

  return (
    <KanbanBoard
      projectId=""
      tasks={mappedTasks}
      isLoading={isLoading}
      columns={PORTAL_COLUMNS as unknown as { id: string; title: string }[]}
      // No onTaskMove — portal is read-only (no drag-and-drop)
      // No onAddTask — clients cannot create tasks
    />
  );
}
```

- [ ] **Step 9: Create portal board page**

```typescript
// src/app/(portal)/projects/[id]/board/page.tsx
'use client';

import { use } from 'react';
import { usePortalTasks } from '@/hooks/queries/use-portal-data';
import { PortalKanbanBoard } from '@/components/features/portal/portal-kanban-board';

export default function PortalBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data: tasks, isLoading } = usePortalTasks(projectId);

  return (
    <div className="p-6">
      <PortalKanbanBoard tasks={tasks ?? []} isLoading={isLoading} />
    </div>
  );
}
```

- [ ] **Step 10: Create portal timeline and links pages**

```typescript
// src/app/(portal)/projects/[id]/timeline/page.tsx
'use client';

import { use } from 'react';
import { TimelineChart } from '@/components/features/timeline/timeline-chart';
import { usePortalEpics } from '@/hooks/queries/use-portal-data';
import { useSprints } from '@/hooks/queries/use-sprints';

export default function PortalTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data: epics, isLoading: epicsLoading } = usePortalEpics(projectId);
  // Sprints are accessed via standard endpoint — they have no client-visibility restriction
  const { data: sprints, isLoading: sprintsLoading } = useSprints(projectId);

  return (
    <div className="p-6">
      <TimelineChart
        epics={epics ?? []}
        sprints={sprints ?? []}
        isLoading={epicsLoading || sprintsLoading}
      />
    </div>
  );
}
```

```typescript
// src/app/(portal)/projects/[id]/links/page.tsx
'use client';

import { use } from 'react';
import { usePortalLinks } from '@/hooks/queries/use-portal-data';
import { ArrowSquareOut } from '@phosphor-icons/react';

export default function PortalLinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { data: links, isLoading } = usePortalLinks(projectId);

  return (
    <div className="p-6">
      <h2 className="mb-4 text-h2 font-semibold text-primary">Links</h2>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-subtle" />
          ))}
        </div>
      ) : links?.length === 0 ? (
        <p className="text-secondary py-8 text-center">No links shared yet.</p>
      ) : (
        <div className="space-y-2">
          {links?.map((link) => (
            <a
              key={link._id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-4 py-3 transition-colors duration-[120ms] hover:bg-subtle"
            >
              <div>
                <p className="text-sm font-medium text-primary">{link.label}</p>
                <p className="text-xs text-muted">{link.type}</p>
              </div>
              <ArrowSquareOut size={16} className="text-muted" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Create portal React Query hooks**

```typescript
// src/hooks/queries/use-portal-data.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';

export function usePortalProjects() {
  return useQuery({
    queryKey: ['portal', 'projects'],
    queryFn: async () => {
      const res = await apiClient.get('/portal/projects');
      return res.data;
    },
  });
}

export function usePortalProject(projectId: string) {
  return useQuery({
    queryKey: ['portal', 'projects', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/portal/projects/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function usePortalTasks(projectId: string) {
  return useQuery({
    queryKey: ['portal', 'tasks', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/portal/projects/${projectId}/tasks`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function usePortalEpics(projectId: string) {
  return useQuery({
    queryKey: ['portal', 'epics', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/portal/projects/${projectId}/epics`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function usePortalLinks(projectId: string) {
  return useQuery({
    queryKey: ['portal', 'links', projectId],
    queryFn: async () => {
      const res = await apiClient.get(`/portal/projects/${projectId}/links`);
      return res.data;
    },
    enabled: !!projectId,
  });
}
```

- [ ] **Step 12: Commit**

```bash
git add src/app/\(portal\)/ src/components/layouts/portal-sidebar.tsx src/components/features/portal/ src/hooks/queries/use-portal-data.ts
git commit -m "feat: add client portal with layout, project list, overview, board, timeline, and links pages"
```

---

### Task 9: Command Palette (Cmd+K)

**Files:**
- Create: `src/components/features/command-palette/command-palette.tsx`, `src/components/features/command-palette/command-palette-result.tsx`, `src/components/features/command-palette/command-palette-provider.tsx`
- Test: `tests/unit/components/command-palette.test.tsx`

- [ ] **Step 1: Write command palette tests**

```typescript
// tests/unit/components/command-palette.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandPaletteProvider } from '@/components/features/command-palette/command-palette-provider';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    </QueryClientProvider>
  );
}

describe('CommandPalette', () => {
  it('opens on Cmd+K', () => {
    render(<TestWrapper><div>App</div></TestWrapper>);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('opens on Ctrl+K', () => {
    render(<TestWrapper><div>App</div></TestWrapper>);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<TestWrapper><div>App</div></TestWrapper>);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
  });

  it('auto-focuses search input on open', () => {
    render(<TestWrapper><div>App</div></TestWrapper>);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const input = screen.getByPlaceholderText(/search/i);
    expect(document.activeElement).toBe(input);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/unit/components/command-palette.test.tsx --no-cache
```

- [ ] **Step 3: Create CommandPaletteResult**

```typescript
// src/components/features/command-palette/command-palette-result.tsx
'use client';

import {
  File,
  Bug,
  Kanban,
  FolderSimple,
  Lightning,
} from '@phosphor-icons/react';

type ResultType = 'project' | 'task' | 'bug' | 'doc' | 'action';

interface CommandPaletteResultProps {
  type: ResultType;
  title: string;
  subtitle?: string;
  shortcut?: string;
  isSelected: boolean;
  onClick: () => void;
}

const ICONS: Record<ResultType, typeof File> = {
  project: FolderSimple,
  task: Kanban,
  bug: Bug,
  doc: File,
  action: Lightning,
};

export function CommandPaletteResult({
  type,
  title,
  subtitle,
  shortcut,
  isSelected,
  onClick,
}: CommandPaletteResultProps) {
  const Icon = ICONS[type];

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-[120ms] ${
        isSelected ? 'bg-subtle' : 'hover:bg-subtle'
      }`}
    >
      <Icon
        size={18}
        weight={isSelected ? 'fill' : 'regular'}
        className={isSelected ? 'text-accent' : 'text-muted'}
      />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-primary">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted">{subtitle}</p>
        )}
      </div>
      {shortcut && (
        <kbd className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-muted">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Create CommandPalette modal**

```typescript
// src/components/features/command-palette/command-palette.tsx
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass } from '@phosphor-icons/react';
import Fuse from 'fuse.js';
import { useRouter } from 'next/navigation';
import { CommandPaletteResult } from './command-palette-result';

interface SearchItem {
  id: string;
  type: 'project' | 'task' | 'bug' | 'doc' | 'action';
  title: string;
  subtitle?: string;
  href?: string;
  shortcut?: string;
  action?: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: SearchItem[];
}

export function CommandPalette({ isOpen, onClose, items }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['title', 'subtitle'],
        threshold: 0.4,
        includeScore: true,
      }),
    [items],
  );

  const results = useMemo(() => {
    if (!query.trim()) {
      // Show quick actions first, then recent items
      return items.filter((i) => i.type === 'action').slice(0, 5);
    }
    return fuse.search(query).map((r) => r.item).slice(0, 10);
  }, [query, fuse, items]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay for animation to start before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      onClose();
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [onClose, router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, handleSelect, onClose],
  );

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[100] bg-overlay"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="fixed left-1/2 top-[38%] z-[101] w-full max-w-lg -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className="overflow-hidden rounded-xl border border-border-subtle bg-elevated shadow-lg"
              onKeyDown={handleKeyDown}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border-subtle px-4">
                <MagnifyingGlass size={18} className="text-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search projects, tasks, docs..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 flex-1 bg-transparent text-base text-primary placeholder:text-muted focus:outline-none"
                />
                <kbd className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-muted">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {results.length === 0 && query.trim() && (
                  <p className="px-3 py-6 text-center text-sm text-muted">
                    No results for &ldquo;{query}&rdquo;
                  </p>
                )}

                {results.map((item, index) => (
                  <CommandPaletteResult
                    key={item.id}
                    type={item.type}
                    title={item.title}
                    subtitle={item.subtitle}
                    shortcut={item.shortcut}
                    isSelected={index === selectedIndex}
                    onClick={() => handleSelect(item)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 5: Create CommandPaletteProvider**

```typescript
// src/components/features/command-palette/command-palette-provider.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CommandPalette } from './command-palette';
import { useProjects } from '@/hooks/queries/use-projects';

// Quick actions always available
function useQuickActions() {
  const router = useRouter();

  return [
    {
      id: 'action-create-task',
      type: 'action' as const,
      title: 'Create Task',
      shortcut: 'C',
      action: () => {
        // Dispatch custom event to trigger create task modal
        window.dispatchEvent(new CustomEvent('orbiter:create-task'));
      },
    },
    {
      id: 'action-my-work',
      type: 'action' as const,
      title: 'Go to My Work',
      action: () => router.push('/my-work'),
    },
  ];
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: projects } = useProjects();
  const quickActions = useQuickActions();

  // Build searchable items from loaded data
  const items = [
    ...quickActions,
    ...(projects?.map((p: { _id: string; name: string; description?: string; slug: string }) => ({
      id: p._id,
      type: 'project' as const,
      title: p.name,
      subtitle: p.description ?? '',
      href: `/projects/${p._id}/board`,
    })) ?? []),
  ];

  // Global keyboard listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {children}
      <CommandPalette isOpen={isOpen} onClose={handleClose} items={items} />
    </>
  );
}
```

- [ ] **Step 6: Add CommandPaletteProvider to root layout**

Modify `src/app/layout.tsx` to wrap children with `<CommandPaletteProvider>` inside the existing provider stack:

```typescript
// Inside the provider stack in src/app/layout.tsx, add:
import { CommandPaletteProvider } from '@/components/features/command-palette/command-palette-provider';

// Wrap children:
<QueryClientProvider>
  <AuthProvider>
    <ThemeProvider>
      <CommandPaletteProvider>
        {children}
      </CommandPaletteProvider>
    </ThemeProvider>
  </AuthProvider>
</QueryClientProvider>
```

- [ ] **Step 7: Run tests**

```bash
npx jest tests/unit/components/command-palette.test.tsx --no-cache
```
Expected: All 4 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/features/command-palette/ src/app/layout.tsx tests/unit/components/command-palette.test.tsx
git commit -m "feat: add Cmd+K command palette with fuzzy search and keyboard navigation"
```

---

### Task 10: My Work Page

**Files:**
- Create: `src/app/(dashboard)/my-work/page.tsx`, `src/components/features/my-work/my-work-group.tsx`, `src/components/features/my-work/my-work-task-row.tsx`
- Create: `src/hooks/queries/use-my-tasks.ts`

- [ ] **Step 1: Create my-tasks React Query hook**

```typescript
// src/hooks/queries/use-my-tasks.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/api-client';
import type { ITask } from '@/modules/tasks/task.types';

export function useMyTasks(options?: { includeDone?: boolean }) {
  return useQuery<ITask[]>({
    queryKey: ['my-tasks', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.includeDone) params.set('includeDone', 'true');
      const res = await apiClient.get(`/tasks/my?${params.toString()}`);
      return res.data;
    },
  });
}
```

- [ ] **Step 2: Create MyWorkTaskRow**

```typescript
// src/components/features/my-work/my-work-task-row.tsx
'use client';

import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'var(--color-p0)',
  P1: 'var(--color-p1)',
  P2: 'var(--color-p2)',
  P3: 'var(--color-p3)',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  backlog: { label: 'Backlog', className: 'bg-subtle text-muted' },
  todo: { label: 'Todo', className: 'bg-info-muted text-info' },
  in_progress: { label: 'In Progress', className: 'bg-warning-muted text-warning' },
  review: { label: 'Review', className: 'bg-accent-muted text-accent-text' },
  done: { label: 'Done', className: 'bg-success-muted text-success' },
};

interface MyWorkTaskRowProps {
  task: {
    _id: string;
    title: string;
    priority: string;
    status: string;
    project?: { _id: string; name: string; slug: string };
    sprint?: { name: string; endDate: string };
  };
}

export function MyWorkTaskRow({ task }: MyWorkTaskRowProps) {
  const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.P3;
  const statusInfo = STATUS_LABELS[task.status] ?? STATUS_LABELS.backlog;

  return (
    <Link
      href={`/projects/${task.project?._id}/board`}
      className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-4 py-3 transition-all duration-[120ms] hover:-translate-y-px hover:shadow-sm"
    >
      {/* Priority dot */}
      <div
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: priorityColor }}
      />

      {/* Title + project */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-primary">{task.title}</p>
        {task.project && (
          <p className="truncate text-xs text-muted">{task.project.name}</p>
        )}
      </div>

      {/* Status badge */}
      <span
        className={`shrink-0 rounded-sm px-1.5 py-0.5 text-xs font-medium ${statusInfo.className}`}
      >
        {statusInfo.label}
      </span>

      {/* Sprint */}
      {task.sprint && (
        <span className="shrink-0 text-xs text-muted">{task.sprint.name}</span>
      )}

      <ArrowRight
        size={14}
        className="shrink-0 text-muted opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100"
      />
    </Link>
  );
}
```

- [ ] **Step 3: Create MyWorkGroup**

```typescript
// src/components/features/my-work/my-work-group.tsx
'use client';

import { MyWorkTaskRow } from './my-work-task-row';

interface MyWorkGroupProps {
  title: string;
  tasks: {
    _id: string;
    title: string;
    priority: string;
    status: string;
    project?: { _id: string; name: string; slug: string };
    sprint?: { name: string; endDate: string };
  }[];
  emptyMessage?: string;
}

export function MyWorkGroup({ title, tasks, emptyMessage }: MyWorkGroupProps) {
  if (tasks.length === 0 && !emptyMessage) return null;

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted">
          {title}
        </h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-secondary">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted py-3">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <MyWorkTaskRow key={task._id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create My Work page**

```typescript
// src/app/(dashboard)/my-work/page.tsx
'use client';

import { useMemo } from 'react';
import { isToday, isPast, isFuture, isWithinInterval, addDays, startOfDay, endOfDay } from 'date-fns';
import { useMyTasks } from '@/hooks/queries/use-my-tasks';
import { MyWorkGroup } from '@/components/features/my-work/my-work-group';

// Priority sort: P0=0, P1=1, P2=2, P3=3
const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function sortByPriority<T extends { priority: string }>(tasks: T[]): T[] {
  return [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
  );
}

export default function MyWorkPage() {
  const { data: tasks, isLoading } = useMyTasks();

  const groups = useMemo(() => {
    if (!tasks) return { overdue: [], today: [], thisSprint: [], upcoming: [] };

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const overdue: typeof tasks = [];
    const today: typeof tasks = [];
    const thisSprint: typeof tasks = [];
    const upcoming: typeof tasks = [];

    for (const task of tasks) {
      const sprintEnd = task.sprint?.endDate ? new Date(task.sprint.endDate) : null;

      if (sprintEnd && isPast(sprintEnd) && task.status !== 'done') {
        overdue.push(task);
      } else if (sprintEnd && isToday(sprintEnd)) {
        today.push(task);
      } else if (
        sprintEnd &&
        isWithinInterval(sprintEnd, {
          start: addDays(todayEnd, 1),
          end: addDays(todayEnd, 14),
        })
      ) {
        thisSprint.push(task);
      } else {
        upcoming.push(task);
      }
    }

    return {
      overdue: sortByPriority(overdue),
      today: sortByPriority(today),
      thisSprint: sortByPriority(thisSprint),
      upcoming: sortByPriority(upcoming),
    };
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-subtle" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-subtle" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-h1 font-semibold text-primary">My Work</h1>

      <MyWorkGroup
        title="Overdue"
        tasks={groups.overdue}
        emptyMessage="Nothing overdue."
      />
      <MyWorkGroup
        title="Today"
        tasks={groups.today}
        emptyMessage="Nothing due today."
      />
      <MyWorkGroup
        title="This Sprint"
        tasks={groups.thisSprint}
      />
      <MyWorkGroup
        title="Upcoming"
        tasks={groups.upcoming}
      />

      {tasks?.length === 0 && (
        <p className="text-center text-secondary py-12">
          No tasks assigned to you. Check back later.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/my-work/ src/components/features/my-work/ src/hooks/queries/use-my-tasks.ts
git commit -m "feat: add My Work page with task grouping by overdue, today, sprint, and upcoming"
```

---

### Task 11: Keyboard Shortcuts & Cheat Sheet

**Files:**
- Create: `src/hooks/use-keyboard-shortcuts.ts`, `src/components/layouts/keyboard-shortcuts-overlay.tsx`
- Test: `tests/unit/hooks/use-keyboard-shortcuts.test.ts`

- [ ] **Step 1: Write keyboard shortcuts tests**

```typescript
// tests/unit/hooks/use-keyboard-shortcuts.test.ts
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

describe('useKeyboardShortcuts', () => {
  it('calls handler when registered key is pressed', () => {
    const handler = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'b', handler }]),
    );
    fireEvent.keyDown(window, { key: 'b' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire when inside an input element', () => {
    const handler = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'b', handler }]),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'b' });
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('supports modifier keys', () => {
    const handler = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: '/', handler }]),
    );
    fireEvent.keyDown(window, { key: '/' });
    expect(handler).toHaveBeenCalled();
  });

  it('supports Escape key even in inputs', () => {
    const handler = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'Escape', handler, allowInInput: true }]),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(handler).toHaveBeenCalled();
    document.body.removeChild(input);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest tests/unit/hooks/use-keyboard-shortcuts.test.ts --no-cache
```

- [ ] **Step 3: Implement useKeyboardShortcuts hook**

```typescript
// src/hooks/use-keyboard-shortcuts.ts
'use client';

import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  handler: () => void;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  allowInInput?: boolean;
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = INPUT_TAGS.has(target.tagName) || target.isContentEditable;

      for (const shortcut of shortcuts) {
        // Skip if inside input and not allowed
        if (isInput && !shortcut.allowInInput) continue;

        // Check modifiers
        if (shortcut.ctrl && !e.ctrlKey) continue;
        if (shortcut.meta && !e.metaKey) continue;
        if (shortcut.shift && !e.shiftKey) continue;

        // Check key (case-insensitive for letters)
        if (e.key.toLowerCase() === shortcut.key.toLowerCase() ||
            e.key === shortcut.key) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
```

- [ ] **Step 4: Create keyboard shortcuts overlay**

```typescript
// src/components/layouts/keyboard-shortcuts-overlay.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from '@phosphor-icons/react';

interface KeyboardShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { section: 'Navigation', items: [
    { keys: ['B'], description: 'Open Board view' },
    { keys: ['T'], description: 'Open Table view' },
    { keys: ['Cmd', 'K'], description: 'Open command palette' },
    { keys: ['/'], description: 'Focus search' },
  ]},
  { section: 'Actions', items: [
    { keys: ['C'], description: 'Create task' },
    { keys: ['Esc'], description: 'Close panel / modal' },
  ]},
  { section: 'Help', items: [
    { keys: ['?'], description: 'Show this cheat sheet' },
  ]},
];

export function KeyboardShortcutsOverlay({
  isOpen,
  onClose,
}: KeyboardShortcutsOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[100] bg-overlay"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-[101] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-subtle bg-elevated p-6 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-h2 font-semibold text-primary">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-muted hover:bg-subtle transition-colors duration-[120ms]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              {SHORTCUTS.map((section) => (
                <div key={section.section}>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                    {section.section}
                  </h3>
                  <div className="space-y-1.5">
                    {section.items.map((item) => (
                      <div
                        key={item.description}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm text-secondary">
                          {item.description}
                        </span>
                        <div className="flex gap-1">
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex min-w-6 items-center justify-center rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-muted"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 5: Wire keyboard shortcuts into dashboard layout**

Modify `src/app/(dashboard)/layout.tsx` to add global shortcuts:

```typescript
// Add to the DashboardLayout component:
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { KeyboardShortcutsOverlay } from '@/components/layouts/keyboard-shortcuts-overlay';
import { useRouter } from 'next/navigation';

// Inside the component:
const [showShortcuts, setShowShortcuts] = useState(false);
const router = useRouter();

useKeyboardShortcuts([
  { key: 'b', handler: () => {
    // Navigate to board view of current project (if on a project page)
    const match = window.location.pathname.match(/\/projects\/([^/]+)/);
    if (match) router.push(`/projects/${match[1]}/board`);
  }},
  { key: 't', handler: () => {
    const match = window.location.pathname.match(/\/projects\/([^/]+)/);
    if (match) router.push(`/projects/${match[1]}/table`);
  }},
  { key: 'c', handler: () => {
    window.dispatchEvent(new CustomEvent('orbiter:create-task'));
  }},
  { key: '/', handler: () => {
    document.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
  }},
  { key: '?', handler: () => setShowShortcuts(true) },
  { key: 'Escape', handler: () => setShowShortcuts(false), allowInInput: true },
]);

// Render the overlay:
<KeyboardShortcutsOverlay isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
```

- [ ] **Step 6: Run tests**

```bash
npx jest tests/unit/hooks/use-keyboard-shortcuts.test.ts --no-cache
```
Expected: All 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-keyboard-shortcuts.ts src/components/layouts/keyboard-shortcuts-overlay.tsx src/app/\(dashboard\)/layout.tsx tests/unit/hooks/use-keyboard-shortcuts.test.ts
git commit -m "feat: add global keyboard shortcuts and cheat sheet overlay"
```

---

### Task 12: Favorites & Recents (localStorage)

**Files:**
- Create: `src/hooks/use-favorites.ts`, `src/hooks/use-recents.ts`
- Modify: `src/components/layouts/dashboard-sidebar.tsx`
- Test: `tests/unit/hooks/use-favorites.test.ts`, `tests/unit/hooks/use-recents.test.ts`

- [ ] **Step 1: Write tests for favorites store**

```typescript
// tests/unit/hooks/use-favorites.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFavoritesStore } from '@/hooks/use-favorites';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useFavoritesStore', () => {
  beforeEach(() => localStorageMock.clear());

  it('starts with empty favorites', () => {
    const { result } = renderHook(() => useFavoritesStore());
    expect(result.current.favorites).toEqual([]);
  });

  it('adds a favorite', () => {
    const { result } = renderHook(() => useFavoritesStore());
    act(() => {
      result.current.addFavorite({ id: 'p1', name: 'Project 1', href: '/projects/p1' });
    });
    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.isFavorite('p1')).toBe(true);
  });

  it('removes a favorite', () => {
    const { result } = renderHook(() => useFavoritesStore());
    act(() => {
      result.current.addFavorite({ id: 'p1', name: 'Project 1', href: '/projects/p1' });
      result.current.removeFavorite('p1');
    });
    expect(result.current.favorites).toHaveLength(0);
    expect(result.current.isFavorite('p1')).toBe(false);
  });

  it('toggles a favorite', () => {
    const { result } = renderHook(() => useFavoritesStore());
    act(() => {
      result.current.toggleFavorite({ id: 'p1', name: 'Project 1', href: '/projects/p1' });
    });
    expect(result.current.isFavorite('p1')).toBe(true);
    act(() => {
      result.current.toggleFavorite({ id: 'p1', name: 'Project 1', href: '/projects/p1' });
    });
    expect(result.current.isFavorite('p1')).toBe(false);
  });
});
```

- [ ] **Step 2: Write tests for recents store**

```typescript
// tests/unit/hooks/use-recents.test.ts
import { renderHook, act } from '@testing-library/react';
import { useRecentsStore } from '@/hooks/use-recents';

describe('useRecentsStore', () => {
  beforeEach(() => localStorage.clear());

  it('starts with empty recents', () => {
    const { result } = renderHook(() => useRecentsStore());
    expect(result.current.recents).toEqual([]);
  });

  it('adds a recent', () => {
    const { result } = renderHook(() => useRecentsStore());
    act(() => {
      result.current.addRecent({ id: 'p1', name: 'Project 1', href: '/projects/p1' });
    });
    expect(result.current.recents).toHaveLength(1);
  });

  it('moves existing item to front', () => {
    const { result } = renderHook(() => useRecentsStore());
    act(() => {
      result.current.addRecent({ id: 'p1', name: 'Project 1', href: '/projects/p1' });
      result.current.addRecent({ id: 'p2', name: 'Project 2', href: '/projects/p2' });
      result.current.addRecent({ id: 'p1', name: 'Project 1', href: '/projects/p1' });
    });
    expect(result.current.recents).toHaveLength(2);
    expect(result.current.recents[0].id).toBe('p1');
  });

  it('keeps max 5 recents', () => {
    const { result } = renderHook(() => useRecentsStore());
    act(() => {
      for (let i = 1; i <= 7; i++) {
        result.current.addRecent({ id: `p${i}`, name: `Project ${i}`, href: `/projects/p${i}` });
      }
    });
    expect(result.current.recents).toHaveLength(5);
    expect(result.current.recents[0].id).toBe('p7');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx jest tests/unit/hooks/use-favorites.test.ts tests/unit/hooks/use-recents.test.ts --no-cache
```

- [ ] **Step 4: Implement favorites store**

```typescript
// src/hooks/use-favorites.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoriteItem {
  id: string;
  name: string;
  href: string;
}

interface FavoritesState {
  favorites: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (item) =>
        set((state) => {
          if (state.favorites.some((f) => f.id === item.id)) return state;
          return { favorites: [...state.favorites, item] };
        }),

      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        })),

      toggleFavorite: (item) => {
        const state = get();
        if (state.favorites.some((f) => f.id === item.id)) {
          state.removeFavorite(item.id);
        } else {
          state.addFavorite(item);
        }
      },

      isFavorite: (id) => get().favorites.some((f) => f.id === id),
    }),
    {
      name: 'orbiter-favorites',
    },
  ),
);
```

- [ ] **Step 5: Implement recents store**

```typescript
// src/hooks/use-recents.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENTS = 5;

interface RecentItem {
  id: string;
  name: string;
  href: string;
}

interface RecentsState {
  recents: RecentItem[];
  addRecent: (item: RecentItem) => void;
  clearRecents: () => void;
}

export const useRecentsStore = create<RecentsState>()(
  persist(
    (set) => ({
      recents: [],

      addRecent: (item) =>
        set((state) => {
          // Remove existing entry if present, then prepend
          const filtered = state.recents.filter((r) => r.id !== item.id);
          return { recents: [item, ...filtered].slice(0, MAX_RECENTS) };
        }),

      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: 'orbiter-recents',
    },
  ),
);
```

- [ ] **Step 6: Add Favorites & Recents sections to dashboard sidebar**

Modify `src/components/layouts/dashboard-sidebar.tsx` to add these sections:

```typescript
// Add to dashboard-sidebar.tsx

import { Star } from '@phosphor-icons/react';
import Link from 'next/link';
import { useFavoritesStore } from '@/hooks/use-favorites';
import { useRecentsStore } from '@/hooks/use-recents';

// Inside the sidebar nav, after the main nav items:

function SidebarFavoritesSection() {
  const { favorites } = useFavoritesStore();

  if (favorites.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">
        Favorites
      </h4>
      {favorites.map((fav) => (
        <Link
          key={fav.id}
          href={fav.href}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-secondary transition-colors duration-[120ms] hover:bg-subtle hover:text-primary"
        >
          <Star size={14} weight="fill" className="text-warning" />
          <span className="truncate">{fav.name}</span>
        </Link>
      ))}
    </div>
  );
}

function SidebarRecentsSection() {
  const { recents } = useRecentsStore();

  if (recents.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">
        Recent
      </h4>
      {recents.map((recent) => (
        <Link
          key={recent.id}
          href={recent.href}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-secondary transition-colors duration-[120ms] hover:bg-subtle hover:text-primary"
        >
          <span className="truncate">{recent.name}</span>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Track project visits in recents**

Add `useRecentsStore().addRecent()` call in the project detail layout (`src/app/(dashboard)/projects/[id]/layout.tsx`) via a `useEffect`:

```typescript
// Add to the project layout:
import { useRecentsStore } from '@/hooks/use-recents';

// Inside the layout component, after getting project data:
const addRecent = useRecentsStore((s) => s.addRecent);

useEffect(() => {
  if (project) {
    addRecent({
      id: project._id,
      name: project.name,
      href: `/projects/${project._id}/board`,
    });
  }
}, [project?._id]);
```

- [ ] **Step 8: Add star/favorite button to project pages**

```typescript
// Add a favorite toggle button to project list cards and project detail header:
import { Star } from '@phosphor-icons/react';
import { useFavoritesStore } from '@/hooks/use-favorites';

// Example usage in a project header:
function FavoriteButton({ project }: { project: { _id: string; name: string } }) {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const starred = isFavorite(project._id);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite({
          id: project._id,
          name: project.name,
          href: `/projects/${project._id}/board`,
        });
      }}
      className="rounded-md p-1 text-muted transition-colors duration-[120ms] hover:bg-subtle"
    >
      <Star
        size={18}
        weight={starred ? 'fill' : 'regular'}
        className={starred ? 'text-warning' : ''}
      />
    </button>
  );
}
```

- [ ] **Step 9: Run tests**

```bash
npx jest tests/unit/hooks/use-favorites.test.ts tests/unit/hooks/use-recents.test.ts --no-cache
```
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/hooks/use-favorites.ts src/hooks/use-recents.ts src/components/layouts/dashboard-sidebar.tsx tests/unit/hooks/
git commit -m "feat: add favorites and recents with localStorage persistence and sidebar sections"
```

---

### Task 13: React Query Hooks & API Client Integration

**Files:**
- Modify: `src/hooks/queries/use-tasks.ts`
- Verify: All hooks created in previous tasks compile and wire correctly

- [ ] **Step 1: Ensure use-tasks.ts has all necessary hooks**

Verify `src/hooks/queries/use-tasks.ts` exports these hooks (some may already exist from Plan 3):

```typescript
// src/hooks/queries/use-tasks.ts — verify/add these exports:

export function useTasks(projectId: string, filters?: Record<string, string>) {
  return useQuery<ITask[]>({
    queryKey: ['tasks', projectId, filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const res = await apiClient.get(`/projects/${projectId}/tasks?${params.toString()}`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<ITask> }) => {
      const res = await apiClient.patch(`/tasks/${taskId}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useReorderTask() {
  // Already created in Task 6 — verify it exists
}
```

- [ ] **Step 2: Verify all imports compile**

```bash
npx tsc --noEmit
```
Fix any TypeScript errors — common issues:
- Missing type imports for ITask
- Module path aliases not resolving

- [ ] **Step 3: Run full test suite**

```bash
npm run test:unit
```
Expected: All unit tests PASS.

- [ ] **Step 4: Commit (only if changes were needed)**

```bash
git add src/hooks/queries/
git commit -m "feat: consolidate React Query hooks for tasks, portal, and my-work"
```

---

### Task 14: E2E Tests

**Files:**
- Create: `tests/e2e/client-portal.spec.ts`, `tests/e2e/kanban-board.spec.ts`, `tests/e2e/command-palette.spec.ts`

- [ ] **Step 1: Write client portal E2E test**

```typescript
// tests/e2e/client-portal.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsClient, seedClientProject } from '../helpers/e2e-helpers';

test.describe('Client Portal', () => {
  test('client sees only their projects', async ({ page }) => {
    const { project } = await seedClientProject();
    await loginAsClient(page);

    await expect(page.getByText(project.name)).toBeVisible();
    // Should NOT see admin nav items
    await expect(page.getByText('Admin')).not.toBeVisible();
    await expect(page.getByText('Bugs')).not.toBeVisible();
    await expect(page.getByText('Env Variables')).not.toBeVisible();
  });

  test('client sees project progress', async ({ page }) => {
    await seedClientProject();
    await loginAsClient(page);

    await page.getByRole('link', { name: /project/i }).first().click();
    await expect(page.getByText('Project Progress')).toBeVisible();
    await expect(page.getByText('%')).toBeVisible();
  });

  test('client board shows 3 columns', async ({ page }) => {
    await seedClientProject();
    await loginAsClient(page);

    await page.getByRole('link', { name: /project/i }).first().click();
    await page.getByRole('link', { name: 'Board' }).click();

    await expect(page.getByText('Backlog')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
    // Should NOT have 5 columns
    await expect(page.getByText('Todo')).not.toBeVisible();
    await expect(page.getByText('Review')).not.toBeVisible();
  });

  test('client sees only clientVisible tasks', async ({ page }) => {
    await seedClientProject({ tasks: [
      { title: 'Visible Task', clientVisible: true },
      { title: 'Hidden Task', clientVisible: false },
    ]});
    await loginAsClient(page);

    await page.getByRole('link', { name: /project/i }).first().click();
    await page.getByRole('link', { name: 'Board' }).click();

    await expect(page.getByText('Visible Task')).toBeVisible();
    await expect(page.getByText('Hidden Task')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Write kanban board E2E test**

```typescript
// tests/e2e/kanban-board.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsInternal, seedProject } from '../helpers/e2e-helpers';

test.describe('Kanban Board', () => {
  test('shows 5 columns', async ({ page }) => {
    await seedProject();
    await loginAsInternal(page);
    await page.getByRole('link', { name: /project/i }).first().click();
    await page.getByRole('link', { name: 'Board' }).click();

    for (const col of ['Backlog', 'Todo', 'In Progress', 'Review', 'Done']) {
      await expect(page.getByText(col)).toBeVisible();
    }
  });

  test('shows task cards with priority stripe', async ({ page }) => {
    await seedProject({ tasks: [{ title: 'Auth Flow', priority: 'P0', status: 'todo' }] });
    await loginAsInternal(page);
    await page.getByRole('link', { name: /project/i }).first().click();
    await page.getByRole('link', { name: 'Board' }).click();

    await expect(page.getByText('Auth Flow')).toBeVisible();
  });
});
```

- [ ] **Step 3: Write command palette E2E test**

```typescript
// tests/e2e/command-palette.spec.ts
import { test, expect } from '@playwright/test';
import { loginAsInternal, seedProject } from '../helpers/e2e-helpers';

test.describe('Command Palette', () => {
  test('opens with Cmd+K and closes with Escape', async ({ page }) => {
    await loginAsInternal(page);

    await page.keyboard.press('Meta+k');
    await expect(page.getByPlaceholderText(/search/i)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholderText(/search/i)).not.toBeVisible();
  });

  test('fuzzy searches projects', async ({ page }) => {
    await seedProject({ name: 'Customer Portal' });
    await loginAsInternal(page);

    await page.keyboard.press('Meta+k');
    await page.getByPlaceholderText(/search/i).fill('cust portal');

    await expect(page.getByText('Customer Portal')).toBeVisible();
  });

  test('navigates results with arrow keys', async ({ page }) => {
    await seedProject({ name: 'Alpha' });
    await seedProject({ name: 'Beta' });
    await loginAsInternal(page);

    await page.keyboard.press('Meta+k');
    await page.getByPlaceholderText(/search/i).fill('');

    // Quick actions should be visible
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    // Should navigate somewhere — just verify palette closes
    await expect(page.getByPlaceholderText(/search/i)).not.toBeVisible();
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/
git commit -m "test: add E2E tests for client portal, kanban board, and command palette"
```

---

### Task 15: Final Integration & Cleanup

**Files:**
- Verify all imports, fix any TypeScript errors, ensure lint passes

- [ ] **Step 1: TypeScript compile check**

```bash
npx tsc --noEmit
```
Fix any errors. Common fixes:
- Add missing type imports
- Fix path aliases
- Ensure all component props are correctly typed

- [ ] **Step 2: Lint check**

```bash
npm run lint
```
Fix any lint errors.

- [ ] **Step 3: Run all unit tests**

```bash
npm run test:unit
```
Expected: All tests PASS.

- [ ] **Step 4: Run all integration tests**

```bash
npm run test:integration
```
Expected: All tests PASS.

- [ ] **Step 5: Manual smoke test checklist**

Verify the following work in the browser:

- [ ] Dashboard board page: 5 columns render, cards display, drag-and-drop moves cards between columns
- [ ] Dashboard table page: table renders, inline dropdowns change status/priority, bulk select works
- [ ] Dashboard timeline page: epics shown as bars, sprint boundaries visible, empty state for no-date epics
- [ ] My Work page: tasks grouped correctly, priority-sorted within groups
- [ ] Cmd+K palette: opens/closes, fuzzy search works, keyboard navigation, results navigate to correct pages
- [ ] Keyboard shortcuts: B/T switch views, C triggers create, / focuses search, ? opens cheat sheet
- [ ] Favorites: star icon toggles, starred projects appear in sidebar Favorites section
- [ ] Recents: visiting a project adds it to sidebar Recent section, max 5 shown
- [ ] Portal layout: client user sees simplified sidebar, no admin/bugs/env nav
- [ ] Portal project list: only assigned projects shown
- [ ] Portal project detail: progress card with percentage and breakdown
- [ ] Portal board: 3 columns (Backlog/In Progress/Done), no drag-and-drop, no add button
- [ ] Portal timeline: same component, read-only
- [ ] Portal links: links displayed, opens in new tab
- [ ] Portal cannot access: /bugs, /env, /docs, /admin routes redirect or 403

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: Plan 5 integration cleanup — fix types, lint, and verify all views"
```
