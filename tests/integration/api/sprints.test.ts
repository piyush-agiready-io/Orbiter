import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { createProject, createSprint, createTask } from '../../helpers/factory';
import { getAuthenticatedUser } from '../../helpers/auth';

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

    const { POST } = await import('@/app/api/v1/projects/[id]/sprints/route');
    const req = new Request('http://localhost/api/v1/projects/test/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Sprint 1',
        startDate: '2026-05-04',
        endDate: '2026-05-15',
        goal: 'Auth system',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.name).toBe('Sprint 1');
    expect(json.data.status).toBe('planning');
  });
});

describe('GET /api/v1/projects/:id/sprints', () => {
  it('lists sprints', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    await createSprint(project._id.toString(), { name: 'S1' });
    await createSprint(project._id.toString(), { name: 'S2' });

    const { GET } = await import('@/app/api/v1/projects/[id]/sprints/route');
    const url = new URL('http://localhost/api/v1/projects/test/sprints');
    const req = new Request(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    Object.defineProperty(req, 'nextUrl', { value: url });

    const res = await GET(req, { params: Promise.resolve({ id: project._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.sprints).toHaveLength(2);
    expect(json.data.total).toBe(2);
  });
});

describe('GET /api/v1/sprints/:id', () => {
  it('returns a single sprint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString());

    const { GET } = await import('@/app/api/v1/sprints/[id]/route');
    const req = new Request('http://localhost/api/v1/sprints/test', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await GET(req, { params: Promise.resolve({ id: sprint._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.name).toBe('Sprint 1');
  });
});

describe('PATCH /api/v1/sprints/:id', () => {
  it('updates a sprint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString());

    const { PATCH } = await import('@/app/api/v1/sprints/[id]/route');
    const req = new Request('http://localhost/api/v1/sprints/test', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Updated Sprint', goal: 'New goal' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: sprint._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.name).toBe('Updated Sprint');
    expect(json.data.goal).toBe('New goal');
  });
});

describe('POST /api/v1/sprints/:id/close', () => {
  it('closes a sprint and computes velocity', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString(), { status: 'active' });
    await createTask(project._id.toString(), { sprint: sprint._id, status: 'done' });
    await createTask(project._id.toString(), { sprint: sprint._id, status: 'todo' });

    const { POST } = await import('@/app/api/v1/sprints/[id]/close/route');
    const req = new Request('http://localhost/api/v1/sprints/test/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ retroNotes: 'Good sprint' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: sprint._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('closed');
    expect(json.data.velocity.planned).toBe(2);
    expect(json.data.velocity.completed).toBe(1);
  });
});

describe('POST /api/v1/sprints/:id/tasks', () => {
  it('adds tasks to a sprint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString());
    const task = await createTask(project._id.toString());

    const { POST } = await import('@/app/api/v1/sprints/[id]/tasks/route');
    const req = new Request('http://localhost/api/v1/sprints/test/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ taskIds: [task._id.toString()] }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: sprint._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.added).toBe(1);
  });
});

describe('DELETE /api/v1/sprints/:id/tasks', () => {
  it('removes tasks from a sprint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const sprint = await createSprint(project._id.toString());
    const task = await createTask(project._id.toString(), { sprint: sprint._id });

    const { DELETE } = await import('@/app/api/v1/sprints/[id]/tasks/route');
    const req = new Request('http://localhost/api/v1/sprints/test/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ taskIds: [task._id.toString()] }),
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: sprint._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.removed).toBe(1);
  });
});
