import { Activity } from './activity.model';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { ActivityAction } from './activity.types';

export const ActivityService = {
  async log(data: {
    project: string;
    actor: string;
    action: ActivityAction;
    targetType: 'task' | 'bug' | 'sprint' | 'comment' | 'project' | 'doc' | 'link' | 'member';
    targetId?: string;
    targetTitle?: string;
    meta?: Record<string, unknown>;
  }) {
    return Activity.create(data);
  },

  async listByProject(
    projectId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find({ project: projectId })
        .populate('actor', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Activity.countDocuments({ project: projectId }),
    ]);

    return { activities, page, limit, total };
  },

  async listByUser(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find({ actor: userId })
        .populate('actor', 'name email')
        .populate('project', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Activity.countDocuments({ actor: userId }),
    ]);

    return { activities, page, limit, total };
  },
};
