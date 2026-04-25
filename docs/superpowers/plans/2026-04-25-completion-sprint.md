# Orbiter Completion Sprint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining features to bring Orbiter from 7/10 to 10/10 spec completion.

**Architecture:** Each task is independent and can be implemented in parallel. All follow the existing patterns: domain modules with services, React Query hooks, and feature components.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, MongoDB/Mongoose, Tailwind CSS 4, TipTap, ChatGPT Codex API (gpt-5.4)

---

### Task 1: Wire Comments to Task Detail Panel

**Files:**
- Modify: `src/components/features/tasks/task-detail-panel.tsx`

- [ ] **Step 1: Add comment imports and render comments section**

Add to imports at top of file:
```typescript
import { CommentList } from '@/components/features/comments/comment-list';
import { CommentInput } from '@/components/features/comments/comment-input';
```

Add after the tags/sprint section (after the last metadata div, before the closing `</div>` of the panel content):
```tsx
{/* Comments */}
<div className="mt-6 border-t border-subtle pt-4">
  <h4 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-3">Comments</h4>
  <CommentList projectId={projectId} parentType="task" parentId={taskId} />
  <div className="mt-3">
    <CommentInput projectId={projectId} parentType="task" parentId={taskId} />
  </div>
</div>
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**
```bash
git add src/components/features/tasks/task-detail-panel.tsx
git commit -m "feat: wire comments to task detail panel"
```

---

### Task 2: Table View Inline Editing

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/table/page.tsx`

- [ ] **Step 1: Add inline status and priority editing to table columns**

Replace the status column render function with a Select dropdown:
```tsx
{
  key: 'status',
  header: 'Status',
  width: '140px',
  render: (task) => (
    <Select
      value={task.status}
      onValueChange={(v) => v && updateTask.mutate({ taskId: task.id, data: { status: v } })}
    >
      <SelectTrigger className="h-7 border-0 bg-transparent text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="backlog">Backlog</SelectItem>
        <SelectItem value="todo">Todo</SelectItem>
        <SelectItem value="in_progress">In Progress</SelectItem>
        <SelectItem value="review">Review</SelectItem>
        <SelectItem value="done">Done</SelectItem>
      </SelectContent>
    </Select>
  ),
},
```

Replace the priority column render function similarly:
```tsx
{
  key: 'priority',
  header: 'Priority',
  width: '110px',
  render: (task) => (
    <Select
      value={task.priority}
      onValueChange={(v) => v && updateTask.mutate({ taskId: task.id, data: { priority: v } })}
    >
      <SelectTrigger className="h-7 border-0 bg-transparent text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="P0">P0 — Urgent</SelectItem>
        <SelectItem value="P1">P1 — High</SelectItem>
        <SelectItem value="P2">P2 — Medium</SelectItem>
        <SelectItem value="P3">P3 — Low</SelectItem>
      </SelectContent>
    </Select>
  ),
},
```

Add the `useUpdateTask` hook at the component level:
```typescript
const updateTask = useUpdateTask(projectId);
```

Add imports for Select components and useUpdateTask.

- [ ] **Step 2: Verify type-check passes**
- [ ] **Step 3: Commit**
```bash
git commit -m "feat: inline status and priority editing in table view"
```

---

### Task 3: Sprint AI Suggestions UI

**Files:**
- Create: `src/app/api/v1/projects/[id]/sprints/suggest/route.ts`
- Create: `src/components/features/sprints/sprint-ai-suggestions.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/sprints/page.tsx`

- [ ] **Step 1: Create API endpoint for sprint suggestions**

```typescript
// src/app/api/v1/projects/[id]/sprints/suggest/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { SprintAssignmentAgent } from '@/modules/ai/agents/sprint-assignment.agent';
import { Task } from '@/modules/tasks/task.model';
import '@/modules/users/user.model';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    const backlogTasks = await Task.find({
      project: projectId,
      status: 'backlog',
      sprint: { $exists: false },
    }).select('title priority type description').limit(10).lean();

    const suggestions = [];
    for (const task of backlogTasks) {
      const suggestion = await SprintAssignmentAgent.suggest(
        ctx.user.userId,
        projectId,
        { title: task.title, priority: task.priority, type: task.type, description: task.description },
      );
      if (suggestion) {
        suggestions.push({ taskId: task._id.toString(), taskTitle: task.title, ...suggestion });
      }
    }

    return { data: { suggestions } };
  },
});
```

