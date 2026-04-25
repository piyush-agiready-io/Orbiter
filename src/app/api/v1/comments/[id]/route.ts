import { apiHandler } from '@/shared/middleware/api-handler';
import { CommentService } from '@/modules/comments/comment.service';

export const DELETE = apiHandler({
  handler: async (_req, ctx) => {
    await CommentService.delete(ctx.params.id, ctx.user.userId, ctx.user.role);
    return { data: { deleted: true } };
  },
});
