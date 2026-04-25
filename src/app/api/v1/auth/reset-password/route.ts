import { apiHandler } from '@/shared/middleware/api-handler';
import { rateLimit } from '@/shared/middleware/rate-limiter';
import { AuthService } from '@/modules/auth/auth.service';
import { resetPasswordSchema } from '@/modules/auth/auth.validator';
import type { ResetPasswordInput } from '@/modules/auth/auth.validator';

export const POST = apiHandler({
  auth: false,
  rateLimit: rateLimit(10, 60 * 1000),
  validate: { body: resetPasswordSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as ResetPasswordInput;
    await AuthService.resetPassword(body);

    return {
      data: { message: 'Password has been reset successfully.' },
    };
  },
});
