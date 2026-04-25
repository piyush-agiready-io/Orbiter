import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { createProject, createTask } from '../../helpers/factory';
import { getAuthenticatedUser } from '../../helpers/auth';
import { callRoute } from '../../helpers/call-route';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'test',
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('POST /api/v1/projects/:id/tasks', () => {
  it('creates a task', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());

    const route = await import('@/app/api/v1/projects/[id]/tasks/route');
    const { status, body } = await callRoute(route, 'POST', {
      token,
      params: { id: project._id.toString() },
      body: { title: 'Build login page' },
    });

    expect(status).toBe(201);
    expect(body.data.title).toBe('Build login page');
    expect(body.data.status).toBe('backlog');
    expect(body.data.priority).toBe('P2');
  });

  it('returns 400 for missing title', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());

    const route = await import('@/app/api/v1/projects/[id]/tasks/route');
    const { status } = await callRoute(route, 'POST', {
      token,
      params: { id: project._id.toString() },
      body: {},
    });

    expect(status).toBe(400);
  });
});

describe('GET /api/v1/projects/:id/tasks', () => {
  it('lists tasks with filters', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    await createTask(project._id.toString(), { title: 'T1', priority: 'P0' });
    await createTask(project._id.toString(), { title: 'T2', priority: 'P3' });

    const route = await import('@/app/api/v1/projects/[id]/tasks/route');
    const { status, body } = await callRoute(route, 'GET', {
      token,
      params: { id: project._id.toString() },
      query: { priority: 'P0' },
    });

    expect(status).toBe(200);
    expect(body.data.tasks).toHaveLength(1);
    expect(body.data.tasks[0].priority).toBe('P0');
  });

  it('lists all tasks when no filter', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    await createTask(project._id.toString(), { title: 'T1' });
    await createTask(project._id.toString(), { title: 'T2' });

    const route = await import('@/app/api/v1/projects/[id]/tasks/route');
    const { status, body } = await callRoute(route, 'GET', {
      token,
      params: { id: project._id.toString() },
    });

    expect(status).toBe(200);
    expect(body.data.tasks).toHaveLength(2);
    expect(body.data.total).toBe(2);
  });
});

describe('GET /api/v1/tasks/:id', () => {
  it('returns a single task', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const task = await createTask(project._id.toString(), { title: 'My Task' });

    const route = await import('@/app/api/v1/tasks/[id]/route');
    const { status, body } = await callRoute(route, 'GET', {
      token,
      params: { id: task._id.toString() },
    });

    expect(status).toBe(200);
    expect(body.data.title).toBe('My Task');
  });
});

describe('PATCH /api/v1/tasks/:id', () => {
  it('updates a task', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const task = await createTask(project._id.toString());

    const route = await import('@/app/api/v1/tasks/[id]/route');
    const { status, body } = await callRoute(route, 'PATCH', {
      token,
      params: { id: task._id.toString() },
      body: { title: 'Updated Task', priority: 'P1' },
    });

    expect(status).toBe(200);
    expect(body.data.title).toBe('Updated Task');
    expect(body.data.priority).toBe('P1');
  });
});

describe('PATCH /api/v1/tasks/:id/status', () => {
  it('updates task status via drag-and-drop endpoint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const task = await createTask(project._id.toString(), { status: 'backlog' });

    const route = await import('@/app/api/v1/tasks/[id]/status/route');
    const { status, body } = await callRoute(route, 'PATCH', {
      token,
      params: { id: task._id.toString() },
      body: { status: 'in_progress' },
    });

    expect(status).toBe(200);
    expect(body.data.status).toBe('in_progress');
  });
});

describe('PATCH /api/v1/tasks/bulk', () => {
  it('bulk updates task priority', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const t1 = await createTask(project._id.toString());
    const t2 = await createTask(project._id.toString());

    const route = await import('@/app/api/v1/tasks/bulk/route');
    const { status, body } = await callRoute(route, 'PATCH', {
      token,
      body: {
        taskIds: [t1._id.toString(), t2._id.toString()],
        update: { priority: 'P0' },
      },
    });

    expect(status).toBe(200);
    expect(body.data.modifiedCount).toBe(2);
  });
});

describe('DELETE /api/v1/tasks/:id', () => {
  it('deletes a task', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const task = await createTask(project._id.toString());

    const route = await import('@/app/api/v1/tasks/[id]/route');
    const { status } = await callRoute(route, 'DELETE', {
      token,
      params: { id: task._id.toString() },
    });

    expect(status).toBe(200);
  });
});
