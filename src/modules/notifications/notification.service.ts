import { Notification } from '@/modules/notifications/notification.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { NotificationType } from './notification.types';

export const NotificationService = {
  async create(data: {
    user: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    return Notification.create(data);
  },

  async list(userId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter = { user: userId };

    const [notifications, total] = await Promise.all([
      Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Notification.countDocuments(filter),
    ]);

    return { notifications, page, limit, total };
  },

  async getUnreadCount(userId: string) {
    const count = await Notification.countDocuments({ user: userId, read: false });
    return { count };
  },

  async markAsRead(id: string, userId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { read: true } },
      { returnDocument: 'after' },
    );
    if (!notification) {
      throw new NotFoundError('Notification');
    }
    return notification;
  },

  async markAllRead(userId: string) {
    return Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } },
    );
  },

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    return this.create({ user: userId, type, title, message, link });
  },

  async notifyProjectMembers(
    projectId: string,
    excludeUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ) {
    const { Project } = await import('@/modules/projects/project.model');
    const project = await Project.findById(projectId);
    if (!project) return;

    const memberIds = project.members
      .map((m: { toString(): string }) => m.toString())
      .filter((id: string) => id !== excludeUserId);

    await Promise.all(
      memberIds.map((userId: string) =>
        this.notify(userId, type, title, message, link),
      ),
    );
  },
};
