import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { SprintAssignmentAgent } from '@/modules/ai/agents/sprint-assignment.agent';
import { resolveOrgApiKey } from '@/modules/ai/resolve-org-api-key';
import { SprintService } from '@/modules/sprints/sprint.service';
import { Task } from '@/modules/tasks/task.model';
import '@/modules/users/user.model';
import '@/modules/sprints/sprint.model';
import '@/modules/projects/project.model';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    await checkProjectAccess(projectId, ctx.user.userId, ctx.user.role);

    // Surface specific reasons up front so the UI can explain why no
    // suggestions came back. Without these, an empty response was
    // ambiguous ("no backlog? no sprint? no AI key?") and the user got
    // a generic "no suggestions" message.
    const key = await resolveOrgApiKey();
    if (!key) {
      return {
        data: {
          suggestions: [],
          aiNotConnected: true,
          reason: 'Connect ChatGPT in settings to use AI sprint suggestions.',
        },
      };
    }

    const activeSprint = await SprintService.getActiveSprint(projectId);
    if (!activeSprint) {
      return {
        data: {
          suggestions: [],
          reason: 'No active sprint. Start a sprint to get AI suggestions.',
        },
      };
    }

    const backlogTasks = await Task.find({
      project: projectId,
      status: 'backlog',
      sprint: { $exists: false },
    })
      .select('title priority type description')
      .limit(10)
      .lean();

    if (backlogTasks.length === 0) {
      return {
        data: {
          suggestions: [],
          reason: 'No backlog tasks to plan. Add tasks to your backlog first.',
        },
      };
    }

    // Parallel calls — sequential 10-task loop was hitting Vercel's
    // function timeout once per-task latency added up.
    const results = await Promise.all(
      backlogTasks.map(async (task) => {
        try {
          const suggestion = await SprintAssignmentAgent.suggest(
            ctx.user.userId,
            projectId,
            {
              title: task.title,
              priority: task.priority as string,
              type: task.type as string,
              description: task.description,
            },
          );
          if (!suggestion) return null;
          return {
            taskId: task._id.toString(),
            taskTitle: task.title,
            ...suggestion,
          };
        } catch {
          return null;
        }
      }),
    );

    const suggestions = results.filter((s): s is NonNullable<typeof s> => s !== null);

    return {
      data: {
        suggestions,
        reason:
          suggestions.length === 0
            ? 'AI could not produce confident suggestions for the current backlog.'
            : undefined,
      },
    };
  },
});
