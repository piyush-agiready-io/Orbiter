import { Schema, model, models, type Document } from 'mongoose';

export interface CommentDocument extends Document {
  content: string;
  author: Schema.Types.ObjectId;
  taskId?: Schema.Types.ObjectId;
  bugId?: Schema.Types.ObjectId;
  mentions: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDocument>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    bugId: {
      type: Schema.Types.ObjectId,
      ref: 'Bug',
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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

commentSchema.index({ taskId: 1, createdAt: 1 });
commentSchema.index({ bugId: 1, createdAt: 1 });

export const Comment =
  (models.Comment as typeof import('mongoose').Model<CommentDocument>) ||
  model<CommentDocument>('Comment', commentSchema);
