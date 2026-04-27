import { Bug } from '@/modules/bugs/bug.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import { escapeRegExp } from '@/shared/utils/escape-regex';
import type { CreateBugInput, UpdateBugInput, QueryBugsInput } from './bug.validator';
// Register referenced models so .populate('reporter' | 'assignee' | 'task')
// works on cold-start function instances.
import '@/modules/users/user.model';
import '@/modules/tasks/task.model';

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

  async listByReporter(
    projectId: string,
    userId: string,
    query: Partial<QueryBugsInput> = {},
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;
    const sort = query.sort ?? '-createdAt';

    const filter: Record<string, unknown> = { project: projectId, reporter: userId };
    if (query.status) filter.status = query.status;

    const [bugs, total] = await Promise.all([
      Bug.find(filter).skip(skip).limit(limit).sort(sort),
      Bug.countDocuments(filter),
    ]);

    return { bugs, page, limit, total };
  },

  async countOpenByReporter(projectId: string, userId: string) {
    return Bug.countDocuments({
      project: projectId,
      reporter: userId,
      status: { $in: ['open', 'investigating'] },
    });
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
        .populate('assignee', 'name email avatar')
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
      .populate('assignee', 'name email avatar')
      .populate('task', 'title status');
    if (!bug) {
      throw new NotFoundError('Bug');
    }
    return bug;
  },

  async update(id: string, data: UpdateBugInput, actorId?: string) {
    const { assigneeId, ...rest } = data;
    const update: Record<string, unknown> = { ...rest };
    const unset: Record<string, 1> = {};
    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        unset.assignee = 1;
      } else {
        update.assignee = assigneeId;
      }
    }

    const before = await Bug.findById(id).select('assignee title project').lean();
    if (!before) throw new NotFoundError('Bug');

    const mongoUpdate: Record<string, unknown> = {};
    if (Object.keys(update).length > 0) mongoUpdate.$set = update;
    if (Object.keys(unset).length > 0) mongoUpdate.$unset = unset;

    const bug = await Bug.findByIdAndUpdate(id, mongoUpdate, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!bug) throw new NotFoundError('Bug');

    const previousAssignee = before.assignee ? String(before.assignee) : null;
    const newAssignee = assigneeId === null ? null : assigneeId ?? previousAssignee;
    if (
      assigneeId !== undefined &&
      newAssignee &&
      newAssignee !== previousAssignee &&
      actorId
    ) {
      try {
        const { NotificationService } = await import(
          '@/modules/notifications/notification.service'
        );
        await NotificationService.notify(
          newAssignee,
          'bug_assigned',
          'You were assigned a bug',
          before.title,
          `/projects/${String(before.project)}/bugs/${id}`,
        );
      } catch {}
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

  async convertToTask(bugId: string, userId: string) {
    const bug = await Bug.findById(bugId);
    if (!bug) throw new NotFoundError('Bug');

    const { TaskService } = await import('@/modules/tasks/task.service');
    const taskTitle = `[Bug] ${bug.title}`;
    const description = [
      bug.description ?? '',
      bug.metadata?.url ? `\n\n**Reported on:** ${bug.metadata.url}` : '',
    ]
      .filter(Boolean)
      .join('');

    const assigneeIds = bug.assignee ? [String(bug.assignee)] : [];

    const task = await TaskService.create(
      String(bug.project),
      {
        title: taskTitle,
        description,
        type: 'feature',
        priority: bug.priority,
        status: 'todo',
        assigneeIds,
        tags: ['bug'],
        clientVisible: true,
      } as Parameters<typeof TaskService.create>[1],
      userId,
    );

    await this.linkToTask(bugId, String(task._id));
    return { taskId: String(task._id), projectId: String(bug.project) };
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
