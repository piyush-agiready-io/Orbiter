export const BUG_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type BugPriority = (typeof BUG_PRIORITIES)[number];

export const BUG_STATUSES = ['open', 'investigating', 'resolved', 'closed'] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const BUG_SOURCES = ['manual', 'extension'] as const;
export type BugSource = (typeof BUG_SOURCES)[number];

export interface IBugMetadata {
  url?: string;
  consoleLogs?: string;
  screenshot?: string;
  device?: string;
  browser?: string;
  os?: string;
  viewport?: { width: number; height: number };
  ip?: string;
}

export interface IBug {
  id: string;
  title: string;
  description?: string;
  priority: BugPriority;
  status: BugStatus;
  source: BugSource;
  project: string;
  reporter: string;
  task?: string;
  metadata: IBugMetadata;
  createdAt: Date;
  updatedAt: Date;
}
