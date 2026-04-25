import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';
import { createProject, createBug, createComment } from '../../helpers/factory';

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

describe('POST /api/v1/projects/:id/bugs/:bugId/comments', () => {
  it('creates a comment on a bug', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/bugs/[bugId]/comments/route');
    const { status, body } = await callRoute(
      { POST },
      'POST',
      {
        token,
        params: { id: project._id.toString(), bugId: bug._id.toString() },
        body: { content: 'A bug comment', mentions: [] },
      },
    );
    expect(status).toBe(201);
    expect(body.data.content).toBe('A bug comment');
  });

  it('returns 400 for empty content', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/bugs/[bugId]/comments/route');
    const { status } = await callRoute(
      { POST },
      'POST',
      {
        token,
        params: { id: project._id.toString(), bugId: bug._id.toString() },
        body: { content: '', mentions: [] },
      },
    );
    expect(status).toBe(400);
  });
});

describe('GET /api/v1/projects/:id/bugs/:bugId/comments', () => {
  it('lists bug comments', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());
    await createComment(user._id.toString(), { bugId: bug._id.toString(), content: 'C1' });
    await createComment(user._id.toString(), { bugId: bug._id.toString(), content: 'C2' });

    const { GET } = await import('@/app/api/v1/projects/[id]/bugs/[bugId]/comments/route');
    const { status, body } = await callRoute(
      { GET },
      'GET',
      { token, params: { id: project._id.toString(), bugId: bug._id.toString() } },
    );
    expect(status).toBe(200);
    expect(body.data.comments).toHaveLength(2);
  });
});

describe('DELETE /api/v1/comments/:id', () => {
  it('allows author to delete', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());
    const comment = await createComment(user._id.toString(), { bugId: bug._id.toString() });

    const { DELETE } = await import('@/app/api/v1/comments/[id]/route');
    const { status } = await callRoute(
      { DELETE },
      'DELETE',
      { token, params: { id: comment._id.toString() } },
    );
    expect(status).toBe(200);
  });

  it('returns 403 for non-author non-admin', async () => {
    const { user } = await getAuthenticatedUser();
    const { token: otherToken } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());
    const comment = await createComment(user._id.toString(), { bugId: bug._id.toString() });

    const { DELETE } = await import('@/app/api/v1/comments/[id]/route');
    const { status } = await callRoute(
      { DELETE },
      'DELETE',
      { token: otherToken, params: { id: comment._id.toString() } },
    );
    expect(status).toBe(403);
  });
});
