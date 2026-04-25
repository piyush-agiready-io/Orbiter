import { Schema, model, models, type Document } from 'mongoose';

export interface OpenAIDeviceSessionDocument extends Document {
  userId: Schema.Types.ObjectId;
  deviceAuthId: string;
  userCode: string;
  codeVerifier?: string;
  verificationUrl: string;
  expiresAt: Date;
  pollInterval: number;
  status: 'pending' | 'authorized' | 'expired';
  createdAt: Date;
}

const openaiDeviceSessionSchema = new Schema<OpenAIDeviceSessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    deviceAuthId: { type: String, required: true },
    userCode: { type: String, required: true },
    codeVerifier: String,
    verificationUrl: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    pollInterval: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ['pending', 'authorized', 'expired'],
      default: 'pending',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Auto-delete expired sessions after 1 hour
openaiDeviceSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const OpenAIDeviceSessionModel =
  (models.OpenAIDeviceSession as typeof import('mongoose').Model<OpenAIDeviceSessionDocument>) ||
  model<OpenAIDeviceSessionDocument>('OpenAIDeviceSession', openaiDeviceSessionSchema);
