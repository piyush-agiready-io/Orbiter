import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';
import { createNotification } from '../../helpers/factory';

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

async function callRoute(
  routeModule: Record<string, (...args: unknown[]) => unknown>,
  method: string,
  opts: {
    token: string;
    params?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  },
) {
  const url = new URL('http://localhost:3000/api/v1/notifications');
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const req = new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  // apiHandler accesses req.nextUrl.searchParams for query validation
  (req as Record<string, unknown>).nextUrl = url;
  const handler = routeModule[method]!;
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  return { status: res.status, body: await res.json() };
}

describe('GET /api/v1/notifications', () => {
  it('returns user notifications', async () => {
    const { user, token } = await getAuthenticatedUser();
    await createNotification(user._id.toString(), { title: 'N1' });
    await createNotification(user._id.toString(), { title: 'N2' });

    const { GET } = await import('@/app/api/v1/notifications/route');
    const { status, body } = await callRoute({ GET }, 'GET', { token });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.notifications).toHaveLength(2);
    expect(body.data.total).toBe(2);
  });

  it('returns 401 without auth', async () => {
    const { GET } = await import('@/app/api/v1/notifications/route');
    const { status, body } = await callRoute({ GET }, 'GET', { token: 'invalid' });
    expect(status).toBe(401);
    expect(body.success).toBe(false);
  });
});

describe('GET /api/v1/notifications/unread-count', () => {
  it('returns unread count', async () => {
    const { user, token } = await getAuthenticatedUser();
    await createNotification(user._id.toString(), { read: false });
    await createNotification(user._id.toString(), { read: true });

    const { GET } = await import('@/app/api/v1/notifications/unread-count/route');
    const { status, body } = await callRoute({ GET }, 'GET', { token });
    expect(status).toBe(200);
    expect(body.data.count).toBe(1);
  });
});

describe('POST /api/v1/notifications/mark-all-read', () => {
  it('marks all notifications as read', async () => {
    const { user, token } = await getAuthenticatedUser();
    await createNotification(user._id.toString(), { read: false });
    await createNotification(user._id.toString(), { read: false });

    const { POST } = await import('@/app/api/v1/notifications/mark-all-read/route');
    const { status, body } = await callRoute({ POST }, 'POST', { token });
    expect(status).toBe(200);
    expect(body.success).toBe(true);

    const { GET } = await import('@/app/api/v1/notifications/unread-count/route');
    const countRes = await callRoute({ GET }, 'GET', { token });
    expect(countRes.body.data.count).toBe(0);
  });
});

describe('PATCH /api/v1/notifications/:id/read', () => {
  it('marks a single notification as read', async () => {
    const { user, token } = await getAuthenticatedUser();
    const notif = await createNotification(user._id.toString());

    const { PATCH } = await import('@/app/api/v1/notifications/[id]/read/route');
    const { status, body } = await callRoute(
      { PATCH },
      'PATCH',
      { token, params: { id: notif._id.toString() } },
    );
    expect(status).toBe(200);
    expect(body.data.read).toBe(true);
  });

  it('returns 404 for another users notification', async () => {
    const { token: ownerToken } = await getAuthenticatedUser();
    const { user: other } = await getAuthenticatedUser();
    const notif = await createNotification(other._id.toString());

    const { PATCH } = await import('@/app/api/v1/notifications/[id]/read/route');
    const { status } = await callRoute(
      { PATCH },
      'PATCH',
      { token: ownerToken, params: { id: notif._id.toString() } },
    );
    expect(status).toBe(404);
  });
});
