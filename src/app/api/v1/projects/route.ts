import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import {
  createProjectSchema,
  projectQuerySchema,
} from '@/modules/projects/project.validator';
import type { CreateProjectInput } from '@/modules/projects/project.validator';

export const GET = apiHandler({
  validate: { query: projectQuerySchema },
  handler: async (_req, ctx) => {
    const query = ctx.query as {
      page: number;
      limit: number;
      status?: string;
      search?: string;
    };
    const result = await ProjectService.list(query, ctx.user.userId, ctx.user.role);
    return {
      data: {
        projects: result.projects.map((p) => p.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: createProjectSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as CreateProjectInput;
    const project = await ProjectService.create(body, ctx.user.userId);
    return { data: project.toJSON(), status: 201 };
  },
});
