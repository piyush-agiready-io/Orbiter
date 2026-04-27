import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { TaskService } from '@/modules/tasks/task.service';
import { BugService } from '@/modules/bugs/bug.service';
import { SprintService } from '@/modules/sprints/sprint.service';
import { Activity } from '@/modules/activity/activity.model';
import { Task } from '@/modules/tasks/task.model';
import '@/modules/users/user.model';

const CLIENT_VISIBLE_ACTIONS = [
  'task_status_changed',
  'sprint_started',
  'sprint_closed',
  'bug_status_changed',
] as const;

export const GET = apiHandler({
  middleware: [requireRole('client')],
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    await ProjectService.requireClientAccess(projectId, ctx.user.userId);

    const progress = await TaskService.getClientProjectProgress(projectId);
    const activeSprint = await SprintService.getActiveSprint(projectId);
    const openBugCount = await BugService.countOpenByReporter(projectId, ctx.user.userId);

    let sprintProgress: {
      total: number;
      done: number;
      percentage: number;
    } | null = null;
    if (activeSprint) {
      const [total, done] = await Promise.all([
        Task.countDocuments({
          project: projectId,
          sprint: activeSprint._id,
          clientVisible: true,
        }),
        Task.countDocuments({
          project: projectId,
          sprint: activeSprint._id,
          clientVisible: true,
          status: 'done',
        }),
      ]);
      sprintProgress = {
        total,
        done,
        percentage: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }

    const recentActivities = await Activity.find({
      project: projectId,
      action: { $in: CLIENT_VISIBLE_ACTIONS },
    })
      .populate('actor', 'name')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return {
      data: {
        progress,
        activeSprint: activeSprint
          ? {
              id: activeSprint._id.toString(),
              name: activeSprint.name,
              goal: activeSprint.goal,
              startDate: activeSprint.startDate,
              endDate: activeSprint.endDate,
              progress: sprintProgress,
            }
          : null,
        bugs: { open: openBugCount },
        recentActivity: recentActivities.map((a) => ({
          id: String(a._id),
          action: a.action,
          actorName: (a.actor as unknown as { name?: string } | null)?.name ?? 'Someone',
          targetTitle: a.targetTitle,
          targetType: a.targetType,
          meta: a.meta,
          createdAt: a.createdAt,
        })),
      },
    };
  },
});
