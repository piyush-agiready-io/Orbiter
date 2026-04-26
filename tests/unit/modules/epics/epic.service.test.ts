import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createTask } from '../../../helpers/factory';
import { EpicService } from '@/modules/epics/epic.service';
import { Epic } from '@/modules/epics/epic.model';

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

async function createEpic(overrides: Record<string, unknown> = {}) {
  const defaults = {
    title: 'Test Epic',
    project: projectId,
    owner: userId,
    status: 'planning',
    progress: 0,
  };
  return Epic.create({ ...defaults, ...overrides });
}

describe('EpicService', () => {
  describe('create', () => {
    it('creates an epic with defaults', async () => {
      const epic = await EpicService.create(projectId, { title: 'Auth Epic' }, userId);
      expect(epic.title).toBe('Auth Epic');
      expect(epic.status).toBe('planning');
      expect(epic.progress).toBe(0);
      expect(epic.project.toString()).toBe(projectId);
      expect(epic.owner.toString()).toBe(userId);
    });

    it('creates an epic with explicit owner', async () => {
      const otherUser = await createUser({ email: 'other@test.com' });
      const epic = await EpicService.create(
        projectId,
        { title: 'Other Epic', ownerId: otherUser._id.toString() },
        userId,
      );
      expect(epic.owner.toString()).toBe(otherUser._id.toString());
    });

    it('creates an epic with dates', async () => {
      const epic = await EpicService.create(projectId, {
        title: 'Dated Epic',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-06-01'),
      }, userId);
      expect(epic.startDate).toEqual(new Date('2026-05-01'));
      expect(epic.endDate).toEqual(new Date('2026-06-01'));
    });
  });

  describe('list', () => {
    it('returns paginated epics for a project', async () => {
      await createEpic({ title: 'E1' });
      await createEpic({ title: 'E2' });
      const result = await EpicService.list(projectId, {});
      expect(result.epics).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by status', async () => {
      await createEpic({ status: 'active' });
      await createEpic({ status: 'done' });
      const result = await EpicService.list(projectId, { status: 'active' });
      expect(result.epics).toHaveLength(1);
    });

    it('searches by title', async () => {
      await createEpic({ title: 'Auth Flow' });
      await createEpic({ title: 'Dashboard' });
      const result = await EpicService.list(projectId, { search: 'auth' });
      expect(result.epics).toHaveLength(1);
      expect(result.epics[0].title).toBe('Auth Flow');
    });

    it('does not return epics from other projects', async () => {
      const otherProject = await createProject(userId, { name: 'Other', slug: 'other-proj' });
      await createEpic({ project: otherProject._id.toString() });
      await createEpic({ title: 'Mine' });
      const result = await EpicService.list(projectId, {});
      expect(result.epics).toHaveLength(1);
      expect(result.epics[0].title).toBe('Mine');
    });
  });

  describe('getById', () => {
    it('returns an epic with populated owner', async () => {
      const epic = await createEpic();
      const found = await EpicService.getById(epic._id.toString());
      expect(found.title).toBe('Test Epic');
    });

    it('throws NotFoundError for missing epic', async () => {
      await expect(
        EpicService.getById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Epic not found');
    });
  });

  describe('update', () => {
    it('updates epic fields', async () => {
      const epic = await createEpic();
      const updated = await EpicService.update(epic._id.toString(), {
        title: 'Updated Epic',
        status: 'active',
      });
      expect(updated.title).toBe('Updated Epic');
      expect(updated.status).toBe('active');
    });

    it('updates owner via ownerId', async () => {
      const otherUser = await createUser({ email: 'new-owner@test.com' });
      const epic = await createEpic();
      const updated = await EpicService.update(epic._id.toString(), {
        ownerId: otherUser._id.toString(),
      });
      expect(updated.owner.toString()).toBe(otherUser._id.toString());
    });

    it('throws NotFoundError for non-existent epic', async () => {
      await expect(
        EpicService.update('507f1f77bcf86cd799439011', { title: 'Nope' }),
      ).rejects.toThrow('Epic not found');
    });
  });

  describe('delete', () => {
    it('deletes an epic', async () => {
      const epic = await createEpic();
      await EpicService.delete(epic._id.toString());
      await expect(
        EpicService.getById(epic._id.toString()),
      ).rejects.toThrow('Epic not found');
    });

    it('throws NotFoundError for non-existent epic', async () => {
      await expect(
        EpicService.delete('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Epic not found');
    });
  });

  describe('calculateProgress', () => {
    it('calculates 0% when no tasks', async () => {
      const epic = await createEpic();
      const updated = await EpicService.calculateProgress(epic._id.toString());
      expect(updated.progress).toBe(0);
    });

    it('calculates correct percentage', async () => {
      const epic = await createEpic();
      await createTask(projectId, { epic: epic._id, status: 'done' });
      await createTask(projectId, { epic: epic._id, status: 'done' });
      await createTask(projectId, { epic: epic._id, status: 'in_progress' });
      await createTask(projectId, { epic: epic._id, status: 'backlog' });

      const updated = await EpicService.calculateProgress(epic._id.toString());
      expect(updated.progress).toBe(50);
    });

    it('calculates 100% when all tasks done', async () => {
      const epic = await createEpic();
      await createTask(projectId, { epic: epic._id, status: 'done' });
      await createTask(projectId, { epic: epic._id, status: 'done' });

      const updated = await EpicService.calculateProgress(epic._id.toString());
      expect(updated.progress).toBe(100);
    });

    it('throws NotFoundError for missing epic', async () => {
      await expect(
        EpicService.calculateProgress('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Epic not found');
    });
  });

  describe('getByProject', () => {
    it('returns all epics for a project', async () => {
      await createEpic({ title: 'E1' });
      await createEpic({ title: 'E2' });
      const epics = await EpicService.getByProject(projectId);
      expect(epics).toHaveLength(2);
    });

    it('returns empty array when no epics', async () => {
      const epics = await EpicService.getByProject(projectId);
      expect(epics).toHaveLength(0);
    });
  });
});
