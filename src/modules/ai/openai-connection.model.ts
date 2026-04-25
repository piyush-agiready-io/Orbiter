import { Schema, model, models, type Document } from 'mongoose';
import type { AuthMethod } from './openai-connection.types';

export interface OpenAIConnectionDocument extends Document {
  userId: Schema.Types.ObjectId;
  authMethod: AuthMethod;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  tokenExpiresAt?: Date;
  email?: string;
  accountId?: string;
  planType?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const openaiConnectionSchema = new Schema<OpenAIConnectionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    authMethod: {
      type: String,
      enum: ['manual', 'oauth-device'],
      required: true,
    },
    apiKey: String,
    accessToken: String,
    refreshToken: String,
    idToken: String,
    tokenExpiresAt: Date,
    email: String,
    accountId: String,
    planType: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // Never expose encrypted tokens in JSON
        delete ret.apiKey;
        delete ret.accessToken;
        delete ret.refreshToken;
        delete ret.idToken;
        delete ret.__v;
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

export const OpenAIConnectionModel =
  (models.OpenAIConnection as typeof import('mongoose').Model<OpenAIConnectionDocument>) ||
  model<OpenAIConnectionDocument>('OpenAIConnection', openaiConnectionSchema);
