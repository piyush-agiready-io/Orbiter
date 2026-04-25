import type { Role } from '@/shared/utils/constants';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  skills: string[];
  avatar?: string;
  isActive: boolean;
  inviteToken?: string;
  inviteExpiresAt?: Date;
  resetToken?: string;
  resetExpiresAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<
  IUser,
  'password' | 'inviteToken' | 'inviteExpiresAt' | 'resetToken' | 'resetExpiresAt'
>;
