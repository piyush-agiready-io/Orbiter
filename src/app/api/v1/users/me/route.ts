import { apiHandler } from '@/shared/middleware/api-handler';
import { UserService } from '@/modules/users/user.service';
import { updateProfileSchema } from '@/modules/users/user.validator';
import type { UpdateProfileInput } from '@/modules/users/user.validator';

export const GET = apiHandler({
  handler: async (_req, ctx) => {
    const user = await UserService.getById(ctx.user.userId);
    return { data: user.toJSON() };
  },
});

export const PATCH = apiHandler({
  validate: { body: updateProfileSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as UpdateProfileInput;
    const user = await UserService.updateProfile(ctx.user.userId, body);
    return { data: user.toJSON() };
  },
});
