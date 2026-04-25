export type AuthMethod = 'manual' | 'oauth-device';

export interface IOpenAIConnection {
  _id: string;
  userId: string;
  authMethod: AuthMethod;
  apiKey?: string; // encrypted
  accessToken?: string; // encrypted
  refreshToken?: string; // encrypted
  idToken?: string;
  tokenExpiresAt?: Date;
  email?: string;
  accountId?: string;
  planType?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOpenAIDeviceSession {
  _id: string;
  userId: string;
  deviceAuthId: string;
  userCode: string;
  codeVerifier?: string;
  verificationUrl: string;
  expiresAt: Date;
  pollInterval: number;
  status: 'pending' | 'authorized' | 'expired';
  createdAt: Date;
}

export interface DeviceCodeResponse {
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn: number;
}

export interface OpenAIConnectionStatus {
  connected: boolean;
  authMethod?: AuthMethod;
  email?: string;
  planType?: string;
  tokenExpiresAt?: Date;
}
