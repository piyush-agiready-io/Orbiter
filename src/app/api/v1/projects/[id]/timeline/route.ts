import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { Sprint } from '@/modules/sprints/sprint.model';
import { Epic } from '@/modules/epics/epic.model';
import { Task } from '@/modules/tasks/task.model';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const projectId = ctx.params.id;
    await checkProjectAccess(projectId, ctx.user.userId, ctx.user.role);

    const [sprints, epics] = await Promise.all([
      Sprint.find({ project: projectId })
        .sort({ startDate: 1 })
        .lean(),
      Epic.find({
        project: projectId,
        startDate: { $exists: true, $ne: null },
        endDate: { $exists: true, $ne: null },
      })
        .sort({ startDate: 1 })
        .lean(),
    ]);

    const sprintIds = sprints.map((s) => s._id);
    const taskAgg = sprintIds.length
      ? await Task.aggregate<{ _id: string; total: number; done: number }>([
          { $match: { sprint: { $in: sprintIds } } },
          {
            $group: {
              _id: '$sprint',
              total: { $sum: 1 },
              done: {
                $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] },
              },
            },
          },
        ])
      : [];
    const sprintStats = new Map(
      taskAgg.map((row) => [String(row._id), { total: row.total, done: row.done }]),
    );

    return {
      data: {
        sprints: sprints.map((s) => {
          const stats = sprintStats.get(String(s._id)) ?? { total: 0, done: 0 };
          // Closed sprints retain their captured velocity even if tasks moved out later
          const total =
            s.status === 'closed' && s.velocity?.planned
              ? s.velocity.planned
              : stats.total;
          const done =
            s.status === 'closed' && typeof s.velocity?.completed === 'number'
              ? s.velocity.completed
              : stats.done;
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;
          return {
            id: String(s._id),
            name: s.name,
            startDate: s.startDate,
            endDate: s.endDate,
            status: s.status,
            total,
            done,
            progress,
          };
        }),
        epics: epics.map((e) => ({
          id: String(e._id),
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          status: e.status,
          progress: e.progress ?? 0,
        })),
      },
    };
  },
});
