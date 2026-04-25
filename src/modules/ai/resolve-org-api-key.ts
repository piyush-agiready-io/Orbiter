import { OpenAIConnectionModel } from './openai-connection.model';
import { User } from '@/modules/users/user.model';
import { OpenAIConnectionService } from './openai-connection.service';
import type { ResolvedKey } from './resolve-api-key';

export async function resolveOrgApiKey(): Promise<ResolvedKey | null> {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
  if (admins.length === 0) return null;

  const adminIds = admins.map((a) => a._id.toString());

  for (const adminId of adminIds) {
    const result = await OpenAIConnectionService.getValidAccessToken(adminId);
    if (result) {
      return {
        token: result.accessToken,
        accountId: result.accountId,
        source: result.accountId ? 'oauth' : 'manual',
      };
    }
  }

  return null;
}
