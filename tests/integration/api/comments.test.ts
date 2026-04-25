import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';
import { createProject, createBug, createComment } from '../../helpers/factory';
import { callRoute } from '../../helpers/call-route';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('POST /api/v1/projects/:id/bugs/:bugId/comments', () => {
  it('creates a comment on a bug', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const route = await import('@/app/api/v1/projects/[id]/bugs/[bugId]/comments/route');
    const { status, body } = await callRoute(route, 'POST', {
      token,
      params: { id: project._id.toString(), bugId: bug._id.toString() },
      body: { content: 'A bug comment', mentions: [] },
    });
    expect(status).toBe(201);
    expect(body.data.content).toBe('A bug comment');
  });

  it('returns 400 for empty content', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const route = await import('@/app/api/v1/projects/[id]/bugs/[bugId]/comments/route');
    const { status } = await callRoute(route, 'POST', {
      token,
      params: { id: project._id.toString(), bugId: bug._id.toString() },
      body: { content: '', mentions: [] },
    });
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

    const route = await import('@/app/api/v1/projects/[id]/bugs/[bugId]/comments/route');
    const { status, body } = await callRoute(route, 'GET', {
      token,
      params: { id: project._id.toString(), bugId: bug._id.toString() },
    });
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

    const route = await import('@/app/api/v1/comments/[id]/route');
    const { status } = await callRoute(route, 'DELETE', {
      token,
      params: { id: comment._id.toString() },
    });
    expect(status).toBe(200);
  });

  it('returns 403 for non-author non-admin', async () => {
    const { user } = await getAuthenticatedUser();
    const { token: otherToken } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());
    const comment = await createComment(user._id.toString(), { bugId: bug._id.toString() });

    const route = await import('@/app/api/v1/comments/[id]/route');
    const { status } = await callRoute(route, 'DELETE', {
      token: otherToken,
      params: { id: comment._id.toString() },
    });
    expect(status).toBe(403);
  });
});
