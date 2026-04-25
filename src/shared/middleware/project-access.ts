import { ForbiddenError } from './role-guard';

export async function checkProjectAccess(
  projectId: string,
  userId: string,
  role: string,
): Promise<void> {
  const { ProjectService } = await import('@/modules/projects/project.service');
  const hasAccess = await ProjectService.checkAccess(projectId, userId, role as 'admin' | 'internal' | 'client');
  if (!hasAccess) {
    throw new ForbiddenError('You do not have access to this project');
  }
}
