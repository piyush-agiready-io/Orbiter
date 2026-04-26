import { Task } from '@/modules/tasks/task.model';
import { User } from '@/modules/users/user.model';
import { PriorityDetectionAgent } from '@/modules/ai/agents/priority-detection.agent';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import { escapeRegExp } from '@/shared/utils/escape-regex';
import { env } from '@/config/env';
import type { CreateTaskInput, UpdateTaskInput, UpdateStatusInput, BulkUpdateInput } from './task.validator';

async function notifyAssignees(assigneeIds: string[], taskTitle: string, projectId: string, userId?: string) {
  if (assigneeIds.length === 0) return;
  try {
    const { NotificationService } = await import('@/modules/notifications/notification.service');
    const { sendMentionEmail } = await import('@/shared/lib/email');
    const author = userId ? await User.findById(userId).select('name').lean() : null;
    const authorName = author?.name ?? 'Someone';
    const assignees = await User.find({ _id: { $in: assigneeIds } }).select('name email').lean();
    const link = `/projects/${projectId}/board`;

    await Promise.all(
      assignees.map(async (a) => {
        await NotificationService.notify(
          a._id.toString(),
          'task_assigned',
          `${authorName} assigned you a task`,
          taskTitle,
          link,
        );
        await sendMentionEmail(
          a.email,
          authorName,
          `You've been assigned: "${taskTitle}"`,
          'a task',
          `${env.NEXT_PUBLIC_APP_URL}${link}`,
        ).catch(() => {});
      }),
    );
  } catch {}
}

