import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { getAuthenticatedUser } from '../../helpers/auth';
import { createProject, createBug } from '../../helpers/factory';
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

describe('POST /api/v1/projects/:id/bugs', () => {
  it('creates a bug', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());

    const route = await import('@/app/api/v1/projects/[id]/bugs/route');
    const { status, body } = await callRoute(route, 'POST', {
      token,
      params: { id: project._id.toString() },
      body: { title: 'New bug', priority: 'P1' },
    });
    expect(status).toBe(201);
    expect(body.data.title).toBe('New bug');
    expect(body.data.priority).toBe('P1');
    expect(body.data.status).toBe('open');
  });

  it('returns 400 for missing title', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());

    const route = await import('@/app/api/v1/projects/[id]/bugs/route');
    const { status } = await callRoute(route, 'POST', {
      token,
      params: { id: project._id.toString() },
      body: { priority: 'P1' },
    });
    expect(status).toBe(400);
  });
});

describe('GET /api/v1/projects/:id/bugs', () => {
  it('lists bugs with pagination', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    await createBug(project._id.toString(), user._id.toString());
    await createBug(project._id.toString(), user._id.toString());

    const route = await import('@/app/api/v1/projects/[id]/bugs/route');
    const { status, body } = await callRoute(route, 'GET', {
      token,
      params: { id: project._id.toString() },
    });
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

    const route = await import('@/app/api/v1/bugs/[id]/route');
    const { status, body } = await callRoute(route, 'GET', {
      token,
      params: { id: bug._id.toString() },
    });
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

    const route = await import('@/app/api/v1/bugs/[id]/route');
    const { status, body } = await callRoute(route, 'PATCH', {
      token,
      params: { id: bug._id.toString() },
      body: { status: 'investigating' },
    });
    expect(status).toBe(200);
    expect(body.data.status).toBe('investigating');
  });
});

describe('DELETE /api/v1/bugs/:id', () => {
  it('deletes a bug', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const route = await import('@/app/api/v1/bugs/[id]/route');
    const { status } = await callRoute(route, 'DELETE', {
      token,
      params: { id: bug._id.toString() },
    });
    expect(status).toBe(200);
  });

  it('returns 403 for client role', async () => {
    const { user: admin } = await getAuthenticatedUser('admin');
    const { token: clientToken } = await getAuthenticatedUser('client');
    const project = await createProject(admin._id.toString());
    const bug = await createBug(project._id.toString(), admin._id.toString());

    const route = await import('@/app/api/v1/bugs/[id]/route');
    const { status } = await callRoute(route, 'DELETE', {
      token: clientToken,
      params: { id: bug._id.toString() },
    });
    expect(status).toBe(403);
  });
});

describe('PATCH /api/v1/bugs/:id/link', () => {
  it('unlinks a bug from task', async () => {
    const { user, token } = await getAuthenticatedUser();
    const project = await createProject(user._id.toString());
    const bug = await createBug(project._id.toString(), user._id.toString());

    const route = await import('@/app/api/v1/bugs/[id]/link/route');
    const { status, body } = await callRoute(route, 'PATCH', {
      token,
      params: { id: bug._id.toString() },
      body: { taskId: null },
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });
});
