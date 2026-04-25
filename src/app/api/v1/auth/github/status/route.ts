import { apiHandler } from '@/shared/middleware/api-handler';
import { User } from '@/modules/users/user.model';

export const GET = apiHandler({
  handler: async (_req, { user }) => {
    const u = await User.findById(user.userId).select('+githubOAuth').lean();
    return {
      data: {
        connected: !!u?.githubOAuth?.githubId,
        username: u?.githubOAuth?.username ?? null,
      },
    };
  },
});
