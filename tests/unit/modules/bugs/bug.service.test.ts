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
import { createUser, createProject, createBug } from '../../../helpers/factory';
import { BugService } from '@/modules/bugs/bug.service';

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('BugService', () => {
  describe('create', () => {
    it('creates a bug with reporter and project', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await BugService.create(
        project._id.toString(),
        { title: 'Login broken', priority: 'P0' },
        user._id.toString(),
      );
      expect(bug.title).toBe('Login broken');
      expect(bug.priority).toBe('P0');
      expect(bug.status).toBe('open');
      expect(bug.reporter.toString()).toBe(user._id.toString());
      expect(bug.project.toString()).toBe(project._id.toString());
    });
  });

  describe('list', () => {
    it('returns paginated bugs for a project', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      await createBug(project._id.toString(), user._id.toString(), { title: 'Bug 1' });
      await createBug(project._id.toString(), user._id.toString(), { title: 'Bug 2' });

      const result = await BugService.list(project._id.toString(), { page: 1, limit: 10 });
      expect(result.bugs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by status', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      await createBug(project._id.toString(), user._id.toString(), { status: 'open' });
      await createBug(project._id.toString(), user._id.toString(), { status: 'closed' });

      const result = await BugService.list(project._id.toString(), { status: 'open' });
      expect(result.bugs).toHaveLength(1);
    });

    it('filters by priority', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      await createBug(project._id.toString(), user._id.toString(), { priority: 'P0' });
      await createBug(project._id.toString(), user._id.toString(), { priority: 'P3' });

      const result = await BugService.list(project._id.toString(), { priority: 'P0' });
      expect(result.bugs).toHaveLength(1);
    });

    it('searches by title', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      await createBug(project._id.toString(), user._id.toString(), { title: 'Login broken' });
      await createBug(project._id.toString(), user._id.toString(), { title: 'Dashboard crash' });

      const result = await BugService.list(project._id.toString(), { search: 'login' });
      expect(result.bugs).toHaveLength(1);
      expect(result.bugs[0].title).toBe('Login broken');
    });
  });

  describe('getById', () => {
    it('returns bug with populated reporter', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      const found = await BugService.getById(bug._id.toString());
      expect(found.title).toBe('Test Bug');
      expect((found.reporter as unknown as { name: string }).name).toBe('Test User');
    });

    it('throws NotFoundError for invalid id', async () => {
      await expect(BugService.getById('000000000000000000000000')).rejects.toThrow('Bug not found');
    });
  });

  describe('update', () => {
    it('updates bug fields', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      const updated = await BugService.update(bug._id.toString(), {
        status: 'investigating',
        priority: 'P1',
      });
      expect(updated.status).toBe('investigating');
      expect(updated.priority).toBe('P1');
    });
  });

  describe('delete', () => {
    it('deletes a bug', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      await BugService.delete(bug._id.toString());
      await expect(BugService.getById(bug._id.toString())).rejects.toThrow('Bug not found');
    });
  });

  describe('linkToTask', () => {
    it('links bug to null (unlink)', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      const updated = await BugService.linkToTask(bug._id.toString(), null);
      expect(updated.task).toBeUndefined();
    });
  });
});
