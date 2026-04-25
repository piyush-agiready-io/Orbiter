import { Epic } from '@/modules/epics/epic.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import { escapeRegExp } from '@/shared/utils/escape-regex';
import type { CreateEpicInput, UpdateEpicInput } from './epic.validator';

export const EpicService = {
  async create(projectId: string, data: CreateEpicInput, userId: string) {
    return Epic.create({
      ...data,
      project: projectId,
      owner: userId,
    });
  },

  async list(
    projectId: string,
    query: { page?: number; limit?: number; status?: string; search?: string },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { project: projectId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.title = { $regex: escapeRegExp(query.search), $options: 'i' };
    }

    const [epics, total] = await Promise.all([
      Epic.find(filter)
        .populate('owner', 'name email avatar')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Epic.countDocuments(filter),
    ]);

    return { epics, page, limit, total };
  },

  async getById(id: string) {
    const epic = await Epic.findById(id)
      .populate('owner', 'name email avatar');
    if (!epic) throw new NotFoundError('Epic');
    return epic;
  },

  async update(id: string, data: UpdateEpicInput) {
    const epic = await Epic.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!epic) throw new NotFoundError('Epic');
    return epic;
  },

  async delete(id: string) {
    const epic = await Epic.findByIdAndDelete(id);
    if (!epic) throw new NotFoundError('Epic');
    return epic;
  },

  async computeProgress(epicId: string): Promise<number> {
    const { Task } = await import('@/modules/tasks/task.model');
    const total = await Task.countDocuments({ epic: epicId });
    if (total === 0) return 0;
    const done = await Task.countDocuments({ epic: epicId, status: 'done' });
    return Math.round((done / total) * 100);
  },
};
