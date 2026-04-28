import { apiHandler, ConflictError } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { UserService } from '@/modules/users/user.service';
import { updateUserRoleSchema } from '@/modules/users/user.validator';
import type { UpdateUserRoleInput } from '@/modules/users/user.validator';

export const DELETE = apiHandler({
  middleware: [requireRole('admin')],
  handler: async (_req, ctx) => {
    if (ctx.params.id === ctx.user.userId) {
      return { data: null, status: 400 };
    }
    const result = await UserService.removeFromPlatform(ctx.params.id);
    return { data: { deleted: true, hardDeleted: result.hardDeleted } };
  },
});

export const PATCH = apiHandler({
  middleware: [requireRole('admin')],
  validate: { body: updateUserRoleSchema },
  handler: async (_req, ctx) => {
    if (ctx.params.id === ctx.user.userId) {
      throw new ConflictError("You can't change your own role");
    }
    const body = ctx.body as UpdateUserRoleInput;
    const user = await UserService.updateRole(ctx.params.id, body.role);
    return { data: user.toJSON() };
  },
});
