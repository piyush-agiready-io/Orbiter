import { z } from 'zod';
import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { TaskService } from '@/modules/tasks/task.service';

const reorderSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  order: z.number().int().min(0),
});

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: reorderSchema },
  handler: async (_req, ctx) => {
    const task = await TaskService.getById(ctx.params.id);
    await checkProjectAccess(task.project.toString(), ctx.user.userId, ctx.user.role);
    const body = ctx.body as z.infer<typeof reorderSchema>;
    const updated = await TaskService.reorderTask(ctx.params.id, body);
    return { data: updated.toJSON() };
  },
});
