import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/shared/database/connection';
import { GitHubSyncAgent } from '@/modules/ai/agents/github-sync.agent';
import { decrypt } from '@/shared/lib/encryption';
import { env } from '@/config/env';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    await connectDB();

    const { Project } = await import('@/modules/projects/project.model');

    const projects = await Project.find({
      'githubRepos.0': { $exists: true },
      githubOAuth: { $exists: true },
      status: 'active',
    })
      .select('+githubOAuth _id owner githubRepos')
      .lean();

    const results = [];

    for (const project of projects) {
      try {
        if (!project.githubOAuth?.accessToken) {
          results.push({
            projectId: project._id.toString(),
            skipped: true,
            reason: 'No GitHub token on project',
          });
          continue;
        }

        const [iv, authTag, encrypted] = project.githubOAuth.accessToken.split(':');
        const githubToken = decrypt(encrypted, iv, authTag);

        const result = await GitHubSyncAgent.syncProject(
          project._id.toString(),
          project.githubRepos,
          githubToken,
          project.owner.toString(),
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
      { success: false, error: { message: 'Sync cron failed', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
