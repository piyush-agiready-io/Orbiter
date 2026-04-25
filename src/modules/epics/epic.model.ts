import { Schema, model, models, type Document } from 'mongoose';
import type { EpicStatus } from './epic.types';

export interface EpicDocument extends Document {
  title: string;
  description?: string;
  project: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  status: EpicStatus;
  startDate?: Date;
  endDate?: Date;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

const epicSchema = new Schema<EpicDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['planning', 'active', 'done'],
      default: 'planning',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    progress: { type: Number, default: 0, min: 0, max: 100 },
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

epicSchema.index({ project: 1, status: 1 });

export const Epic =
  (models.Epic as typeof import('mongoose').Model<EpicDocument>) ||
  model<EpicDocument>('Epic', epicSchema);
