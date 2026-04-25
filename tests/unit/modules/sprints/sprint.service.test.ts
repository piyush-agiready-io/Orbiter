import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createSprint, createTask } from '../../../helpers/factory';
import { SprintService } from '@/modules/sprints/sprint.service';

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

describe('SprintService', () => {
  describe('create', () => {
    it('creates a sprint', async () => {
      const sprint = await SprintService.create(projectId, {
        name: 'Sprint 1',
        startDate: new Date('2026-05-04'),
        endDate: new Date('2026-05-15'),
      });
      expect(sprint.name).toBe('Sprint 1');
      expect(sprint.status).toBe('planning');
      expect(sprint.velocity.planned).toBe(0);
    });

    it('creates a sprint with a goal', async () => {
      const sprint = await SprintService.create(projectId, {
        name: 'Sprint 2',
        goal: 'Finish auth flow',
        startDate: new Date('2026-05-18'),
        endDate: new Date('2026-05-29'),
      });
      expect(sprint.goal).toBe('Finish auth flow');
    });
  });

  describe('list', () => {
    it('returns paginated sprints', async () => {
      await createSprint(projectId, { name: 'S1' });
      await createSprint(projectId, { name: 'S2' });
      const result = await SprintService.list(projectId, {});
      expect(result.sprints).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by status', async () => {
      await createSprint(projectId, { status: 'active' });
      await createSprint(projectId, { status: 'closed' });
      const result = await SprintService.list(projectId, { status: 'active' });
      expect(result.sprints).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('returns a sprint by id', async () => {
      const created = await createSprint(projectId);
      const sprint = await SprintService.getById(created._id.toString());
      expect(sprint.name).toBe('Sprint 1');
    });

    it('throws NotFoundError for missing sprint', async () => {
      await expect(
        SprintService.getById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Sprint not found');
    });
  });

  describe('activate', () => {
    it('activates a planning sprint', async () => {
      const sprint = await createSprint(projectId, { status: 'planning' });
      const activated = await SprintService.activate(sprint._id.toString(), projectId);
      expect(activated.status).toBe('active');
    });

    it('throws ConflictError if another sprint is active', async () => {
      await createSprint(projectId, { status: 'active' });
      const sprint2 = await createSprint(projectId, { name: 'Sprint 2', status: 'planning' });
      await expect(
        SprintService.activate(sprint2._id.toString(), projectId),
      ).rejects.toThrow('already has an active sprint');
    });
  });

  describe('close', () => {
    it('closes a sprint and computes velocity', async () => {
      const sprint = await createSprint(projectId, { status: 'active' });
      const sprintId = sprint._id.toString();
      await createTask(projectId, { sprint: sprintId, status: 'done' });
      await createTask(projectId, { sprint: sprintId, status: 'done' });
      await createTask(projectId, { sprint: sprintId, status: 'in_progress' });

      const closed = await SprintService.close(sprintId, {});
      expect(closed.status).toBe('closed');
      expect(closed.velocity.planned).toBe(3);
      expect(closed.velocity.completed).toBe(2);
    });

    it('rolls over incomplete tasks to next planning sprint', async () => {
      const sprint = await createSprint(projectId, { status: 'active' });
      const sprintId = sprint._id.toString();
      const nextSprint = await createSprint(projectId, { name: 'Sprint 2', status: 'planning' });
      const incompleteTask = await createTask(projectId, { sprint: sprintId, status: 'in_progress' });

      await SprintService.close(sprintId, {
        rolloverTaskIds: [incompleteTask._id.toString()],
      });

      const { Task } = await import('@/modules/tasks/task.model');
      const updated = await Task.findById(incompleteTask._id);
      expect(updated!.sprint!.toString()).toBe(nextSprint._id.toString());
    });
  });

  describe('addTasks / removeTasks', () => {
    it('assigns tasks to a sprint', async () => {
      const sprint = await createSprint(projectId);
      const task = await createTask(projectId);

      await SprintService.addTasks(sprint._id.toString(), {
        taskIds: [task._id.toString()],
      });

      const { Task } = await import('@/modules/tasks/task.model');
      const updated = await Task.findById(task._id);
      expect(updated!.sprint!.toString()).toBe(sprint._id.toString());
    });

    it('removes tasks from a sprint', async () => {
      const sprint = await createSprint(projectId);
      const task = await createTask(projectId, { sprint: sprint._id });

      await SprintService.removeTasks(sprint._id.toString(), {
        taskIds: [task._id.toString()],
      });

      const { Task } = await import('@/modules/tasks/task.model');
      const updated = await Task.findById(task._id);
      expect(updated!.sprint).toBeUndefined();
    });
  });
});
