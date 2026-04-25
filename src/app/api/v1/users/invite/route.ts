import { apiHandler } from '@/shared/middleware/api-handler';
import { requireRole } from '@/shared/middleware/role-guard';
import { UserService } from '@/modules/users/user.service';
import { inviteUserSchema } from '@/modules/users/user.validator';
import type { InviteUserInput } from '@/modules/users/user.validator';

export const POST = apiHandler({
  middleware: [requireRole('admin')],
  validate: { body: inviteUserSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as InviteUserInput;
    const result = await UserService.invite(body);
    return { data: result, status: 201 };
  },
});
