import { Sprint } from '@/modules/sprints/sprint.model';
import { Task } from '@/modules/tasks/task.model';
import { NotFoundError, ConflictError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { CreateSprintInput, UpdateSprintInput, CloseSprintInput, SprintTasksInput } from './sprint.validator';

export const SprintService = {
  async create(projectId: string, data: CreateSprintInput) {
    return Sprint.create({
      ...data,
      project: projectId,
    });
  },

  async list(
    projectId: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { project: projectId };
    if (query.status) filter.status = query.status;

    const [sprints, total] = await Promise.all([
      Sprint.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Sprint.countDocuments(filter),
    ]);

    return { sprints, page, limit, total };
  },

  async getById(id: string) {
    const sprint = await Sprint.findById(id);
    if (!sprint) throw new NotFoundError('Sprint');
    return sprint;
  },

  async update(id: string, data: UpdateSprintInput) {
    const sprint = await Sprint.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!sprint) throw new NotFoundError('Sprint');
    return sprint;
  },

  async activate(id: string, projectId: string) {
    const existing = await Sprint.findOne({ project: projectId, status: 'active' });
    if (existing && existing._id.toString() !== id) {
      throw new ConflictError('Project already has an active sprint');
    }

    const sprint = await Sprint.findByIdAndUpdate(
      id,
      { $set: { status: 'active' } },
      { returnDocument: 'after' },
    );
    if (!sprint) throw new NotFoundError('Sprint');
    return sprint;
  },

  async close(id: string, data: CloseSprintInput) {
    const sprint = await Sprint.findById(id);
    if (!sprint) throw new NotFoundError('Sprint');

    const totalTasks = await Task.countDocuments({ sprint: id });
    const completedTasks = await Task.countDocuments({ sprint: id, status: 'done' });

    const updateData: Record<string, unknown> = {
      status: 'closed',
      velocity: { planned: totalTasks, completed: completedTasks },
    };
    if (data.retroNotes) updateData.retroNotes = data.retroNotes;

    if (data.rolloverTaskIds && data.rolloverTaskIds.length > 0) {
      const nextSprint = await Sprint.findOne({
        project: sprint.project,
        status: 'planning',
      }).sort({ startDate: 1 });

      if (nextSprint) {
        await Task.updateMany(
          { _id: { $in: data.rolloverTaskIds } },
          { $set: { sprint: nextSprint._id } },
        );
      }
    }

    const closed = await Sprint.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after' },
    );
    return closed!;
  },

  async addTasks(sprintId: string, data: SprintTasksInput) {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) throw new NotFoundError('Sprint');

    await Task.updateMany(
      { _id: { $in: data.taskIds } },
      { $set: { sprint: sprintId } },
    );

    return { added: data.taskIds.length };
  },

  async removeTasks(sprintId: string, data: SprintTasksInput) {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) throw new NotFoundError('Sprint');

    await Task.updateMany(
      { _id: { $in: data.taskIds }, sprint: sprintId },
      { $unset: { sprint: 1 } },
    );

    return { removed: data.taskIds.length };
  },

  async getActiveSprint(projectId: string) {
    return Sprint.findOne({ project: projectId, status: 'active' });
  },

  async getTaskCountPerMember(sprintId: string) {
    const tasks = await Task.find({ sprint: sprintId, status: { $ne: 'done' } })
      .populate('assignee', 'name')
      .lean();

    const counts = new Map<string, { userId: string; name: string; count: number }>();
    for (const task of tasks) {
      const assignee = task.assignee as { _id: unknown; name: string } | null | undefined;
      if (!assignee) continue;
      const uid = String(assignee._id);
      const existing = counts.get(uid);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(uid, { userId: uid, name: assignee.name, count: 1 });
      }
    }

    return Array.from(counts.values());
  },

  async getVelocityHistory(projectId: string, limit = 10) {
    return Sprint.find({ project: projectId, status: 'closed' })
      .select('name velocity startDate endDate')
      .sort({ endDate: -1 })
      .limit(limit)
      .lean();
  },
};
