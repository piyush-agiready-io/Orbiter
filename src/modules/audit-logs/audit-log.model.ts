import { Schema, model, models, type Document } from 'mongoose';
import type { AuditAction, Environment } from './audit-log.types';

export interface AuditLogDocument extends Document {
  project: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  action: AuditAction;
  targetKey: string;
  environment: Environment;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['env_create', 'env_update', 'env_delete', 'env_reveal', 'env_export'],
      required: true,
    },
    targetKey: {
      type: String,
      required: true,
    },
    environment: {
      type: String,
      enum: ['dev', 'staging', 'prod'],
      required: true,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

auditLogSchema.index({ project: 1, createdAt: -1 });

export const AuditLog =
  (models.AuditLog as typeof import('mongoose').Model<AuditLogDocument>) ||
  model<AuditLogDocument>('AuditLog', auditLogSchema);
