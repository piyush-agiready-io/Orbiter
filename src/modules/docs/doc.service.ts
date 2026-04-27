import { Doc } from '@/modules/docs/doc.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { CreateDocInput, UpdateDocInput } from './doc.validator';
// Register User model for .populate('author').
import '@/modules/users/user.model';

export const DocService = {
  async create(projectId: string, data: CreateDocInput, userId: string) {
    const doc = await Doc.create({
      ...data,
      project: projectId,
      author: userId,
    });
    return doc;
  },

  async list(
    projectId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter = { project: projectId };

    const [docs, total] = await Promise.all([
      Doc.find(filter)
        .select('-content.content')
        .populate('author', 'name email avatar')
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 }),
      Doc.countDocuments(filter),
    ]);

    return { docs, page, limit, total };
  },

  async search(
    projectId: string,
    query: { q: string; page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter = {
      project: projectId,
      $text: { $search: query.q },
    };

    const [docs, total] = await Promise.all([
      Doc.find(filter, { score: { $meta: 'textScore' } })
        .select('-content.content')
        .populate('author', 'name email avatar')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit),
      Doc.countDocuments(filter),
    ]);

    return { docs, page, limit, total };
  },

  async getById(id: string) {
    const doc = await Doc.findById(id)
      .populate('author', 'name email avatar');
    if (!doc) {
      throw new NotFoundError('Doc');
    }
    return doc;
  },

  async update(id: string, data: UpdateDocInput) {
    const doc = await Doc.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!doc) {
      throw new NotFoundError('Doc');
    }
    return doc;
  },

  async delete(id: string) {
    const doc = await Doc.findByIdAndDelete(id);
    if (!doc) {
      throw new NotFoundError('Doc');
    }
    return doc;
  },
};
