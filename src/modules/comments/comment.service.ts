import { Comment } from '@/modules/comments/comment.model';
import { User } from '@/modules/users/user.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { ForbiddenError } from '@/shared/middleware/role-guard';
import { sendMentionEmail } from '@/shared/lib/email';
import { env } from '@/config/env';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import type { Role } from '@/shared/utils/constants';
import type { CreateCommentInput, QueryCommentsInput } from './comment.validator';

export const CommentService = {
  async create(
    data: CreateCommentInput,
    userId: string,
    parentType: 'bug' | 'task',
    parentId: string,
  ) {
    const parentField = parentType === 'bug' ? 'bugId' : 'taskId';

    const comment = await Comment.create({
      content: data.content,
      author: userId,
      [parentField]: parentId,
      mentions: data.mentions,
    });

    if (data.mentions.length > 0) {
      const author = await User.findById(userId).select('name').lean();
      const authorName = author?.name ?? 'Someone';

      // Look up parent to build a link that actually resolves and to show
      // the task/bug title in the notification.
      let parentTitle = '';
      let projectId = '';
      try {
        if (parentType === 'task') {
          const { Task } = await import('@/modules/tasks/task.model');
          const task = await Task.findById(parentId).select('title project').lean();
          if (task) {
            parentTitle = task.title;
            projectId = String(task.project);
          }
        } else {
          const { Bug } = await import('@/modules/bugs/bug.model');
          const bug = await Bug.findById(parentId).select('title project').lean();
          if (bug) {
            parentTitle = bug.title;
            projectId = String(bug.project);
          }
        }
      } catch {}

      const link = projectId
        ? parentType === 'bug'
          ? `/projects/${projectId}/bugs/${parentId}`
          : `/projects/${projectId}/board?task=${parentId}`
        : '/';

      const contextLabel = parentTitle
        ? parentType === 'bug'
          ? `bug "${parentTitle}"`
          : `task "${parentTitle}"`
        : parentType === 'bug'
          ? 'a bug report'
          : 'a task';

      const { NotificationService } = await import(
        '@/modules/notifications/notification.service'
      );

      const mentionedUsers = await User.find({ _id: { $in: data.mentions } })
        .select('name email')
        .lean();

      await Promise.all(
        mentionedUsers.map(async (mentionedUser) => {
          await NotificationService.notify(
            mentionedUser._id.toString(),
            'comment_mention',
            `${authorName} mentioned you in ${contextLabel}`,
            `"${data.content.slice(0, 140)}${data.content.length > 140 ? '…' : ''}"`,
            link,
          );

          const viewUrl = `${env.NEXT_PUBLIC_APP_URL}${link}`;
          await sendMentionEmail(
            mentionedUser.email,
            authorName,
            data.content,
            contextLabel,
            viewUrl,
          ).catch(() => {});
        }),
      ).catch(() => {});
    }

    return comment;
  },

  async list(
    parentType: 'bug' | 'task',
    parentId: string,
    query: Partial<QueryCommentsInput> = {},
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const parentField = parentType === 'bug' ? 'bugId' : 'taskId';
    const filter = { [parentField]: parentId };

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate('author', 'name email avatar')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: 1 }),
      Comment.countDocuments(filter),
    ]);

    return { comments, page, limit, total };
  },

  async delete(id: string, userId: string, userRole: Role) {
    const comment = await Comment.findById(id);
    if (!comment) {
      throw new NotFoundError('Comment');
    }

    if (comment.author.toString() !== userId && userRole !== 'admin') {
      throw new ForbiddenError('Only the author or an admin can delete this comment');
    }

    await Comment.findByIdAndDelete(id);
    return comment;
  },
};
