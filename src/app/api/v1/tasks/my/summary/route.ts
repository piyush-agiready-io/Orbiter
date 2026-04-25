import { apiHandler } from '@/shared/middleware/api-handler';
import { Task } from '@/modules/tasks/task.model';
import { resolveOrgApiKey } from '@/modules/ai/resolve-org-api-key';
import { CodexClient } from '@/modules/ai/codex-client';
import '@/modules/users/user.model';
import '@/modules/projects/project.model';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const tasks = await Task.find({ assignees: ctx.user.userId, status: { $ne: 'done' } })
      .populate('project', 'name')
      .lean();

    if (tasks.length === 0) return { data: { summary: null } };

    const key = await resolveOrgApiKey();
    if (!key) return { data: { summary: null } };

    const taskList = tasks.slice(0, 15).map((t) => {
      const proj = t.project as { name?: string } | undefined;
      return `- [${t.priority}] ${t.title} (${proj?.name ?? 'Unknown'}) - ${t.status}`;
    }).join('\n');

    try {
      const summary = await CodexClient.complete({
        accessToken: key.token,
        accountId: key.accountId,
        instructions: 'You are a personal work assistant. Given assigned tasks, write a brief 2-3 sentence summary of what to focus on today. Be actionable and specific. No bullet points.',
        input: `Active tasks:\n${taskList}`,
      });
      return { data: { summary } };
    } catch {
      return { data: { summary: null } };
    }
  },
});
