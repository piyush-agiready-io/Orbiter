import { Schema, model, models, type Document } from 'mongoose';
import type { TaskType, TaskPriority, PrioritySource, TaskStatus } from './task.types';

export interface TaskDocument extends Document {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  prioritySource: PrioritySource;
  status: TaskStatus;
  project: Schema.Types.ObjectId;
  epic?: Schema.Types.ObjectId;
  sprint?: Schema.Types.ObjectId;
  assignees: Schema.Types.ObjectId[];
  tags: string[];
  clientVisible: boolean;
  linkedBugs: Schema.Types.ObjectId[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['feature', 'chore', 'improvement'],
      default: 'feature',
    },
    priority: {
      type: String,
      enum: ['P0', 'P1', 'P2', 'P3'],
      default: 'P2',
    },
    prioritySource: {
      type: String,
      enum: ['ai', 'manual', 'default'],
      default: 'default',
    },
    status: {
      type: String,
      enum: ['backlog', 'todo', 'in_progress', 'review', 'done'],
      default: 'backlog',
    },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    epic: { type: Schema.Types.ObjectId, ref: 'Epic' },
    sprint: { type: Schema.Types.ObjectId, ref: 'Sprint' },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    tags: { type: [String], default: [] },
    clientVisible: { type: Boolean, default: true },
    linkedBugs: [{ type: Schema.Types.ObjectId, ref: 'Bug' }],
    order: { type: Number, default: 0 },
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

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ epic: 1 });
taskSchema.index({ sprint: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ project: 1, status: 1, order: 1 });

export const Task =
  (models.Task as typeof import('mongoose').Model<TaskDocument>) ||
  model<TaskDocument>('Task', taskSchema);