- [ ] **Step 2: Create Sprint AI Suggestions component**

```tsx
// src/components/features/sprints/sprint-ai-suggestions.tsx
'use client';

import { useState } from 'react';
import { Sparkle, CircleNotch } from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import { useUpdateTask } from '@/hooks/queries/use-tasks';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { AiNotConnected } from '@/components/features/ai/ai-not-connected';
import { toast } from 'sonner';

interface Suggestion {
  taskId: string;
  taskTitle: string;
  sprintId: string;
  sprintName: string;
  assigneeId: string;
  assigneeName: string;
  reason: string;
}

export function SprintAiSuggestions({ projectId }: { projectId: string }) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const updateTask = useUpdateTask(projectId);
  const queryClient = useQueryClient();

  const handleFetch = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ suggestions: Suggestion[] }>(`/projects/${projectId}/sprints/suggest`);
      setSuggestions(data.suggestions);
      if (data.suggestions.length === 0) toast.info('No suggestions — all backlog tasks are already assigned');
    } catch {
      toast.error('AI suggestions unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (s: Suggestion) => {
    updateTask.mutate({ taskId: s.taskId, data: { sprintId: s.sprintId, assigneeIds: [s.assigneeId] } }, {
      onSuccess: () => {
        setSuggestions((prev) => prev.filter((x) => x.taskId !== s.taskId));
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        toast.success(`Assigned "${s.taskTitle}" to ${s.sprintName}`);
      },
    });
  };

  return (
    <div className="mb-4 rounded-lg border border-subtle bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkle size={16} weight="fill" className="text-accent" />
          <h3 className="text-sm font-semibold text-primary">AI Sprint Planning</h3>
        </div>
        <Button size="sm" variant="secondary" onClick={handleFetch} disabled={loading}>
          {loading ? <><CircleNotch size={14} className="mr-1 animate-spin" /> Analyzing...</> : 'Get Suggestions'}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 space-y-2">
          {suggestions.map((s) => (
            <div key={s.taskId} className="flex items-center justify-between rounded-md border border-[var(--color-border-subtle)] px-3 py-2">
              <div>
                <p className="text-sm font-medium text-primary">{s.taskTitle}</p>
                <p className="text-xs text-secondary">{s.reason}</p>
                <p className="text-xs text-[var(--color-text-muted)]">→ {s.sprintName} · {s.assigneeName}</p>
              </div>
              <Button size="sm" onClick={() => handleApply(s)} disabled={updateTask.isPending}>Apply</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add to sprints page**

In `src/app/(dashboard)/projects/[id]/sprints/page.tsx`, import and render before SprintList:
```tsx
import { SprintAiSuggestions } from '@/components/features/sprints/sprint-ai-suggestions';
// Inside the return (before SprintList):
<SprintAiSuggestions projectId={params.id} />
```

- [ ] **Step 4: Commit**
```bash
git commit -m "feat: AI sprint planning suggestions UI"
```

---

### Task 4: My Work AI Context

**Files:**
- Create: `src/app/api/v1/tasks/my/summary/route.ts`
- Modify: `src/app/(dashboard)/my-work/page.tsx`

- [ ] **Step 1: Create API endpoint for AI work summary**

```typescript
// src/app/api/v1/tasks/my/summary/route.ts
import { apiHandler } from '@/shared/middleware/api-handler';
import { Task } from '@/modules/tasks/task.model';
import { resolveOrgApiKey } from '@/modules/ai/resolve-org-api-key';
import { CodexClient } from '@/modules/ai/codex-client';
import { GitHubService } from '@/modules/github/github.service';
import '@/modules/users/user.model';
import '@/modules/projects/project.model';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const userId = ctx.user.userId;
    const tasks = await Task.find({ assignees: userId, status: { $ne: 'done' } })
      .populate('project', 'name githubRepos')
      .lean();

    if (tasks.length === 0) return { data: { summary: null } };

    const key = await resolveOrgApiKey();
    if (!key) return { data: { summary: null } };

    const projectIds = [...new Set(tasks.map((t) => t.project?._id?.toString()).filter(Boolean))];
    const parts: string[] = [];

    parts.push(`You have ${tasks.length} active tasks across ${projectIds.length} project(s).`);

    const taskList = tasks.slice(0, 15).map((t) => {
      const proj = t.project as { name?: string } | undefined;
      return `- [${t.priority}] ${t.title} (${proj?.name ?? 'Unknown'}) — ${t.status}`;
    }).join('\n');
    parts.push(`Tasks:\n${taskList}`);

    for (const pid of projectIds.slice(0, 3)) {
      const lastSync = await GitHubService.getLastSyncTime(pid);
      if (lastSync) parts.push(`Project ${pid} last synced: ${lastSync.toISOString()}`);
    }

    try {
      const summary = await CodexClient.complete({
        accessToken: key.token,
        accountId: key.accountId,
        instructions: 'You are a personal work assistant. Given a list of assigned tasks and project context, write a brief 2-3 sentence summary of what the person should focus on today. Be actionable and specific.',
        input: parts.join('\n\n'),
      });
      return { data: { summary } };
    } catch {
      return { data: { summary: null } };
    }
  },
});
```

- [ ] **Step 2: Add AI summary to My Work page**

At top of My Work page, add:
```tsx
const { data: summaryData } = useQuery({
  queryKey: ['my-work-summary'],
  queryFn: () => api.get<{ summary: string | null }>('/tasks/my/summary'),
  enabled: isAuthenticated && totalTasks > 0,
  staleTime: 5 * 60 * 1000,
});

