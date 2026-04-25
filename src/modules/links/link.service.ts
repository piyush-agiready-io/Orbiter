import { Link } from '@/modules/links/link.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { CreateLinkInput, UpdateLinkInput } from './link.validator';

export const LinkService = {
  async create(projectId: string, data: CreateLinkInput) {
    const link = await Link.create({ ...data, project: projectId });
    return link;
  },

  async list(
    projectId: string,
    query: { page?: number; limit?: number; type?: string },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { project: projectId };
    if (query.type) {
      filter.type = query.type;
    }

    const [links, total] = await Promise.all([
      Link.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Link.countDocuments(filter),
    ]);

    return { links, page, limit, total };
  },

  async getById(id: string) {
    const link = await Link.findById(id);
    if (!link) {
      throw new NotFoundError('Link');
    }
    return link;
  },

  async update(id: string, data: UpdateLinkInput) {
    const link = await Link.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!link) {
      throw new NotFoundError('Link');
    }
    return link;
  },

  async delete(id: string) {
    const link = await Link.findByIdAndDelete(id);
    if (!link) {
      throw new NotFoundError('Link');
    }
    return link;
  },
};
