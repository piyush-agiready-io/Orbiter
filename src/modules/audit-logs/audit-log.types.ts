export type AuditAction =
  | 'env_create'
  | 'env_update'
  | 'env_delete'
  | 'env_reveal'
  | 'env_export';

export type Environment = 'dev' | 'staging' | 'prod';

export interface IAuditLog {
  _id: string;
  project: string;
  userId: string;
  action: AuditAction;
  targetKey: string;
  environment: Environment;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}
