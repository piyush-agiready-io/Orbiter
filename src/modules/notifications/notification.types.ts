export const NOTIFICATION_TYPES = [
  'bug_created',
  'task_assigned',
  'comment_mention',
  'sprint_closed',
  'invite',
  'priority_changed',
  'client_task_done',
  'task_completed',
  'github_digest',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification {
  id: string;
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  emailSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}
