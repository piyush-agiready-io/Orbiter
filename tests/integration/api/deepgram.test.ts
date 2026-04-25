import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';

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

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

afterEach(async () => {
  await clearCollections();
});

async function callRoute(
  routeModule: Record<string, (...args: unknown[]) => Promise<Response>>,
  method: string,
  opts: {
    token?: string;
    params?: Record<string, string>;
    body?: unknown;
  },
) {
  const url = new URL('http://localhost:3000/api/v1/deepgram/token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts.token) {
    headers['Authorization'] = `Bearer ${opts.token}`;
  }
  const req = new Request(url, {
    method,
    headers,
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  (req as Record<string, unknown>).nextUrl = url;
  const handler = routeModule[method]!;
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  return { status: res.status, body: await res.json() };
}

describe('POST /api/v1/deepgram/token', () => {
  it('returns 401 without auth token', async () => {
    const { POST } = await import('@/app/api/v1/deepgram/token/route');
    const { status, body } = await callRoute({ POST }, 'POST', {});

    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 500 when Deepgram API key is not configured', async () => {
    const { token } = await getAuthenticatedUser();

    const { POST } = await import('@/app/api/v1/deepgram/token/route');
    const { status, body } = await callRoute({ POST }, 'POST', { token });

    expect(status).toBe(500);
    expect(body.success).toBe(false);
  });
});
