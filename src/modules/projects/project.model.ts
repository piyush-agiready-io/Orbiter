import { Schema, model, models, type Document } from 'mongoose';

export interface ProjectDocument extends Document {
  name: string;
  description?: string;
  slug: string;
  status: 'active' | 'archived';
  owner: Schema.Types.ObjectId;
  members: Schema.Types.ObjectId[];
  clients: Schema.Types.ObjectId[];
  githubRepos: { owner: string; repo: string; installationId?: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const githubRepoSchema = new Schema(
  {
    owner: { type: String, required: true },
    repo: { type: String, required: true },
    installationId: { type: String },
  },
  { _id: false },
);

const projectSchema = new Schema<ProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    clients: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    githubRepos: {
      type: [githubRepoSchema],
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

projectSchema.index({ members: 1 });
projectSchema.index({ clients: 1 });

export const Project =
  (models.Project as typeof import('mongoose').Model<ProjectDocument>) ||
  model<ProjectDocument>('Project', projectSchema);
