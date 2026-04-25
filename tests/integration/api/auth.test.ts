import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  await clearCollections();
});

describe('POST /api/v1/auth/login', () => {
  it('placeholder: returns tokens for valid credentials', () => {
    expect(true).toBe(true);
  });

  it('placeholder: returns 401 for wrong password', () => {
    expect(true).toBe(true);
  });

  it('placeholder: returns 400 for missing email', () => {
    expect(true).toBe(true);
  });
});
