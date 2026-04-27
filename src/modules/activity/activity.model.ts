import { Schema, model, models, type Document } from 'mongoose';
import { ACTIVITY_ACTIONS, type ActivityAction } from './activity.types';

export interface ActivityDocument extends Document {
  project: Schema.Types.ObjectId;
  actor: Schema.Types.ObjectId;
  action: ActivityAction;
  targetType: string;
  targetId?: string;
  targetTitle?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<ActivityDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true,
    },
    targetType: {
      type: String,
      enum: ['task', 'bug', 'sprint', 'comment', 'project', 'doc', 'link', 'member', 'epic'],
      required: true,
    },
    targetId: { type: String },
    targetTitle: { type: String },
    meta: { type: Schema.Types.Mixed },
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

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const Activity =
  (models.Activity as typeof import('mongoose').Model<ActivityDocument>) ||
  model<ActivityDocument>('Activity', activitySchema);
