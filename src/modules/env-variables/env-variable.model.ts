import { Schema, model, models, type Document } from 'mongoose';
import type { EnvEnvironment } from './env-variable.types';

export interface EnvVariableDocument extends Document {
  key: string;
  value: string;
  iv: string;
  authTag: string;
  environment: EnvEnvironment;
  project: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const envVariableSchema = new Schema<EnvVariableDocument>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    environment: {
      type: String,
      enum: ['dev', 'prod'],
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.value;
        delete ret.iv;
        delete ret.authTag;
        return ret;
      },
    },
  },
);

envVariableSchema.index(
  { project: 1, environment: 1, key: 1 },
  { unique: true },
);

export const EnvVariable =
  (models.EnvVariable as typeof import('mongoose').Model<EnvVariableDocument>) ||
  model<EnvVariableDocument>('EnvVariable', envVariableSchema);
