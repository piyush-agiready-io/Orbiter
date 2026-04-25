import { apiHandler } from '@/shared/middleware/api-handler';
import { GitHubService } from '@/modules/github/github.service';
import { Project } from '@/modules/projects/project.model';
import { decrypt } from '@/shared/lib/encryption';
import { z } from 'zod';

const querySchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export const GET = apiHandler({
  validate: { query: querySchema },
  handler: async (_req, ctx) => {
    const { owner, repo } = ctx.query as z.infer<typeof querySchema>;
    const project = await Project.findById(ctx.params.id)
      .select('+githubOAuth')
      .lean();

    if (!project?.githubOAuth?.accessToken) {
      return { data: { readme: null } };
    }

    const [iv, authTag, encrypted] = project.githubOAuth.accessToken.split(':');
    const token = decrypt(encrypted, iv, authTag);

    const readme = await GitHubService.fetchReadme(owner, repo, token);
    return { data: { readme } };
  },
});
