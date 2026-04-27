import { AuditLog } from '@/modules/audit-logs/audit-log.model';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { AuditAction, Environment } from './audit-log.types';
// Register User model for .populate('userId').
import '@/modules/users/user.model';

export const AuditLogService = {
  async create(params: {
    projectId: string;
    userId: string;
    action: AuditAction;
    targetKey: string;
    environment: Environment;
    ipAddress?: string;
  }) {
    return AuditLog.create({
      project: params.projectId,
      userId: params.userId,
      action: params.action,
      targetKey: params.targetKey,
      environment: params.environment,
      ipAddress: params.ipAddress,
    });
  },

  async list(projectId: string, query: { page?: number; limit?: number; environment?: string; action?: string }) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { project: projectId };
    if (query.environment) filter.environment = query.environment;
    if (query.action) filter.action = query.action;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('userId', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      AuditLog.countDocuments(filter),
    ]);

    return { logs, page, limit, total };
  },
};
