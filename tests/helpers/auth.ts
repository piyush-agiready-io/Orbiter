import { signAccessToken } from '@/shared/lib/tokens';
import { createUser } from './factory';
import type { Role } from '@/shared/utils/constants';

export async function getAuthenticatedUser(role: Role = 'internal') {
  const user = await createUser({ role });
  const token = await signAccessToken({ userId: user._id.toString(), role });
  return { user, token };
}
