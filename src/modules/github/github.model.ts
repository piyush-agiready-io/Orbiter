import { Schema, model, models, type Document } from 'mongoose';
import type { IGitHubCommit } from './github.types';

export interface GitHubSyncDocument extends Document {
  project: Schema.Types.ObjectId;
  commits: IGitHubCommit[];
  summary?: string;
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const commitSchema = new Schema(
  {
    sha: { type: String, required: true },
    message: { type: String, required: true },
    author: { type: String, required: true },
    repo: { type: String, required: true },
    branch: { type: String, required: true },
    date: { type: Date, required: true },
  },
  { _id: false },
);

const githubSyncSchema = new Schema<GitHubSyncDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    commits: [commitSchema],
    summary: String,
    lastSyncAt: { type: Date, required: true },
  },
  { timestamps: true },
);

githubSyncSchema.index({ project: 1, createdAt: -1 });

export const GitHubSyncModel =
  (models.GitHubSync as typeof import('mongoose').Model<GitHubSyncDocument>) ||
  model<GitHubSyncDocument>('GitHubSync', githubSyncSchema);
