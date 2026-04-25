export interface IProject {
  _id: string;
  name: string;
  description?: string;
  slug: string;
  status: 'active' | 'archived';
  owner: string;
  members: string[];
  clients: string[];
  githubRepos: { owner: string; repo: string; installationId?: string }[];
  createdAt: Date;
  updatedAt: Date;
}
