import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/shared/database/connection$': '<rootDir>/tests/__mocks__/database-connection.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next/server$': '<rootDir>/tests/__mocks__/next-server.ts',
  },
  testTimeout: 30000,
  transformIgnorePatterns: [
    '/node_modules/(?!(jose|nanoid)/)',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': 'ts-jest',
  },
};

export default config;
