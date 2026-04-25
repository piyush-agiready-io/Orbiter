export interface IGitHubCommit {
  sha: string;
  message: string;
  author: string;
  repo: string;
  branch: string;
  date: Date;
}

export interface IGitHubPR {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  repo: string;
  url: string;
  createdAt: Date;
  mergedAt?: Date;
  additions: number;
  deletions: number;
}

export interface IGitHubSync {
  _id: string;
  project: string;
  commits: IGitHubCommit[];
  pullRequests: IGitHubPR[];
  summary?: string;
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
  installationId?: string;
}
