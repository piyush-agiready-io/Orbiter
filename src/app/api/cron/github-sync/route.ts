import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/shared/database/connection';
import { GitHubSyncAgent } from '@/modules/ai/agents/github-sync.agent';
import { User } from '@/modules/users/user.model';
import { decrypt } from '@/shared/lib/encryption';
import { env } from '@/config/env';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = req.headers.get('authorization');
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    await connectDB();

    // Lazy-import to avoid loading all models at cold start
    const { Project } = await import('@/modules/projects/project.model');

    // Find all projects with connected GitHub repos
    const projects = await Project.find({
      'githubRepos.0': { $exists: true },
      status: 'active',
    })
      .select('_id owner githubRepos')
      .lean();

    const results = [];

    for (const project of projects) {
      try {
        const ownerId = project.owner.toString();

        // Resolve the project owner's GitHub OAuth token
        const owner = await User.findById(ownerId).select('+githubOAuth').lean();
        if (!owner?.githubOAuth?.accessToken) {
          results.push({
            projectId: project._id.toString(),
            skipped: true,
            reason: 'No GitHub token for project owner',
          });
          continue;
        }

        // Decrypt the stored token (format: iv:authTag:encrypted)
        const [iv, authTag, encrypted] = owner.githubOAuth.accessToken.split(':');
        const githubToken = decrypt(encrypted, iv, authTag);

        const result = await GitHubSyncAgent.syncProject(
          project._id.toString(),
          project.githubRepos,
          githubToken,
          ownerId,
        );
        results.push(result);
      } catch (error) {
        console.error(`Sync failed for project ${project._id}:`, error);
        results.push({
          projectId: project._id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        projectsProcessed: projects.length,
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('GitHub sync cron failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Sync cron failed', code: 'INTERNAL_ERROR' },
      },
      { status: 500 },
    );
  }
}
