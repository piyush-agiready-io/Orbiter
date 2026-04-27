import { Schema, model, models, type Document } from 'mongoose';
import {
  BUG_PRIORITIES,
  BUG_STATUSES,
  BUG_SOURCES,
  type BugPriority,
  type BugStatus,
  type BugSource,
} from './bug.types';

export interface BugDocument extends Document {
  title: string;
  description?: string;
  priority: BugPriority;
  status: BugStatus;
  source: BugSource;
  project: Schema.Types.ObjectId;
  reporter: Schema.Types.ObjectId;
  assignee?: Schema.Types.ObjectId;
  task?: Schema.Types.ObjectId;
  metadata: {
    url?: string;
    consoleLogs?: string;
    screenshot?: string;
    device?: string;
    browser?: string;
    os?: string;
    viewport?: { width: number; height: number };
    ip?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const viewportSchema = new Schema(
  {
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false },
);

const bugMetadataSchema = new Schema(
  {
    url: { type: String },
    consoleLogs: { type: String },
    screenshot: { type: String },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    viewport: { type: viewportSchema },
    ip: { type: String },
  },
  { _id: false },
);

const bugSchema = new Schema<BugDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: BUG_PRIORITIES,
      default: 'P2',
    },
    status: {
      type: String,
      enum: BUG_STATUSES,
      default: 'open',
    },
    source: {
      type: String,
      enum: BUG_SOURCES,
      default: 'manual',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    metadata: {
      type: bugMetadataSchema,
      default: {},
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

bugSchema.index({ project: 1, status: 1 });
bugSchema.index({ task: 1 });

export const Bug =
  (models.Bug as typeof import('mongoose').Model<BugDocument>) ||
  model<BugDocument>('Bug', bugSchema);
