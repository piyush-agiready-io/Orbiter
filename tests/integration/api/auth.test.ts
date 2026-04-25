import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { createUser, DEFAULT_PASSWORD } from '../../helpers/factory';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    SMTP_USER: '',
    SMTP_PASS: '',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeLoginRequest(body: Record<string, unknown>) {
  const url = 'http://localhost/api/v1/auth/login';
  const req = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  (req as any).nextUrl = new URL(url);
  return req;
}

describe('POST /api/v1/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const email = 'auth-test@test.com';
    await createUser({ email });

    const { POST } = await import('@/app/api/v1/auth/login/route');
    const res = await POST(makeLoginRequest({ email, password: DEFAULT_PASSWORD }) as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.accessToken).toBeDefined();
    expect(json.data.user.email).toBe(email);
    expect(res.headers.get('Set-Cookie')).toContain('refreshToken');
  });

  it('returns 401 for wrong password', async () => {
    const email = 'wrong-pass@test.com';
    await createUser({ email });

    const { POST } = await import('@/app/api/v1/auth/login/route');
    const res = await POST(makeLoginRequest({ email, password: 'WrongPassword1' }) as never);
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing email', async () => {
    const { POST } = await import('@/app/api/v1/auth/login/route');
    const res = await POST(makeLoginRequest({ password: DEFAULT_PASSWORD }) as never);
    expect(res.status).toBe(400);
  });

  it('returns 401 for non-existent user', async () => {
    const { POST } = await import('@/app/api/v1/auth/login/route');
    const res = await POST(makeLoginRequest({ email: 'nobody@test.com', password: DEFAULT_PASSWORD }) as never);
    expect(res.status).toBe(401);
  });
});
