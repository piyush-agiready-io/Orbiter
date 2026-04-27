import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User } from '@/modules/users/user.model';
import { Project } from '@/modules/projects/project.model';
import { Task } from '@/modules/tasks/task.model';
import { Sprint } from '@/modules/sprints/sprint.model';
import { Bug } from '@/modules/bugs/bug.model';
import { Notification } from '@/modules/notifications/notification.model';
import { Comment } from '@/modules/comments/comment.model';
import { Doc } from '@/modules/docs/doc.model';
import { Link } from '@/modules/links/link.model';
import { EnvVariable } from '@/modules/env-variables/env-variable.model';
import { AuditLog } from '@/modules/audit-logs/audit-log.model';
import { Activity } from '@/modules/activity/activity.model';
import { Epic } from '@/modules/epics/epic.model';
import { encrypt } from '@/shared/lib/encryption';
import type { Role } from '@/shared/utils/constants';

const DEFAULT_PASSWORD = 'TestPassword1';

export async function createUser(overrides: Record<string, unknown> = {}) {
  const defaults = {
    name: 'Test User',
    email: `user-${new Types.ObjectId()}@test.com`,
    password: await bcrypt.hash(DEFAULT_PASSWORD, 4),
    role: 'internal' as Role,
    isActive: true,
    skills: [],
  };
  return User.create({ ...defaults, ...overrides });
}

export async function createProject(ownerId: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    name: 'Test Project',
    slug: `test-project-${new Types.ObjectId()}`,
    status: 'active',
    owner: ownerId,
    members: [ownerId],
    clients: [],
    githubRepos: [],
  };
  return Project.create({ ...defaults, ...overrides });
}

export async function createTask(
  projectId: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    title: 'Test Task',
    type: 'feature',
    priority: 'P2',
    status: 'backlog',
    project: projectId,
    tags: [],
    clientVisible: false,
    linkedBugs: [],
    order: 0,
  };
  return Task.create({ ...defaults, ...overrides });
}

export async function createSprint(
  projectId: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    name: 'Sprint 1',
    project: projectId,
    startDate: new Date('2026-04-28'),
    endDate: new Date('2026-05-09'),
    status: 'planning',
    velocity: { planned: 0, completed: 0 },
  };
  return Sprint.create({ ...defaults, ...overrides });
}

export async function createBug(
  projectId: string,
  reporterId: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    title: 'Test Bug',
    priority: 'P2',
    status: 'open',
    source: 'manual',
    project: projectId,
    reporter: reporterId,
    metadata: {},
  };
  return Bug.create({ ...defaults, ...overrides });
}

export async function createNotification(
  userId: string,
  overrides: Record<string, unknown> = {},
) {
  const defaults = {
    user: userId,
    type: 'bug_created',
    title: 'Test Notification',
    message: 'A test notification message',
    read: false,
    emailSent: false,
  };
  return Notification.create({ ...defaults, ...overrides });
}

export async function createComment(
  authorId: string,
  overrides: Record<string, unknown> = {},
) {
  if (!overrides.bugId && !overrides.taskId) {
    throw new Error('createComment requires either bugId or taskId in overrides');
  }
  const data = {
    content: 'Test comment content',
    author: authorId,
    mentions: [],
    ...overrides,
  };
  return Comment.create(data);
}

export async function createDoc(projectId: string, authorId: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    title: 'Test Document',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
    contentPlaintext: 'Hello',
    project: projectId,
    author: authorId,
    linkedTo: [],
  };
  return Doc.create({ ...defaults, ...overrides });
}

export async function createLink(projectId: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    label: 'Test Link',
    url: 'https://example.com',
    type: 'other',
    project: projectId,
  };
  return Link.create({ ...defaults, ...overrides });
}

export async function createEnvVariable(projectId: string, overrides: Record<string, unknown> = {}) {
  const value = (overrides.plainValue as string) ?? 'test-secret-value';
  delete overrides.plainValue;
  const { encrypted, iv, authTag } = encrypt(value);
  const defaults = {
    key: `TEST_KEY_${new Types.ObjectId()}`,
    value: encrypted,
    iv,
    authTag,
    environment: 'dev',
    project: projectId,
  };
  return EnvVariable.create({ ...defaults, ...overrides });
}

export async function createAuditLog(projectId: string, userId: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    project: projectId,
    userId,
    action: 'env_reveal',
    targetKey: 'TEST_KEY',
    environment: 'dev',
  };
  return AuditLog.create({ ...defaults, ...overrides });
}

export async function createActivity(projectId: string, userId: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    project: projectId,
    actor: userId,
    action: 'task_created',
    targetType: 'task',
    targetTitle: 'Test Task',
  };
  return Activity.create({ ...defaults, ...overrides });
}

export async function createEpic(projectId: string, ownerId: string, overrides: Record<string, unknown> = {}) {
  const defaults = {
    title: 'Test Epic',
    project: projectId,
    owner: ownerId,
    status: 'planning',
    progress: 0,
  };
  return Epic.create({ ...defaults, ...overrides });
}

export { DEFAULT_PASSWORD };
