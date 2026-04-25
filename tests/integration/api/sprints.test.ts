import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { createProject, createSprint, createTask } from '../../helpers/factory';
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

describe('POST /api/v1/projects/:id/sprints', () => {
  it('creates a sprint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());

    const route = await import('@/app/api/v1/projects/[id]/sprints/route');
    const { status, body } = await callRoute(route, 'POST', {
      token,
      params: { id: project._id.toString() },
      body: {
        name: 'Sprint 1',
        startDate: '2026-05-04',
        endDate: '2026-05-15',
        goal: 'Auth system',
      },
    });

    expect(status).toBe(201);
    expect(body.data.name).toBe('Sprint 1');
    expect(body.data.status).toBe('planning');
  });
});

describe('GET /api/v1/projects/:id/sprints', () => {
  it('lists sprints', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    await createSprint(project._id.toString(), { name: 'S1' });
    await createSprint(project._id.toString(), { name: 'S2' });

    const route = await import('@/app/api/v1/projects/[id]/sprints/route');
    const { status, body } = await callRoute(route, 'GET', {
      token,
      params: { id: project._id.toString() },
    });

    expect(status).toBe(200);
    expect(body.data.sprints).toHaveLength(2);
    expect(body.data.total).toBe(2);
  });
});

describe('GET /api/v1/sprints/:id', () => {
  it('returns a single sprint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString());

    const route = await import('@/app/api/v1/sprints/[id]/route');
    const { status, body } = await callRoute(route, 'GET', {
      token,
      params: { id: sprint._id.toString() },
    });

    expect(status).toBe(200);
    expect(body.data.name).toBe('Sprint 1');
  });
});

describe('PATCH /api/v1/sprints/:id', () => {
  it('updates a sprint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString());

    const route = await import('@/app/api/v1/sprints/[id]/route');
    const { status, body } = await callRoute(route, 'PATCH', {
      token,
      params: { id: sprint._id.toString() },
      body: { name: 'Updated Sprint', goal: 'New goal' },
    });

    expect(status).toBe(200);
    expect(body.data.name).toBe('Updated Sprint');
    expect(body.data.goal).toBe('New goal');
  });
});

describe('POST /api/v1/sprints/:id/close', () => {
  it('closes a sprint and computes velocity', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString(), { status: 'active' });
    await createTask(project._id.toString(), { sprint: sprint._id, status: 'done' });
    await createTask(project._id.toString(), { sprint: sprint._id, status: 'todo' });

    const route = await import('@/app/api/v1/sprints/[id]/close/route');
    const { status, body } = await callRoute(route, 'POST', {
      token,
      params: { id: sprint._id.toString() },
      body: { retroNotes: 'Good sprint' },
    });

    expect(status).toBe(200);
    expect(body.data.status).toBe('closed');
    expect(body.data.velocity.planned).toBe(2);
    expect(body.data.velocity.completed).toBe(1);
  });
});

describe('POST /api/v1/sprints/:id/tasks', () => {
  it('adds tasks to a sprint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString());
    const task = await createTask(project._id.toString());

    const route = await import('@/app/api/v1/sprints/[id]/tasks/route');
    const { status, body } = await callRoute(route, 'POST', {
      token,
      params: { id: sprint._id.toString() },
      body: { taskIds: [task._id.toString()] },
    });

    expect(status).toBe(200);
    expect(body.data.added).toBe(1);
  });
});

describe('DELETE /api/v1/sprints/:id/tasks', () => {
  it('removes tasks from a sprint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString());
    const task = await createTask(project._id.toString(), { sprint: sprint._id });

    const route = await import('@/app/api/v1/sprints/[id]/tasks/route');
    const { status, body } = await callRoute(route, 'DELETE', {
      token,
      params: { id: sprint._id.toString() },
      body: { taskIds: [task._id.toString()] },
    });

    expect(status).toBe(200);
    expect(body.data.removed).toBe(1);
  });
});
