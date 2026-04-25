import { apiHandler } from '@/shared/middleware/api-handler';
import { checkProjectAccess } from '@/shared/middleware/project-access';
import { CommentService } from '@/modules/comments/comment.service';
import {
  createCommentSchema,
  queryCommentsSchema,
} from '@/modules/comments/comment.validator';
import type { CreateCommentInput, QueryCommentsInput } from '@/modules/comments/comment.validator';

export const GET = apiHandler({
  validate: { query: queryCommentsSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const query = ctx.query as QueryCommentsInput;
    const result = await CommentService.list('task', ctx.params.taskId, query);
    return {
      data: {
        comments: result.comments.map((c) => c.toJSON()),
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  },
});

export const POST = apiHandler({
  validate: { body: createCommentSchema },
  handler: async (_req, ctx) => {
    await checkProjectAccess(ctx.params.id, ctx.user.userId, ctx.user.role);
    const body = ctx.body as CreateCommentInput;
    const comment = await CommentService.create(
      body,
      ctx.user.userId,
      'task',
      ctx.params.taskId,
    );
    return { data: comment.toJSON(), status: 201 };
  },
});
