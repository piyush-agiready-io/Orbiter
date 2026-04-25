import type { SafeUser } from '@/modules/users/user.types';

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}
