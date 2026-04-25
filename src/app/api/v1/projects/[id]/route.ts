import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import '@/modules/users/user.model';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { updateProjectSchema } from '@/modules/projects/project.validator';
import type { UpdateProjectInput } from '@/modules/projects/project.validator';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const project = await ProjectService.getById(ctx.params.id);
    return { data: project.toJSON() };
  },
});

export const DELETE = apiHandler({
  middleware: [requireRole('admin')],
  handler: async (_req, ctx) => {
    await ProjectService.delete(ctx.params.id);
    return { data: { deleted: true } };
  },
});

export const PATCH = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: updateProjectSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as UpdateProjectInput;
    const project = await ProjectService.update(ctx.params.id, body);
    return { data: project.toJSON() };
  },
});
