jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: jest.fn() },
}), { virtual: true });

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createNotification } from '../../../helpers/factory';
import { NotificationService } from '@/modules/notifications/notification.service';

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('NotificationService', () => {
  describe('create', () => {
    it('creates a notification with required fields', async () => {
      const user = await createUser();
      const notification = await NotificationService.create({
        user: user._id.toString(),
        type: 'bug_created',
        title: 'New bug',
        message: 'A bug was reported',
      });
      expect(notification.title).toBe('New bug');
      expect(notification.read).toBe(false);
      expect(notification.emailSent).toBe(false);
    });
  });

  describe('list', () => {
    it('returns paginated notifications for a user sorted by newest first', async () => {
      const user = await createUser();
      const other = await createUser();
      await createNotification(user._id.toString(), { title: 'First' });
      await createNotification(user._id.toString(), { title: 'Second' });
      await createNotification(other._id.toString(), { title: 'Other user' });

      const result = await NotificationService.list(user._id.toString(), { page: 1, limit: 10 });
      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.notifications[0].title).toBe('Second');
    });
  });

  describe('getUnreadCount', () => {
    it('returns count of unread notifications', async () => {
      const user = await createUser();
      await createNotification(user._id.toString(), { read: false });
      await createNotification(user._id.toString(), { read: false });
      await createNotification(user._id.toString(), { read: true });

      const result = await NotificationService.getUnreadCount(user._id.toString());
      expect(result.count).toBe(2);
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      const user = await createUser();
      const notification = await createNotification(user._id.toString());
      const updated = await NotificationService.markAsRead(
        notification._id.toString(),
        user._id.toString(),
      );
      expect(updated.read).toBe(true);
    });

    it('throws NotFoundError if notification does not belong to user', async () => {
      const user = await createUser();
      const other = await createUser();
      const notification = await createNotification(other._id.toString());
      await expect(
        NotificationService.markAsRead(notification._id.toString(), user._id.toString()),
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('markAllRead', () => {
    it('marks all unread notifications as read for user', async () => {
      const user = await createUser();
      await createNotification(user._id.toString(), { read: false });
      await createNotification(user._id.toString(), { read: false });

      const result = await NotificationService.markAllRead(user._id.toString());
      expect(result.modifiedCount).toBe(2);
    });
  });

  describe('notify', () => {
    it('creates a notification with the convenience method', async () => {
      const user = await createUser();
      const notification = await NotificationService.notify(
        user._id.toString(),
        'task_assigned',
        'Task assigned',
        'You were assigned a task',
        '/projects/123/tasks',
      );
      expect(notification.type).toBe('task_assigned');
      expect(notification.link).toBe('/projects/123/tasks');
    });
  });

  describe('notifyProjectMembers', () => {
    it('notifies all project members except the actor', async () => {
      const owner = await createUser();
      const member = await createUser();
      const project = await createProject(owner._id.toString(), {
        members: [owner._id.toString(), member._id.toString()],
      });

      await NotificationService.notifyProjectMembers(
        project._id.toString(),
        owner._id.toString(),
        'bug_created',
        'New bug',
        'A bug was created',
        '/projects/' + project._id.toString() + '/bugs',
      );

      const ownerNotifs = await NotificationService.list(owner._id.toString(), { page: 1, limit: 10 });
      const memberNotifs = await NotificationService.list(member._id.toString(), { page: 1, limit: 10 });
      expect(ownerNotifs.notifications).toHaveLength(0);
      expect(memberNotifs.notifications).toHaveLength(1);
    });
  });
});
