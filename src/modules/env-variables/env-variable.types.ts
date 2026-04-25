export type EnvEnvironment = 'dev' | 'prod';

export interface IEnvVariable {
  _id: string;
  key: string;
  value: string;
  iv: string;
  authTag: string;
  environment: EnvEnvironment;
  project: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEnvVariableMasked {
  id: string;
  key: string;
  environment: EnvEnvironment;
  createdAt: Date;
  updatedAt: Date;
}
