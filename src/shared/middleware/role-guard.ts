import type { Role } from '@/shared/utils/constants';
import type { AuthenticatedUser } from './auth';

export class ForbiddenError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function requireRole(...roles: Role[]) {
  return (user: AuthenticatedUser): void => {
    if (!roles.includes(user.role)) {
      throw new ForbiddenError(`Role '${user.role}' cannot access this resource`);
    }
  };
}
