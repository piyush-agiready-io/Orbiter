import { Comment } from '@/modules/comments/comment.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { ForbiddenError } from '@/shared/middleware/role-guard';
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
      const { NotificationService } = await import(
        '@/modules/notifications/notification.service'
      );
      const link =
        parentType === 'bug'
          ? `/bugs/${parentId}`
          : `/tasks/${parentId}`;

      await Promise.all(
        data.mentions.map((mentionedUserId) =>
          NotificationService.notify(
            mentionedUserId,
            'comment_mention',
            'You were mentioned in a comment',
            data.content.slice(0, 100),
            link,
          ),
        ),
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