export const TaskService = {
  async create(projectId: string, data: CreateTaskInput, userId?: string) {
    const { epicId, sprintId, assigneeIds, ...rest } = data;
    const maxOrder = await Task.findOne({ project: projectId, status: rest.status ?? 'backlog' })
      .sort({ order: -1 })
      .select('order')
      .lean();

    const task = await Task.create({
      ...rest,
      project: projectId,
      epic: epicId || undefined,
      sprint: sprintId || undefined,
      assignees: assigneeIds ?? [],
      order: (maxOrder?.order ?? -1) + 1,
    });

    if (userId && task.prioritySource !== 'manual') {
      PriorityDetectionAgent.classify(userId, task.title, task.description)
        .then(async ({ priority, source }) => {
          if (source !== 'default') {
            await Task.updateOne({ _id: task._id }, { priority, prioritySource: 'ai' });
          }
        })
        .catch((err) => console.error('Priority detection failed silently:', err));
    }

    notifyAssignees(assigneeIds ?? [], task.title, projectId, userId);

    return task;
  },

  async list(
    projectId: string,
    query: {
      page?: number; limit?: number; status?: string; priority?: string;
      type?: string; assignee?: string; sprint?: string;
      search?: string; sort?: string;
    },
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { project: projectId };
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.type) filter.type = query.type;
    if (query.assignee) filter.assignees = query.assignee;
    if (query.sprint) filter.sprint = query.sprint;
    if (query.search) {
      filter.title = { $regex: escapeRegExp(query.search), $options: 'i' };
    }

    const sortField = query.sort ?? '-createdAt';
    const sortDir = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: Record<string, 1 | -1> = { [sortKey]: sortDir };

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignees', 'name email avatar')
        .populate('sprint', 'name')
        .skip(skip)
        .limit(limit)
        .sort(sortObj),
      Task.countDocuments(filter),
    ]);

    return { tasks, page, limit, total };
  },

  async getById(id: string) {
    const task = await Task.findById(id)
      .populate('assignees', 'name email avatar')
      .populate('sprint', 'name status');
    if (!task) throw new NotFoundError('Task');
    return task;
  },

  async update(id: string, data: UpdateTaskInput) {
    const { epicId, sprintId, assigneeIds, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (epicId !== undefined) updateData.epic = epicId;
    if (sprintId !== undefined) updateData.sprint = sprintId;
    if (assigneeIds !== undefined) updateData.assignees = assigneeIds;

    const task = await Task.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true },
    );
    if (!task) throw new NotFoundError('Task');
    return task;
  },

  async updateStatus(id: string, data: UpdateStatusInput) {
    const updateData: Record<string, unknown> = { status: data.status };
    if (data.order !== undefined) updateData.order = data.order;

    const task = await Task.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true },
    );
    if (!task) throw new NotFoundError('Task');

    if (data.status === 'done' && task.clientVisible) {
      try {
        const { Project } = await import('@/modules/projects/project.model');
        const { User } = await import('@/modules/users/user.model');
        const { NotificationService } = await import('@/modules/notifications/notification.service');
        const { sendTaskCompletedEmail } = await import('@/shared/lib/email');
        const { env } = await import('@/config/env');

        const project = await Project.findById(task.project).select('name clients').lean();
        if (project && project.clients?.length) {
          const clients = await User.find({ _id: { $in: project.clients } })
            .select('email notificationPreferences')
            .lean();
          const link = `/projects/${String(task.project)}/board`;

          for (const client of clients) {
            NotificationService.notify(
              String(client._id), 'task_completed',
              'Task completed',
              task.title,
              link,
            ).catch(() => {});

            const pref = client.notificationPreferences?.emailDigest ?? 'immediate';
            if (pref === 'immediate') {
              sendTaskCompletedEmail(
                client.email, task.title, project.name,
                `${env.NEXT_PUBLIC_APP_URL}${link}`,
              ).catch(() => {});
            }
          }
        }
      } catch {}
    }

    return task;
  },

  async bulkUpdate(data: BulkUpdateInput) {
    const { taskIds, update } = data;
    const updateData: Record<string, unknown> = {};
    if (update.status) updateData.status = update.status;
    if (update.priority) updateData.priority = update.priority;
    if (update.assigneeIds !== undefined) updateData.assignees = update.assigneeIds;
    if (update.epicId !== undefined) updateData.epic = update.epicId;
    if (update.sprintId !== undefined) updateData.sprint = update.sprintId;

    return Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: updateData },
    );
  },

  async delete(id: string) {
    const task = await Task.findByIdAndDelete(id);
    if (!task) throw new NotFoundError('Task');
    return task;
  },

  async reorderInColumn(projectId: string, status: string, orderedIds: string[]) {
    const ops = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, project: projectId, status },
        update: { $set: { order: index } },
      },
    }));
    return Task.bulkWrite(ops);
  },

  async getClientVisibleTasks(
    projectId: string,
    query: { page?: number; limit?: number; status?: string; sort?: string },
  ) {
    const filter: Record<string, unknown> = { project: projectId, clientVisible: true };
    if (query.status) filter.status = query.status;

    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = Math.min(query.limit ?? PAGINATION_DEFAULTS.LIMIT, PAGINATION_DEFAULTS.MAX_LIMIT);
    const skip = (page - 1) * limit;

    const sortField = query.sort ?? '-createdAt';
    const sortDir = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: Record<string, 1 | -1> = { [sortKey]: sortDir };

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('assignees', 'name email avatar'),
      Task.countDocuments(filter),
    ]);

    return { tasks, page, limit, total };
  },

  async getClientProjectProgress(projectId: string) {
    const tasks = await Task.find({ project: projectId, clientVisible: true }).select('status').lean();
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => ['in_progress', 'review'].includes(t.status)).length;
    const backlog = tasks.filter((t) => ['backlog', 'todo'].includes(t.status)).length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, backlog, percentage };
  },

  async getMyTasks(userId: string, options: { includeDone?: boolean } = {}) {
    const filter: Record<string, unknown> = { assignees: userId };
    if (!options.includeDone) {
      filter.status = { $ne: 'done' };
    }
    return Task.find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .populate('project', 'name slug')
      .populate('sprint', 'name endDate');
  },

  async reorderTask(taskId: string, data: { status: string; order: number }) {
    const task = await Task.findByIdAndUpdate(
      taskId,
      { status: data.status, order: data.order },
      { returnDocument: 'after', runValidators: true },
    )
      .populate('assignees', 'name email avatar');
    if (!task) throw new NotFoundError('Task');
    return task;
  },
};
