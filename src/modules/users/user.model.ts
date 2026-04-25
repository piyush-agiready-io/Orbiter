import { Schema, model, models, type Document } from 'mongoose';
import { ROLES, type Role } from '@/shared/utils/constants';

export interface GitHubOAuth {
  accessToken: string; // encrypted (iv:authTag:encrypted)
  githubId: string;
  username: string;
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  skills: string[];
  avatar?: string;
  githubOAuth?: GitHubOAuth;
  isActive: boolean;
  inviteToken?: string;
  inviteExpiresAt?: Date;
  resetToken?: string;
  resetExpiresAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'internal' as Role,
    },
    skills: {
      type: [String],
      default: [],
    },
    avatar: {
      type: String,
    },
    githubOAuth: {
      type: {
        accessToken: { type: String, required: true },
        githubId: { type: String, required: true },
        username: { type: String, required: true },
      },
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inviteToken: {
      type: String,
      select: false,
    },
    inviteExpiresAt: {
      type: Date,
      select: false,
    },
    resetToken: {
      type: String,
      select: false,
    },
    resetExpiresAt: {
      type: Date,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.inviteToken;
        delete ret.inviteExpiresAt;
        delete ret.resetToken;
        delete ret.resetExpiresAt;
        delete ret.githubOAuth;
        return ret;
      },
    },
  },
);

userSchema.index({ inviteToken: 1 });

export const User = (models.User as typeof import('mongoose').Model<UserDocument>) || model<UserDocument>('User', userSchema);
