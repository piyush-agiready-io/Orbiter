import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { ProjectService } from '@/modules/projects/project.service';
import { TaskService } from '@/modules/tasks/task.service';
import { BugService } from '@/modules/bugs/bug.service';
import { Sprint } from '@/modules/sprints/sprint.model';
import { Activity } from '@/modules/activity/activity.model';
import { Task } from '@/modules/tasks/task.model';
import '@/modules/users/user.model';

const CLIENT_VISIBLE_ACTIONS = [
  'task_status_changed',
  'sprint_started',
  'sprint_closed',
  'bug_status_changed',
] as const;

interface SprintLikeDoc {
  _id: unknown;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'closed';
}

async function pickHighlightSprint(
  projectId: string,
): Promise<SprintLikeDoc | null> {
  // 1. Active sprint takes priority.
  const active = await Sprint.findOne({
    project: projectId,
    status: 'active',
  }).lean<SprintLikeDoc | null>();
  if (active) return active;

  // 2. Otherwise, the next upcoming planning sprint (closest start date).
  const upcoming = await Sprint.findOne({
    project: projectId,
    status: 'planning',
  })
    .sort({ startDate: 1 })
    .lean<SprintLikeDoc | null>();
  if (upcoming) return upcoming;

  // 3. Fall back to the most recently closed sprint so the card has something.
  const lastClosed = await Sprint.findOne({
    project: projectId,
    status: 'closed',
  })
    .sort({ endDate: -1 })
    .lean<SprintLikeDoc | null>();
  return lastClosed;
}

export const GET = apiHandler({
  middleware: [requireRole('client')],
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    await ProjectService.requireClientAccess(projectId, ctx.user.userId);

    // Each section is independent — a failure in one shouldn't take the page down.
    const [progressResult, sprintResult, bugsResult, activityResult] =
      await Promise.allSettled([
        TaskService.getClientProjectProgress(projectId),
        pickHighlightSprint(projectId),
        BugService.countOpenByReporter(projectId, ctx.user.userId),
        Activity.find({
          project: projectId,
          action: { $in: CLIENT_VISIBLE_ACTIONS },
        })
          .populate('actor', 'name')
          .sort({ createdAt: -1 })
          .limit(8)
          .lean(),
      ]);

    const progress =
      progressResult.status === 'fulfilled'
        ? progressResult.value
        : { total: 0, done: 0, inProgress: 0, backlog: 0, percentage: 0 };

    const sprint =
      sprintResult.status === 'fulfilled' ? sprintResult.value : null;

    let sprintProgress: {
      total: number;
      done: number;
      percentage: number;
    } | null = null;
    if (sprint) {
      try {
        const [total, done] = await Promise.all([
          Task.countDocuments({
            project: projectId,
            sprint: sprint._id,
            clientVisible: true,
          }),
          Task.countDocuments({
            project: projectId,
            sprint: sprint._id,
            clientVisible: true,
            status: 'done',
          }),
        ]);
        sprintProgress = {
          total,
          done,
          percentage: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      } catch (err) {
        console.error('Portal: sprint progress count failed', err);
      }
    }

    const openBugCount =
      bugsResult.status === 'fulfilled' ? bugsResult.value : 0;

    const recentActivities =
      activityResult.status === 'fulfilled' ? activityResult.value : [];

    if (progressResult.status === 'rejected')
      console.error('Portal: getClientProjectProgress failed', progressResult.reason);
    if (sprintResult.status === 'rejected')
      console.error('Portal: pickHighlightSprint failed', sprintResult.reason);
    if (bugsResult.status === 'rejected')
      console.error('Portal: countOpenByReporter failed', bugsResult.reason);
    if (activityResult.status === 'rejected')
      console.error('Portal: activity find failed', activityResult.reason);

    return {
      data: {
        progress,
        activeSprint: sprint
          ? {
              id: String(sprint._id),
              name: sprint.name,
              goal: sprint.goal,
              startDate: sprint.startDate,
              endDate: sprint.endDate,
              status: sprint.status,
              progress: sprintProgress,
            }
          : null,
        bugs: { open: openBugCount },
        recentActivity: recentActivities.map((a) => ({
          id: String(a._id),
          action: a.action,
          actorName:
            (a.actor as unknown as { name?: string } | null)?.name ?? 'Someone',
          targetTitle: a.targetTitle,
          targetType: a.targetType,
          meta: a.meta,
          createdAt: a.createdAt,
        })),
      },
    };
  },
});
