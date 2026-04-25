export type TaskType = 'feature' | 'chore' | 'improvement';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type PrioritySource = 'ai' | 'manual' | 'default';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

export interface ITask {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  prioritySource: PrioritySource;
  status: TaskStatus;
  project: string;
  epic?: string;
  sprint?: string;
  assignee?: string;
  tags: string[];
  clientVisible: boolean;
  linkedBugs: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export const TASK_STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
