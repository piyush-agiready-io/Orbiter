import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { SprintAssignmentAgent } from '@/modules/ai/agents/sprint-assignment.agent';
import { Task } from '@/modules/tasks/task.model';
import '@/modules/users/user.model';
import '@/modules/sprints/sprint.model';
import '@/modules/projects/project.model';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    await checkProjectAccess(projectId, ctx.user.userId, ctx.user.role);

    const backlogTasks = await Task.find({
      project: projectId,
      status: 'backlog',
      sprint: { $exists: false },
    })
      .select('title priority type description')
      .limit(10)
      .lean();

    const suggestions = [];
    for (const task of backlogTasks) {
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
        if (suggestion) {
          suggestions.push({
            taskId: task._id.toString(),
            taskTitle: task.title,
            ...suggestion,
          });
        }
      } catch {
        // Skip tasks where suggestion fails
      }
    }

    return { data: { suggestions } };
  },
});
