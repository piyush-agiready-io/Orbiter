import { Schema, model, models, type Document } from 'mongoose';
import type { IGitHubCommit, IGitHubPR } from './github.types';

export interface GitHubSyncDocument extends Document {
  project: Schema.Types.ObjectId;
  commits: IGitHubCommit[];
  pullRequests: IGitHubPR[];
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
    branch: { type: String, default: '' },
    date: { type: Date, required: true },
  },
  { _id: false },
);

const prSchema = new Schema(
  {
    number: { type: Number, required: true },
    title: { type: String, required: true },
    state: { type: String, enum: ['open', 'closed', 'merged'], required: true },
    author: { type: String, required: true },
    repo: { type: String, required: true },
    url: { type: String, required: true },
    createdAt: { type: Date, required: true },
    mergedAt: { type: Date },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
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
    pullRequests: { type: [prSchema], default: [] },
    summary: String,
    lastSyncAt: { type: Date, required: true },
  },
  { timestamps: true },
);

githubSyncSchema.index({ project: 1, createdAt: -1 });

export const GitHubSyncModel =
  (models.GitHubSync as typeof import('mongoose').Model<GitHubSyncDocument>) ||
  model<GitHubSyncDocument>('GitHubSync', githubSyncSchema);
