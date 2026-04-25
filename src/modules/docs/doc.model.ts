import { Schema, model, models, type Document } from 'mongoose';
import type { LinkedEntityType } from './doc.types';

export interface DocDocument extends Document {
  title: string;
  content: Record<string, unknown>;
  contentPlaintext: string;
  project: Schema.Types.ObjectId;
  author: Schema.Types.ObjectId;
  linkedTo: { type: LinkedEntityType; ref: Schema.Types.ObjectId }[];
  createdAt: Date;
  updatedAt: Date;
}

const linkedEntitySchema = new Schema(
  {
    type: {
      type: String,
      enum: ['task', 'sprint'],
      required: true,
    },
    ref: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false },
);

const docSchema = new Schema<DocDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: Schema.Types.Mixed,
      default: {},
    },
    contentPlaintext: {
      type: String,
      default: '',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    linkedTo: {
      type: [linkedEntitySchema],
      default: [],
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

docSchema.index({ project: 1 });
docSchema.index({ contentPlaintext: 'text', title: 'text' });

export const Doc =
  (models.Doc as typeof import('mongoose').Model<DocDocument>) ||
  model<DocDocument>('Doc', docSchema);
