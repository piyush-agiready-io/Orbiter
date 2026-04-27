export const ACTIVITY_ACTIONS = [
  'task_created',
  'task_updated',
  'task_status_changed',
  'task_deleted',
  'bug_created',
  'bug_status_changed',
  'sprint_created',
  'sprint_started',
  'sprint_closed',
  'sprint_deleted',
  'comment_added',
  'member_added',
  'member_removed',
  'project_updated',
  'doc_created',
  'doc_updated',
  'link_added',
  'github_synced',
  'epic_created',
  'epic_updated',
  'epic_deleted',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface IActivity {
  id: string;
  project: string;
  actor: string;
  action: ActivityAction;
  targetType: 'task' | 'bug' | 'sprint' | 'comment' | 'project' | 'doc' | 'link' | 'member' | 'epic';
  targetId?: string;
  targetTitle?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}
