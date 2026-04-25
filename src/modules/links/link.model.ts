import { Schema, model, models, type Document } from 'mongoose';
import type { LinkType } from './link.types';

export interface LinkDocument extends Document {
  label: string;
  url: string;
  type: LinkType;
  project: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const linkSchema = new Schema<LinkDocument>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['production', 'staging', 'figma', 'api_docs', 'repository', 'other'],
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
        return ret;
      },
    },
  },
);

linkSchema.index({ project: 1 });

export const Link =
  (models.Link as typeof import('mongoose').Model<LinkDocument>) ||
  model<LinkDocument>('Link', linkSchema);
