import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { GitHubService } from '@/modules/github/github.service';
import { Project } from '@/modules/projects/project.model';
import '@/modules/users/user.model';
import { decrypt } from '@/shared/lib/encryption';
import { resolveOrgApiKey } from '@/modules/ai/resolve-org-api-key';
import { CodexClient } from '@/modules/ai/codex-client';

const DESCRIPTION_INSTRUCTIONS = `You are writing a single-sentence description for a project shown on a project management dashboard. You will receive the GitHub README of the project's primary repository. Output one plain sentence (max 25 words) describing what the project does and who it is for. Do not start with the project name. No markdown, no quotes, no preamble. Just the sentence.`;

export const POST = apiHandler({
  middleware: [requireRole('admin', 'internal')],
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);

    const project = await Project.findById(ctx.params.id)
      .select('+githubOAuth githubRepos')
      .lean();

    if (!project) {
      return { data: { description: null, reason: 'project_not_found' } };
    }
    if (!project.githubOAuth?.accessToken) {
      return { data: { description: null, reason: 'github_not_connected' } };
    }
    const firstRepo = project.githubRepos?.[0];
    if (!firstRepo) {
      return { data: { description: null, reason: 'no_repo' } };
    }

    const [iv, authTag, encrypted] = project.githubOAuth.accessToken.split(':');
    const token = decrypt(encrypted, iv, authTag);

    const readme = await GitHubService.fetchReadme(firstRepo.owner, firstRepo.repo, token);
    if (!readme || readme.trim().length < 50) {
      return { data: { description: null, reason: 'no_readme' } };
    }

    const key = await resolveOrgApiKey();
    if (!key) {
      return { data: { description: null, reason: 'no_ai_key' } };
    }

    try {
      const raw = await CodexClient.complete({
        accessToken: key.token,
        accountId: key.accountId,
        instructions: DESCRIPTION_INSTRUCTIONS,
        input: `README of ${firstRepo.owner}/${firstRepo.repo}:\n\n${readme.slice(0, 2500)}`,
      });
      const cleaned = raw.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim();
      if (!cleaned) {
        return { data: { description: null, reason: 'ai_empty' } };
      }
      return { data: { description: cleaned } };
    } catch (error) {
      console.error('Failed to generate project description:', error);
      return { data: { description: null, reason: 'ai_failed' } };
    }
  },
});
