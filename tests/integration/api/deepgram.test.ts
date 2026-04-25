import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';
import { callRoute } from '../../helpers/call-route';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    DEEPGRAM_API_KEY: '',
    CHROME_EXTENSION_ID: '',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('POST /api/v1/deepgram/token', () => {
  it('returns 401 without auth token', async () => {
    const route = await import('@/app/api/v1/deepgram/token/route');
    const { status, body } = await callRoute(route, 'POST', { token: '' });
    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 500 when Deepgram API key is not configured', async () => {
    const { token } = await getAuthenticatedUser();
    const route = await import('@/app/api/v1/deepgram/token/route');
    const { status, body } = await callRoute(route, 'POST', { token });
    expect(status).toBe(500);
    expect(body.success).toBe(false);
  });
});
