import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createTask, createEpic } from '../../../helpers/factory';
import { TaskService } from '@/modules/tasks/task.service';

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

describe('TaskService', () => {
  describe('create', () => {
    it('creates a task with defaults', async () => {
      const task = await TaskService.create(projectId, { title: 'Login page' });
      expect(task.title).toBe('Login page');
      expect(task.status).toBe('backlog');
      expect(task.priority).toBe('P2');
      expect(task.type).toBe('feature');
      expect(task.project.toString()).toBe(projectId);
    });

    it('creates a task with epic and assignee', async () => {
      const epic = await createEpic(projectId, userId);
      const task = await TaskService.create(projectId, {
        title: 'Task with refs',
        epicId: epic._id.toString(),
        assigneeId: userId,
      });
      expect(task.epic!.toString()).toBe(epic._id.toString());
      expect(task.assignee!.toString()).toBe(userId);
    });
  });

  describe('list', () => {
    it('returns paginated tasks for a project', async () => {
      await createTask(projectId, { title: 'T1' });
      await createTask(projectId, { title: 'T2' });
      const result = await TaskService.list(projectId, {});
      expect(result.tasks).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by status', async () => {
      await createTask(projectId, { status: 'todo' });
      await createTask(projectId, { status: 'done' });
      const result = await TaskService.list(projectId, { status: 'todo' });
      expect(result.tasks).toHaveLength(1);
    });

    it('filters by priority', async () => {
      await createTask(projectId, { priority: 'P0' });
      await createTask(projectId, { priority: 'P3' });
      const result = await TaskService.list(projectId, { priority: 'P0' });
      expect(result.tasks).toHaveLength(1);
    });

    it('filters by assignee', async () => {
      await createTask(projectId, { assignee: userId });
      await createTask(projectId);
      const result = await TaskService.list(projectId, { assignee: userId });
      expect(result.tasks).toHaveLength(1);
    });

    it('searches by title', async () => {
      await createTask(projectId, { title: 'Login button' });
      await createTask(projectId, { title: 'Dashboard' });
      const result = await TaskService.list(projectId, { search: 'login' });
      expect(result.tasks).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('returns a task with populated fields', async () => {
      const task = await createTask(projectId, { assignee: userId });
      const found = await TaskService.getById(task._id.toString());
      expect(found.title).toBe('Test Task');
    });

    it('throws NotFoundError for missing task', async () => {
      await expect(
        TaskService.getById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Task not found');
    });
  });

  describe('update', () => {
    it('updates task fields', async () => {
      const task = await createTask(projectId);
      const updated = await TaskService.update(task._id.toString(), {
        title: 'Updated',
        priority: 'P0',
      });
      expect(updated.title).toBe('Updated');
      expect(updated.priority).toBe('P0');
    });

    it('throws NotFoundError for non-existent task', async () => {
      await expect(
        TaskService.update('507f1f77bcf86cd799439011', { title: 'Nope' }),
      ).rejects.toThrow('Task not found');
    });
  });

  describe('updateStatus', () => {
    it('updates task status and order', async () => {
      const task = await createTask(projectId, { status: 'backlog' });
      const updated = await TaskService.updateStatus(task._id.toString(), {
        status: 'in_progress',
        order: 5,
      });
      expect(updated.status).toBe('in_progress');
      expect(updated.order).toBe(5);
    });
  });

  describe('bulkUpdate', () => {
    it('updates multiple tasks at once', async () => {
      const t1 = await createTask(projectId, { title: 'T1' });
      const t2 = await createTask(projectId, { title: 'T2' });
      const result = await TaskService.bulkUpdate({
        taskIds: [t1._id.toString(), t2._id.toString()],
        update: { priority: 'P0' },
      });
      expect(result.modifiedCount).toBe(2);
    });
  });

  describe('delete', () => {
    it('deletes a task', async () => {
      const task = await createTask(projectId);
      await TaskService.delete(task._id.toString());
      await expect(
        TaskService.getById(task._id.toString()),
      ).rejects.toThrow('Task not found');
    });

    it('throws NotFoundError for non-existent task', async () => {
      await expect(
        TaskService.delete('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Task not found');
    });
  });
});
