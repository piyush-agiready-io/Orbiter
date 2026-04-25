import { apiHandler } from '@/shared/middleware/api-handler';
import { User } from '@/modules/users/user.model';

export const POST = apiHandler({
  handler: async (_req, { user }) => {
    await User.findByIdAndUpdate(user.userId, {
      $unset: { githubOAuth: 1 },
    });
    return { data: { disconnected: true } };
  },
});
