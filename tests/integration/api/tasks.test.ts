import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { createProject, createTask } from '../../helpers/factory';
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

describe('POST /api/v1/projects/:id/tasks', () => {
  it('creates a task', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/tasks/route');
    const req = new Request('http://localhost/api/v1/projects/test/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Build login page' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.title).toBe('Build login page');
    expect(json.data.status).toBe('backlog');
    expect(json.data.priority).toBe('P2');
  });

  it('returns 400 for missing title', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/tasks/route');
    const req = new Request('http://localhost/api/v1/projects/test/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project._id.toString() }) });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/projects/:id/tasks', () => {
  it('lists tasks with filters', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    await createTask(project._id.toString(), { title: 'T1', priority: 'P0' });
    await createTask(project._id.toString(), { title: 'T2', priority: 'P3' });

    const { GET } = await import('@/app/api/v1/projects/[id]/tasks/route');
    const url = new URL('http://localhost/api/v1/projects/test/tasks?priority=P0');
    const req = new Request(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    Object.defineProperty(req, 'nextUrl', { value: url });

    const res = await GET(req, { params: Promise.resolve({ id: project._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.tasks).toHaveLength(1);
    expect(json.data.tasks[0].priority).toBe('P0');
  });

  it('lists all tasks when no filter', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    await createTask(project._id.toString(), { title: 'T1' });
    await createTask(project._id.toString(), { title: 'T2' });

    const { GET } = await import('@/app/api/v1/projects/[id]/tasks/route');
    const url = new URL('http://localhost/api/v1/projects/test/tasks');
    const req = new Request(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    Object.defineProperty(req, 'nextUrl', { value: url });

    const res = await GET(req, { params: Promise.resolve({ id: project._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.tasks).toHaveLength(2);
    expect(json.data.total).toBe(2);
  });
});

describe('GET /api/v1/tasks/:id', () => {
  it('returns a single task', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const task = await createTask(project._id.toString(), { title: 'My Task' });

    const { GET } = await import('@/app/api/v1/tasks/[id]/route');
    const req = new Request('http://localhost/api/v1/tasks/test', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await GET(req, { params: Promise.resolve({ id: task._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.title).toBe('My Task');
  });
});

describe('PATCH /api/v1/tasks/:id', () => {
  it('updates a task', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const task = await createTask(project._id.toString());

    const { PATCH } = await import('@/app/api/v1/tasks/[id]/route');
    const req = new Request('http://localhost/api/v1/tasks/test', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Updated Task', priority: 'P1' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: task._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.title).toBe('Updated Task');
    expect(json.data.priority).toBe('P1');
  });
});

describe('PATCH /api/v1/tasks/:id/status', () => {
  it('updates task status via drag-and-drop endpoint', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const task = await createTask(project._id.toString(), { status: 'backlog' });

    const { PATCH } = await import('@/app/api/v1/tasks/[id]/status/route');
    const req = new Request('http://localhost/api/v1/tasks/test/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'in_progress' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: task._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.status).toBe('in_progress');
  });
});

describe('PATCH /api/v1/tasks/bulk', () => {
  it('bulk updates task priority', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const t1 = await createTask(project._id.toString());
    const t2 = await createTask(project._id.toString());

    const { PATCH } = await import('@/app/api/v1/tasks/bulk/route');
    const req = new Request('http://localhost/api/v1/tasks/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        taskIds: [t1._id.toString(), t2._id.toString()],
        update: { priority: 'P0' },
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.modifiedCount).toBe(2);
  });
});

describe('DELETE /api/v1/tasks/:id', () => {
  it('deletes a task', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const task = await createTask(project._id.toString());

    const { DELETE } = await import('@/app/api/v1/tasks/[id]/route');
    const req = new Request('http://localhost/api/v1/tasks/test', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: task._id.toString() }) });
    expect(res.status).toBe(200);
  });
});
