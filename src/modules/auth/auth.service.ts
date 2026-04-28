import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { User } from '@/modules/users/user.model';
import { signAccessToken, signRefreshToken } from '@/shared/lib/tokens';
import { sendPasswordResetEmail } from '@/shared/lib/email';
import { AuthError } from '@/shared/middleware/auth';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { env } from '@/config/env';
import type { AuthResponse } from './auth.types';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validator';

const SALT_ROUNDS = 12;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const AuthService = {
  async login(data: LoginInput): Promise<AuthResponse> {
    const user = await User.findOne({ email: data.email, isActive: true }).select(
      '+password',
    );
    if (!user) {
      throw new AuthError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new AuthError('Invalid email or password');
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ userId: user._id.toString(), role: user.role }),
      signRefreshToken({ userId: user._id.toString(), role: user.role }),
    ]);

    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  },

  async register(data: RegisterInput): Promise<AuthResponse> {
    const hashedInviteToken = hashToken(data.inviteToken);
    const user = await User.findOne({
      inviteToken: hashedInviteToken,
      inviteExpiresAt: { $gt: new Date() },
    }).select('+inviteToken +inviteExpiresAt');

    if (!user) {
      throw new NotFoundError('Invalid or expired invite token');
    }

    user.name = data.name;
    user.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    user.inviteToken = undefined;
    user.inviteExpiresAt = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    // Now that the user has actually joined, add team members (admin/internal)
    // to every existing project. Clients stay scoped per-project.
    if (user.role !== 'client') {
      const { Project } = await import('@/modules/projects/project.model');
      await Project.updateMany(
        {},
        { $addToSet: { members: user._id } },
      );
    }

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ userId: user._id.toString(), role: user.role }),
      signRefreshToken({ userId: user._id.toString(), role: user.role }),
    ]);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  },

  async forgotPassword(data: ForgotPasswordInput): Promise<void> {
    const user = await User.findOne({ email: data.email, isActive: true });
    if (!user) return;

    const rawToken = nanoid(48);
    const hashedToken = hashToken(rawToken);

    user.resetToken = hashedToken;
    user.resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password/${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  },

  async resetPassword(data: ResetPasswordInput): Promise<void> {
    const hashedToken = hashToken(data.token);
    const user = await User.findOne({
      resetToken: hashedToken,
      resetExpiresAt: { $gt: new Date() },
    }).select('+resetToken +resetExpiresAt');

    if (!user) {
      throw new NotFoundError('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(data.password, SALT_ROUNDS);
    user.resetToken = undefined;
    user.resetExpiresAt = undefined;
    await user.save();
  },
};
