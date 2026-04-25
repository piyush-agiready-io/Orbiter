import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject } from '../../../helpers/factory';
import { ActivityService } from '@/modules/activity/activity.service';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'test',
  },
}));

let userId: string;
let projectId: string;

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
beforeEach(async () => {
  await clearCollections();
  const user = await createUser();
  userId = user._id.toString();
  const project = await createProject(userId);
  projectId = project._id.toString();
});

describe('ActivityService', () => {
  describe('log', () => {
    it('creates an activity entry', async () => {
      const activity = await ActivityService.log({
        project: projectId,
        actor: userId,
        action: 'task_created',
        targetType: 'task',
        targetTitle: 'Login Page',
      });
      expect(activity.action).toBe('task_created');
      expect(activity.targetTitle).toBe('Login Page');
      expect(activity.project.toString()).toBe(projectId);
    });
  });

  describe('listByProject', () => {
    it('returns paginated activities for a project', async () => {
      await ActivityService.log({ project: projectId, actor: userId, action: 'task_created', targetType: 'task', targetTitle: 'T1' });
      await ActivityService.log({ project: projectId, actor: userId, action: 'bug_created', targetType: 'bug', targetTitle: 'B1' });

      const result = await ActivityService.listByProject(projectId, {});
      expect(result.activities).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('returns activities in reverse chronological order', async () => {
      await ActivityService.log({ project: projectId, actor: userId, action: 'task_created', targetType: 'task', targetTitle: 'First' });
      await ActivityService.log({ project: projectId, actor: userId, action: 'task_created', targetType: 'task', targetTitle: 'Second' });

      const result = await ActivityService.listByProject(projectId, {});
      expect(result.activities[0].targetTitle).toBe('Second');
      expect(result.activities[1].targetTitle).toBe('First');
    });

    it('paginates correctly', async () => {
      for (let i = 0; i < 5; i++) {
        await ActivityService.log({ project: projectId, actor: userId, action: 'task_created', targetType: 'task', targetTitle: `T${i}` });
      }

      const page1 = await ActivityService.listByProject(projectId, { limit: 2, page: 1 });
      expect(page1.activities).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = await ActivityService.listByProject(projectId, { limit: 2, page: 2 });
      expect(page2.activities).toHaveLength(2);
    });
  });

  describe('listByUser', () => {
    it('returns activities by a specific user', async () => {
      const otherUser = await createUser({ email: 'other@test.com' });
      await ActivityService.log({ project: projectId, actor: userId, action: 'task_created', targetType: 'task' });
      await ActivityService.log({ project: projectId, actor: otherUser._id.toString(), action: 'bug_created', targetType: 'bug' });

      const result = await ActivityService.listByUser(userId, {});
      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].action).toBe('task_created');
    });
  });
});
