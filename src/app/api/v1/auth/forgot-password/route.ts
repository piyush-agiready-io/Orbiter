import { apiHandler } from '@/shared/middleware/api-handler';
import { rateLimit } from '@/shared/middleware/rate-limiter';
import { AuthService } from '@/modules/auth/auth.service';
import { forgotPasswordSchema } from '@/modules/auth/auth.validator';
import type { ForgotPasswordInput } from '@/modules/auth/auth.validator';

export const POST = apiHandler({
  auth: false,
  rateLimit: rateLimit(10, 60 * 1000),
  validate: { body: forgotPasswordSchema },
  handler: async (_req, ctx) => {
    const body = ctx.body as ForgotPasswordInput;
    await AuthService.forgotPassword(body);

    // Always return success regardless of whether email exists
    return {
      data: { message: 'If an account with that email exists, a password reset link has been sent.' },
    };
  },
});
