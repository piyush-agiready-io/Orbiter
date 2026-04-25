import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createEpic } from '../../../helpers/factory';
import { EpicService } from '@/modules/epics/epic.service';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'test',
  },
}));

jest.mock('@/modules/tasks/task.model', () => ({
  Task: {
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

let userId: string;
let projectId: string;

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearCollections();
  const user = await createUser();
  userId = user._id.toString();
  const project = await createProject(userId);
  projectId = project._id.toString();
});

describe('EpicService', () => {
  describe('create', () => {
    it('creates an epic with defaults', async () => {
      const epic = await EpicService.create(
        projectId,
        { title: 'Auth System' },
        userId,
      );
      expect(epic.title).toBe('Auth System');
      expect(epic.status).toBe('planning');
      expect(epic.progress).toBe(0);
      expect(epic.project.toString()).toBe(projectId);
      expect(epic.owner.toString()).toBe(userId);
    });

    it('creates an epic with all fields', async () => {
      const start = new Date('2026-05-01');
      const end = new Date('2026-06-01');
      const epic = await EpicService.create(
        projectId,
        { title: 'Dashboard', description: 'Build dashboard', status: 'active', startDate: start, endDate: end },
        userId,
      );
      expect(epic.description).toBe('Build dashboard');
      expect(epic.status).toBe('active');
      expect(epic.startDate).toEqual(start);
      expect(epic.endDate).toEqual(end);
    });
  });

  describe('list', () => {
    it('returns paginated epics for a project', async () => {
      await createEpic(projectId, userId, { title: 'Epic 1' });
      await createEpic(projectId, userId, { title: 'Epic 2' });
      const result = await EpicService.list(projectId, {});
      expect(result.epics).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('filters by status', async () => {
      await createEpic(projectId, userId, { status: 'active' });
      await createEpic(projectId, userId, { status: 'done' });
      const result = await EpicService.list(projectId, { status: 'active' });
      expect(result.epics).toHaveLength(1);
      expect(result.epics[0].status).toBe('active');
    });

    it('searches by title', async () => {
      await createEpic(projectId, userId, { title: 'Auth Module' });
      await createEpic(projectId, userId, { title: 'Dashboard' });
      const result = await EpicService.list(projectId, { search: 'auth' });
      expect(result.epics).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('returns an epic by id', async () => {
      const created = await createEpic(projectId, userId);
      const epic = await EpicService.getById(created._id.toString());
      expect(epic.title).toBe('Test Epic');
    });

    it('throws NotFoundError for invalid id', async () => {
      await expect(
        EpicService.getById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Epic not found');
    });
  });

  describe('update', () => {
    it('updates epic fields', async () => {
      const created = await createEpic(projectId, userId);
      const updated = await EpicService.update(created._id.toString(), {
        title: 'Updated Title',
        status: 'active',
      });
      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('active');
    });

    it('throws NotFoundError for non-existent epic', async () => {
      await expect(
        EpicService.update('507f1f77bcf86cd799439011', { title: 'Nope' }),
      ).rejects.toThrow('Epic not found');
    });
  });

  describe('delete', () => {
    it('deletes an epic', async () => {
      const created = await createEpic(projectId, userId);
      await EpicService.delete(created._id.toString());
      await expect(
        EpicService.getById(created._id.toString()),
      ).rejects.toThrow('Epic not found');
    });

    it('throws NotFoundError for non-existent epic', async () => {
      await expect(
        EpicService.delete('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Epic not found');
    });
  });

  describe('computeProgress', () => {
    it('returns 0 when no tasks exist', async () => {
      const created = await createEpic(projectId, userId);
      const progress = await EpicService.computeProgress(created._id.toString());
      expect(progress).toBe(0);
    });
  });
});
