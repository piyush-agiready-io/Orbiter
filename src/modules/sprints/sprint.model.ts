import { Schema, model, models, type Document } from 'mongoose';
import type { SprintStatus, IVelocity } from './sprint.types';

export interface SprintDocument extends Document {
  name: string;
  goal?: string;
  project: Schema.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  velocity: IVelocity;
  retroNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const velocitySchema = new Schema(
  {
    planned: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
  },
  { _id: false },
);

const sprintSchema = new Schema<SprintDocument>(
  {
    name: { type: String, required: true, trim: true },
    goal: { type: String, trim: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['planning', 'active', 'closed'],
      default: 'planning',
    },
    velocity: { type: velocitySchema, default: () => ({ planned: 0, completed: 0 }) },
    retroNotes: { type: String, trim: true },
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

sprintSchema.index({ project: 1, status: 1 });

export const Sprint =
  (models.Sprint as typeof import('mongoose').Model<SprintDocument>) ||
  model<SprintDocument>('Sprint', sprintSchema);
