import { apiHandler } from '@/shared/middleware/api-handler';
import { Task } from '@/modules/tasks/task.model';
import '@/modules/projects/project.model';

interface ProjectTaskStats {
  projectId: string;
  taskCount: number;
  doneCount: number;
  activeCount: number;
}

export const GET = apiHandler({
  handler: async () => {
    const stats = await Task.aggregate<{
      _id: string;
      taskCount: number;
      doneCount: number;
      activeCount: number;
    }>([
      {
        $group: {
          _id: { $toString: '$project' },
          taskCount: { $sum: 1 },
          doneCount: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          activeCount: {
            $sum: { $cond: [{ $in: ['$status', ['in_progress', 'review']] }, 1, 0] },
          },
        },
      },
    ]);

    const byProject: Record<string, ProjectTaskStats> = {};
    for (const s of stats) {
      byProject[s._id] = {
        projectId: s._id,
        taskCount: s.taskCount,
        doneCount: s.doneCount,
        activeCount: s.activeCount,
      };
    }

    return { data: byProject };
  },
});
