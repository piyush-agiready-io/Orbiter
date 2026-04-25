import { EnvVariable } from '@/modules/env-variables/env-variable.model';
import { AuditLog } from '@/modules/audit-logs/audit-log.model';
import { encrypt, decrypt } from '@/shared/lib/encryption';
import { NotFoundError, ConflictError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { CreateEnvVariableInput, UpdateEnvVariableInput } from './env-variable.validator';
import type { AuditAction } from '@/modules/audit-logs/audit-log.types';

async function createAuditEntry(params: {
  projectId: string;
  userId: string;
  action: AuditAction;
  targetKey: string;
  environment: string;
  ipAddress?: string;
}) {
  await AuditLog.create({
    project: params.projectId,
    userId: params.userId,
    action: params.action,
    targetKey: params.targetKey,
    environment: params.environment,
    ipAddress: params.ipAddress,
  });
}

export const EnvVariableService = {
  async create(
    projectId: string,
    data: CreateEnvVariableInput,
    userId: string,
    ipAddress?: string,
  ) {
    const existing = await EnvVariable.findOne({
      project: projectId,
      environment: data.environment,
      key: data.key,
    });
    if (existing) {
      throw new ConflictError(
        `Environment variable "${data.key}" already exists in ${data.environment}`,
      );
    }

    const { encrypted, iv, authTag } = encrypt(data.value);
    const envVar = await EnvVariable.create({
      key: data.key,
      value: encrypted,
      iv,
      authTag,
      environment: data.environment,
      project: projectId,
    });

    await createAuditEntry({
      projectId,
      userId,
      action: 'env_create',
      targetKey: data.key,
      environment: data.environment,
      ipAddress,
    });

    return envVar;
  },

  async list(
    projectId: string,
    query: { page?: number; limit?: number; environment?: string },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { project: projectId };
    if (query.environment) {
      filter.environment = query.environment;
    }

    const [envVars, total] = await Promise.all([
      EnvVariable.find(filter)
        .select('-value -iv -authTag')
        .skip(skip)
        .limit(limit)
        .sort({ environment: 1, key: 1 }),
      EnvVariable.countDocuments(filter),
    ]);

    return { envVars, page, limit, total };
  },

  async reveal(id: string, userId: string, ipAddress?: string) {
    const envVar = await EnvVariable.findById(id);
    if (!envVar) {
      throw new NotFoundError('Environment variable');
    }

    const decryptedValue = decrypt(envVar.value, envVar.iv, envVar.authTag);

    await createAuditEntry({
      projectId: envVar.project.toString(),
      userId,
      action: 'env_reveal',
      targetKey: envVar.key,
      environment: envVar.environment,
      ipAddress,
    });

    return {
      id: envVar._id,
      key: envVar.key,
      value: decryptedValue,
      environment: envVar.environment,
    };
  },

  async update(
    id: string,
    data: UpdateEnvVariableInput,
    userId: string,
    ipAddress?: string,
  ) {
    const envVar = await EnvVariable.findById(id);
    if (!envVar) {
      throw new NotFoundError('Environment variable');
    }

    const updateData: Record<string, unknown> = {};
    if (data.key !== undefined) updateData.key = data.key;
    if (data.environment !== undefined) updateData.environment = data.environment;

    if (data.value !== undefined) {
      const { encrypted, iv, authTag } = encrypt(data.value);
      updateData.value = encrypted;
      updateData.iv = iv;
      updateData.authTag = authTag;
    }

    const updated = await EnvVariable.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true },
    );

    await createAuditEntry({
      projectId: envVar.project.toString(),
      userId,
      action: 'env_update',
      targetKey: data.key ?? envVar.key,
      environment: data.environment ?? envVar.environment,
      ipAddress,
    });

    return updated!;
  },

  async delete(id: string, userId: string, ipAddress?: string) {
    const envVar = await EnvVariable.findById(id);
    if (!envVar) {
      throw new NotFoundError('Environment variable');
    }

    await EnvVariable.findByIdAndDelete(id);

    await createAuditEntry({
      projectId: envVar.project.toString(),
      userId,
      action: 'env_delete',
      targetKey: envVar.key,
      environment: envVar.environment,
      ipAddress,
    });

    return envVar;
  },

  async export(projectId: string, environment: string, userId: string, ipAddress?: string) {
    const envVars = await EnvVariable.find({
      project: projectId,
      environment,
    }).sort({ key: 1 });

    const lines = envVars.map((ev) => {
      const decrypted = decrypt(ev.value, ev.iv, ev.authTag);
      return `${ev.key}=${decrypted}`;
    });

    await createAuditEntry({
      projectId,
      userId,
      action: 'env_export',
      targetKey: '*',
      environment,
      ipAddress,
    });

    return lines.join('\n');
  },

  async getAuditLog(
    projectId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter = { project: projectId };

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
