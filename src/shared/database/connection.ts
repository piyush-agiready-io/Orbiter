import mongoose from 'mongoose';
import { env } from '@/config/env';

// Force-register every Mongoose model the moment a connection is opened.
// Without this, populate('sprint' | 'task' | 'assignee' | ...) silently
// fails on cold-start function instances where no other module in the
// request's import graph has yet loaded the referenced model — the
// request 5xx's, the client swallows the query error, and the UI shows
// an empty state. Centralizing here guarantees all routes have every
// model registered, no matter which service they happen to import.
import '@/modules/users/user.model';
import '@/modules/projects/project.model';
import '@/modules/sprints/sprint.model';
import '@/modules/tasks/task.model';
import '@/modules/epics/epic.model';
import '@/modules/bugs/bug.model';
import '@/modules/docs/doc.model';
import '@/modules/comments/comment.model';
import '@/modules/notifications/notification.model';
import '@/modules/links/link.model';
import '@/modules/env-variables/env-variable.model';
import '@/modules/activity/activity.model';
import '@/modules/audit-logs/audit-log.model';
import '@/modules/github/github.model';
import '@/modules/ai/openai-connection.model';
import '@/modules/ai/openai-device-session.model';

let cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = {
  conn: null,
  promise: null,
};

export async function connectDB(): Promise<void> {
  if (cached.conn && mongoose.connections[0]?.readyState === 1) {
    return;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
