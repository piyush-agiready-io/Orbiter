import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';
import { createProject, createBug } from '../../helpers/factory';

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
  const url = new URL('http://localhost:3000/api/v1/test');
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
  (req as Record<string, unknown>).nextUrl = url;
  const handler = routeModule[method]!;
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  return { status: res.status, body: await res.json() };
}

describe('POST /api/v1/projects/:id/bugs', () => {
  it('creates a bug', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/bugs/route');
    const { status, body } = await callRoute(
      { POST },
      'POST',
      {
        token,
        params: { id: project._id.toString() },
        body: { title: 'New bug', priority: 'P1' },
      },
    );
    expect(status).toBe(201);
    expect(body.data.title).toBe('New bug');
    expect(body.data.priority).toBe('P1');
    expect(body.data.status).toBe('open');
  });

  it('returns 400 for missing title', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/bugs/route');
    const { status } = await callRoute(
      { POST },
      'POST',
      {
        token,
        params: { id: project._id.toString() },
        body: { priority: 'P1' },
      },
    );
    expect(status).toBe(400);
  });
});

describe('GET /api/v1/projects/:id/bugs', () => {
  it('lists bugs with pagination', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    await createBug(project._id.toString(), user._id.toString());
    await createBug(project._id.toString(), user._id.toString());

    const { GET } = await import('@/app/api/v1/projects/[id]/bugs/route');
    const { status, body } = await callRoute(
      { GET },
      'GET',
      { token, params: { id: project._id.toString() } },
    );
    expect(status).toBe(200);
    expect(body.data.bugs).toHaveLength(2);
    expect(body.data.total).toBe(2);
  });
});

describe('GET /api/v1/bugs/:id', () => {
  it('returns bug with populated reporter', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { GET } = await import('@/app/api/v1/bugs/[id]/route');
    const { status, body } = await callRoute(
      { GET },
      'GET',
      { token, params: { id: bug._id.toString() } },
    );
    expect(status).toBe(200);
    expect(body.data.title).toBe('Test Bug');
    expect(body.data.reporter.name).toBe('Test User');
  });
});

describe('PATCH /api/v1/bugs/:id', () => {
  it('updates bug status', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { PATCH } = await import('@/app/api/v1/bugs/[id]/route');
    const { status, body } = await callRoute(
      { PATCH },
      'PATCH',
      {
        token,
        params: { id: bug._id.toString() },
        body: { status: 'investigating' },
      },
    );
    expect(status).toBe(200);
    expect(body.data.status).toBe('investigating');
  });
});

describe('DELETE /api/v1/bugs/:id', () => {
  it('deletes a bug', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { DELETE } = await import('@/app/api/v1/bugs/[id]/route');
    const { status } = await callRoute(
      { DELETE },
      'DELETE',
      { token, params: { id: bug._id.toString() } },
    );
    expect(status).toBe(200);
  });

  it('returns 403 for client role', async () => {
    const { user: admin } = await getAuthenticatedUser('admin');
    const { token: clientToken } = await getAuthenticatedUser('client');
    const project = await createProject(admin._id.toString());
    const bug = await createBug(project._id.toString(), admin._id.toString());

    const { DELETE } = await import('@/app/api/v1/bugs/[id]/route');
    const { status } = await callRoute(
      { DELETE },
      'DELETE',
      { token: clientToken, params: { id: bug._id.toString() } },
    );
    expect(status).toBe(403);
  });
});

describe('PATCH /api/v1/bugs/:id/link', () => {
  it('unlinks a bug from task', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { PATCH } = await import('@/app/api/v1/bugs/[id]/link/route');
    const { status, body } = await callRoute(
      { PATCH },
      'PATCH',
      {
        token,
        params: { id: bug._id.toString() },
        body: { taskId: null },
      },
    );
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});
