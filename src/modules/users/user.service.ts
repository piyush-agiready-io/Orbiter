import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '@/modules/users/user.model';
import { NotFoundError, ConflictError } from '@/shared/middleware/api-handler';
import { sendInviteEmail } from '@/shared/lib/email';
import { PAGINATION_DEFAULTS, TOKEN_EXPIRY } from '@/shared/utils/constants';
import { escapeRegExp } from '@/shared/utils/escape-regex';
import { env } from '@/config/env';
import type { InviteUserInput, UpdateProfileInput } from './user.validator';

const SALT_ROUNDS = 12;

export const UserService = {
  async list(query: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.role) {
      filter.role = query.role;
    }
    if (query.search) {
      const regex = new RegExp(escapeRegExp(query.search), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('+inviteExpiresAt')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    const enriched = users.map((u) => {
      const json = u.toJSON();
      let inviteStatus: 'active' | 'pending' | 'expired' = 'active';
      if (!u.lastLoginAt) {
        inviteStatus = u.inviteExpiresAt && u.inviteExpiresAt < new Date() ? 'expired' : 'pending';
      }
      return { ...json, inviteStatus };
    });

    return { users: enriched, page, limit, total };
  },

  async invite(data: InviteUserInput) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const rawToken = nanoid(48);
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const placeholderPassword = await bcrypt.hash(nanoid(32), SALT_ROUNDS);

    const user = await User.create({
      name: data.email.split('@')[0],
      email: data.email,
      password: placeholderPassword,
      role: data.role,
      inviteToken: hashedToken,
      inviteExpiresAt: new Date(Date.now() + TOKEN_EXPIRY.INVITE),
    });

    const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/register/${rawToken}`;
    await sendInviteEmail(data.email, inviteUrl, data.role);

    return { user: user.toJSON(), inviteToken: rawToken };
  },

  async resendInvite(userId: string) {
    const user = await User.findById(userId).select('+inviteToken +inviteExpiresAt');
    if (!user) throw new NotFoundError('User');
    if (user.lastLoginAt) throw new ConflictError('User has already registered');

    const rawToken = nanoid(48);
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.inviteToken = hashedToken;
    user.inviteExpiresAt = new Date(Date.now() + TOKEN_EXPIRY.INVITE);
    await user.save();

    const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/register/${rawToken}`;
    await sendInviteEmail(user.email, inviteUrl, user.role);

    return { inviteToken: rawToken };
  },

  async getById(id: string) {
    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  },

  async updateProfile(id: string, data: UpdateProfileInput) {
    const user = await User.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  },

  async getProjectMembers(projectId: string) {
    const { Project } = await import('@/modules/projects/project.model');
    const project = await Project.findById(projectId).populate<{
      members: Array<{ _id: unknown; name: string; skills: string[] }>;
    }>('members', 'name skills');
    if (!project) return [];
    return project.members;
  },

  async deactivate(id: string) {
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { returnDocument: 'after' },
    );
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  },

  async removeFromPlatform(id: string) {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User');

    const { Project } = await import('@/modules/projects/project.model');
    await Project.updateMany(
      { $or: [{ members: id }, { clients: id }] },
      { $pull: { members: id, clients: id } },
    );

    if (!user.lastLoginAt) {
      await User.deleteOne({ _id: id });
      return { hardDeleted: true };
    }

    user.isActive = false;
    user.inviteToken = undefined;
    user.inviteExpiresAt = undefined;
    await user.save();
    return { hardDeleted: false };
  },
};