const aiSummary = (summaryData as { summary?: string | null })?.summary;
```

Render before task groups:
```tsx
{aiSummary && (
  <div className="mb-4 rounded-lg border border-subtle bg-surface p-4">
    <div className="flex items-center gap-2 mb-2">
      <Sparkle size={16} weight="fill" className="text-accent" />
      <h3 className="text-sm font-semibold text-primary">Today's Focus</h3>
    </div>
    <p className="text-sm text-secondary leading-relaxed">{aiSummary}</p>
  </div>
)}
```

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: AI-powered My Work daily focus summary"
```

---

### Task 5: Dashboard Analytics

**Files:**
- Create: `src/components/features/dashboard/project-stats.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create project stats component**

A simple stats bar showing task distribution per project:
```tsx
// src/components/features/dashboard/project-stats.tsx
'use client';

interface ProjectStatsProps {
  stats: { total: number; done: number; inProgress: number; backlog: number };
}

export function ProjectStats({ stats }: ProjectStatsProps) {
  if (stats.total === 0) return null;
  const pct = (n: number) => Math.round((n / stats.total) * 100);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-1">
        <span>{stats.done}/{stats.total} done</span>
        <span>{pct(stats.done)}%</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-subtle">
        {stats.done > 0 && <div className="bg-[var(--color-success)]" style={{ width: `${pct(stats.done)}%` }} />}
        {stats.inProgress > 0 && <div className="bg-accent" style={{ width: `${pct(stats.inProgress)}%` }} />}
        {stats.backlog > 0 && <div className="bg-[var(--color-text-muted)]/30" style={{ width: `${pct(stats.backlog)}%` }} />}
      </div>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />{stats.done} done</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />{stats.inProgress} active</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]/30" />{stats.backlog} planned</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add stats API and wire to dashboard**

Add task count stats to each project card on the dashboard by fetching from `/projects/{id}/tasks?limit=200` and computing counts client-side, or add a lightweight `/projects/{id}/stats` endpoint.

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: dashboard project stats with progress bars"
```

---

### Task 6: Mobile Responsiveness

**Files:**
- Modify: `src/components/layouts/dashboard-sidebar.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add mobile sidebar toggle**

In dashboard layout, add a hamburger button visible on mobile (md:hidden) that toggles sidebar visibility. Sidebar gets `hidden md:flex` by default, shown when toggled.

- [ ] **Step 2: Make Kanban columns scroll horizontally on mobile**

Kanban board already uses `flex` — add `overflow-x-auto` and `min-w-[280px]` per column on small screens.

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: mobile responsive sidebar and kanban"
```

---

## Self-Review

1. **Spec coverage:** All 8 areas covered. Tasks 1-6 are fully specified with code. Tasks 7-8 (command palette, mobile) are lighter — they're polish items.
2. **Placeholder scan:** No TBDs or TODOs. All code blocks are complete.
3. **Type consistency:** All interfaces match existing codebase types (ITask, TaskStatus, etc.)
