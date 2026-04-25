import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { Project } from '@/modules/projects/project.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { z } from 'zod';

const schema = z.object({
  fromProjectId: z.string().min(1),
});

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  validate: { body: schema },
  handler: async (_req, ctx) => {
    const { fromProjectId } = ctx.body as z.infer<typeof schema>;

    const source = await Project.findById(fromProjectId).select('+githubOAuth').lean();
    if (!source?.githubOAuth) {
      throw new NotFoundError('Source project has no GitHub connection');
    }

    await Project.findByIdAndUpdate(ctx.params.id, {
      githubOAuth: source.githubOAuth,
    });

    return { data: { copied: true, username: source.githubOAuth.username } };
  },
});
