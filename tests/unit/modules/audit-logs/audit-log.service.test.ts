import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createAuditLog } from '../../../helpers/factory';
import { AuditLogService } from '@/modules/audit-logs/audit-log.service';

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

describe('AuditLogService', () => {
  describe('create', () => {
    it('creates an audit log entry', async () => {
      const log = await AuditLogService.create({
        projectId,
        userId,
        action: 'env_create',
        targetKey: 'API_KEY',
        environment: 'dev',
      });
      expect(log.action).toBe('env_create');
      expect(log.targetKey).toBe('API_KEY');
      expect(log.environment).toBe('dev');
      expect(log.project.toString()).toBe(projectId);
      expect(log.userId.toString()).toBe(userId);
    });

    it('creates an audit log with IP address', async () => {
      const log = await AuditLogService.create({
        projectId,
        userId,
        action: 'env_reveal',
        targetKey: 'SECRET',
        environment: 'prod',
        ipAddress: '192.168.1.1',
      });
      expect(log.ipAddress).toBe('192.168.1.1');
    });
  });

  describe('list', () => {
    it('returns paginated audit logs', async () => {
      await createAuditLog(projectId, userId, { action: 'env_create', targetKey: 'K1' });
      await createAuditLog(projectId, userId, { action: 'env_update', targetKey: 'K2' });
      await createAuditLog(projectId, userId, { action: 'env_delete', targetKey: 'K3' });

      const result = await AuditLogService.list(projectId, {});
      expect(result.logs).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('filters by environment', async () => {
      await createAuditLog(projectId, userId, { environment: 'dev' });
      await createAuditLog(projectId, userId, { environment: 'prod' });

      const result = await AuditLogService.list(projectId, { environment: 'prod' });
      expect(result.logs).toHaveLength(1);
    });

    it('filters by action', async () => {
      await createAuditLog(projectId, userId, { action: 'env_create' });
      await createAuditLog(projectId, userId, { action: 'env_reveal' });

      const result = await AuditLogService.list(projectId, { action: 'env_reveal' });
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('env_reveal');
    });

    it('returns empty for project with no logs', async () => {
      const otherProject = await createProject(userId, { name: 'Other', slug: 'other' });
      await createAuditLog(projectId, userId);

      const result = await AuditLogService.list(otherProject._id.toString(), {});
      expect(result.logs).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('sorts by createdAt descending', async () => {
      await createAuditLog(projectId, userId, { targetKey: 'FIRST' });
      await createAuditLog(projectId, userId, { targetKey: 'SECOND' });

      const result = await AuditLogService.list(projectId, {});
      expect(result.logs[0].targetKey).toBe('SECOND');
      expect(result.logs[1].targetKey).toBe('FIRST');
    });
  });
});
