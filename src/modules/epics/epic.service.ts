import { Epic } from '@/modules/epics/epic.model';
import { Task } from '@/modules/tasks/task.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import { escapeRegExp } from '@/shared/utils/escape-regex';
import type { CreateEpicInput, UpdateEpicInput } from './epic.validator';
// Register User model for .populate('owner').
import '@/modules/users/user.model';

export const EpicService = {
  async create(projectId: string, data: CreateEpicInput, userId: string) {
    const { ownerId, ...rest } = data;
    const epic = await Epic.create({
      ...rest,
      project: projectId,
      owner: ownerId || userId,
    });
    return epic;
  },

  async list(
    projectId: string,
    query: {
      page?: number; limit?: number; status?: string;
      search?: string; sort?: string;
    },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { project: projectId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.title = { $regex: escapeRegExp(query.search), $options: 'i' };
    }

    const sortField = query.sort ?? '-createdAt';
    const sortDir = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: Record<string, 1 | -1> = { [sortKey]: sortDir };

    const [epics, total] = await Promise.all([
      Epic.find(filter)
        .populate('owner', 'name email avatar')
        .skip(skip)
        .limit(limit)
        .sort(sortObj),
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
    const { ownerId, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (ownerId !== undefined) updateData.owner = ownerId;

    const epic = await Epic.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true },
    );
    if (!epic) throw new NotFoundError('Epic');
    return epic;
  },

  async delete(id: string) {
    const epic = await Epic.findByIdAndDelete(id);
    if (!epic) throw new NotFoundError('Epic');
    await Task.updateMany({ epic: id }, { $unset: { epic: 1 } });
    return epic;
  },

  async calculateProgress(epicId: string) {
    const [total, done] = await Promise.all([
      Task.countDocuments({ epic: epicId }),
      Task.countDocuments({ epic: epicId, status: 'done' }),
    ]);
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    const epic = await Epic.findByIdAndUpdate(
      epicId,
      { $set: { progress } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!epic) throw new NotFoundError('Epic');
    return epic;
  },

  async getByProject(projectId: string) {
    return Epic.find({ project: projectId })
      .populate('owner', 'name email avatar')
      .sort({ startDate: 1, createdAt: 1 });
  },
};
