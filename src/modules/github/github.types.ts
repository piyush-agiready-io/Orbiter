export interface IGitHubCommit {
  sha: string;
  message: string;
  author: string;
  repo: string;
  branch: string;
  date: Date;
}

export interface IGitHubSync {
  _id: string;
  project: string;
  commits: IGitHubCommit[];
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
