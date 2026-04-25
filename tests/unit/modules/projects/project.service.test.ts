import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createTask, createSprint, createBug, createDoc, createLink } from '../../../helpers/factory';
import { ProjectService } from '@/modules/projects/project.service';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'test',
  },
}));

let userId: string;

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
beforeEach(async () => {
  await clearCollections();
  const user = await createUser();
  userId = user._id.toString();
});

describe('ProjectService', () => {
  describe('create', () => {
    it('creates a project with slug', async () => {
      const project = await ProjectService.create({ name: 'Test App' }, userId);
      expect(project.name).toBe('Test App');
      expect(project.slug).toContain('test-app-');
      expect(project.owner.toString()).toBe(userId);
      expect(project.members.map((m: { toString(): string }) => m.toString())).toContain(userId);
    });
  });

  describe('list', () => {
    it('returns paginated projects', async () => {
      await createProject(userId, { name: 'P1' });
      await createProject(userId, { name: 'P2' });
      const result = await ProjectService.list({}, userId, 'admin');
      expect(result.projects).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by status', async () => {
      await createProject(userId, { status: 'active' });
      await createProject(userId, { status: 'archived' });
      const result = await ProjectService.list({ status: 'active' }, userId, 'admin');
      expect(result.projects).toHaveLength(1);
    });

    it('searches by name', async () => {
      await createProject(userId, { name: 'Web App' });
      await createProject(userId, { name: 'Mobile App' });
      const result = await ProjectService.list({ search: 'mobile' }, userId, 'admin');
      expect(result.projects).toHaveLength(1);
    });

    it('non-admin only sees own projects', async () => {
      const otherUser = await createUser();
      await createProject(userId, { name: 'My Project' });
      await createProject(otherUser._id.toString(), { name: 'Other Project' });
      const result = await ProjectService.list({}, userId, 'internal');
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('My Project');
    });
  });

  describe('getById', () => {
    it('returns project with populated owner', async () => {
      const project = await createProject(userId);
      const found = await ProjectService.getById(project._id.toString());
      expect(found.name).toBe('Test Project');
      expect((found.owner as unknown as { name: string }).name).toBe('Test User');
    });

    it('throws NotFoundError for missing project', async () => {
      await expect(
        ProjectService.getById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('update', () => {
    it('updates project fields', async () => {
      const project = await createProject(userId);
      const updated = await ProjectService.update(project._id.toString(), { name: 'Updated' });
      expect(updated.name).toBe('Updated');
    });

    it('throws NotFoundError for non-existent project', async () => {
      await expect(
        ProjectService.update('507f1f77bcf86cd799439011', { name: 'Nope' }),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('delete', () => {
    it('deletes project and cascades', async () => {
      const project = await createProject(userId);
      const pid = project._id.toString();
      await createTask(pid);
      await createSprint(pid);
      await createBug(pid, userId);
      await createDoc(pid, userId);
      await createLink(pid);

      await ProjectService.delete(pid);

      await expect(ProjectService.getById(pid)).rejects.toThrow('Project not found');
    });

    it('throws NotFoundError for missing project', async () => {
      await expect(
        ProjectService.delete('507f1f77bcf86cd799439011'),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('addMember', () => {
    it('adds a member to the project', async () => {
      const project = await createProject(userId);
      const newUser = await createUser({ email: 'new@test.com' });
      const updated = await ProjectService.addMember(project._id.toString(), newUser._id.toString(), 'member');
      const memberIds = updated.members.map((m: { toString(): string }) => m.toString());
      expect(memberIds).toContain(newUser._id.toString());
    });

    it('adds a client to the project', async () => {
      const project = await createProject(userId);
      const clientUser = await createUser({ email: 'client@test.com', role: 'client' });
      const updated = await ProjectService.addMember(project._id.toString(), clientUser._id.toString(), 'client');
      const clientIds = updated.clients.map((c: { toString(): string }) => c.toString());
      expect(clientIds).toContain(clientUser._id.toString());
    });
  });

  describe('removeMember', () => {
    it('removes a member from the project', async () => {
      const newUser = await createUser({ email: 'rem@test.com' });
      const project = await createProject(userId, { members: [userId, newUser._id.toString()] });
      const updated = await ProjectService.removeMember(project._id.toString(), newUser._id.toString());
      const memberIds = updated.members.map((m: { toString(): string }) => m.toString());
      expect(memberIds).not.toContain(newUser._id.toString());
    });
  });

  describe('checkAccess', () => {
    it('admin always has access', async () => {
      const project = await createProject(userId);
      const result = await ProjectService.checkAccess(project._id.toString(), 'random-id', 'admin');
      expect(result).toBe(true);
    });

    it('member has access', async () => {
      const project = await createProject(userId);
      const result = await ProjectService.checkAccess(project._id.toString(), userId, 'internal');
      expect(result).toBe(true);
    });

    it('non-member does not have access', async () => {
      const project = await createProject(userId);
      const otherUser = await createUser();
      const result = await ProjectService.checkAccess(project._id.toString(), otherUser._id.toString(), 'internal');
      expect(result).toBe(false);
    });
  });
});
