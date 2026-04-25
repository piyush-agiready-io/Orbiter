import { Bug } from '@/modules/bugs/bug.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import { escapeRegExp } from '@/shared/utils/escape-regex';
import type { CreateBugInput, UpdateBugInput, QueryBugsInput } from './bug.validator';

export const BugService = {
  async create(projectId: string, data: CreateBugInput, userId: string) {
    const bug = await Bug.create({
      ...data,
      project: projectId,
      reporter: userId,
    });

    const { NotificationService } = await import(
      '@/modules/notifications/notification.service'
    );
    await NotificationService.notifyProjectMembers(
      projectId,
      userId,
      'bug_created',
      'New bug reported',
      `${data.title}`,
      `/projects/${projectId}/bugs`,
    ).catch(() => {});

    return bug;
  },

  async list(projectId: string, query: Partial<QueryBugsInput> = {}) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;
    const sort = query.sort ?? '-createdAt';

    const filter: Record<string, unknown> = { project: projectId };
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.source) filter.source = query.source;
    if (query.search) {
      filter.title = new RegExp(escapeRegExp(query.search), 'i');
    }

    const [bugs, total] = await Promise.all([
      Bug.find(filter)
        .populate('reporter', 'name email avatar')
        .skip(skip)
        .limit(limit)
        .sort(sort),
      Bug.countDocuments(filter),
    ]);

    return { bugs, page, limit, total };
  },

  async getById(id: string) {
    const bug = await Bug.findById(id)
      .populate('reporter', 'name email avatar')
      .populate('task', 'title status');
    if (!bug) {
      throw new NotFoundError('Bug');
    }
    return bug;
  },

  async update(id: string, data: UpdateBugInput) {
    const bug = await Bug.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!bug) {
      throw new NotFoundError('Bug');
    }
    return bug;
  },

  async delete(id: string) {
    const bug = await Bug.findByIdAndDelete(id);
    if (!bug) {
      throw new NotFoundError('Bug');
    }
    return bug;
  },

  async linkToTask(bugId: string, taskId: string | null) {
    const bug = await Bug.findById(bugId);
    if (!bug) {
      throw new NotFoundError('Bug');
    }

    if (bug.task) {
      try {
        const { Task } = await import('@/modules/tasks/task.model');
        await Task.findByIdAndUpdate(bug.task, {
          $pull: { linkedBugs: bugId },
        });
      } catch {
        // Task model may not exist yet
      }
    }

    if (taskId) {
      try {
        const { Task } = await import('@/modules/tasks/task.model');
        const task = await Task.findById(taskId);
        if (!task) throw new NotFoundError('Task');
        await Task.findByIdAndUpdate(taskId, {
          $addToSet: { linkedBugs: bugId },
        });
      } catch (error) {
        if (error instanceof NotFoundError) throw error;
        // Task model may not exist yet
      }
      bug.task = taskId as unknown as typeof bug.task;
    } else {
      bug.task = undefined;
    }

    await bug.save();
    return bug;
  },
};
