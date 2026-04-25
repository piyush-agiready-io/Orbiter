import { setupTestDB, teardownTestDB, clearCollections } from '../../helpers/db';
import { createProject, createEpic } from '../../helpers/factory';
import { getAuthenticatedUser } from '../../helpers/auth';

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'test',
  },
}));

jest.mock('@/modules/tasks/task.model', () => ({
  Task: {
    countDocuments: jest.fn().mockResolvedValue(0),
  },
}));

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('POST /api/v1/projects/:id/epics', () => {
  it('creates an epic', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/epics/route');
    const req = new Request('http://localhost/api/v1/projects/test/epics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Auth Epic' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('Auth Epic');
    expect(json.data.status).toBe('planning');
  });

  it('returns 400 for missing title', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());

    const { POST } = await import('@/app/api/v1/projects/[id]/epics/route');
    const req = new Request('http://localhost/api/v1/projects/test/epics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });

    const res = await POST(req, { params: Promise.resolve({ id: project._id.toString() }) });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/projects/:id/epics', () => {
  it('lists epics for a project', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    await createEpic(project._id.toString(), user._id.toString(), { title: 'E1' });
    await createEpic(project._id.toString(), user._id.toString(), { title: 'E2' });

    const { GET } = await import('@/app/api/v1/projects/[id]/epics/route');
    const url = new URL('http://localhost/api/v1/projects/test/epics');
    const req = new Request(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    Object.defineProperty(req, 'nextUrl', { value: url });

    const res = await GET(req, { params: Promise.resolve({ id: project._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.epics).toHaveLength(2);
    expect(json.data.total).toBe(2);
  });
});

describe('GET /api/v1/epics/:id', () => {
  it('returns a single epic', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const epic = await createEpic(project._id.toString(), user._id.toString());

    const { GET } = await import('@/app/api/v1/epics/[id]/route');
    const req = new Request('http://localhost/api/v1/epics/test', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await GET(req, { params: Promise.resolve({ id: epic._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.title).toBe('Test Epic');
  });
});

describe('PATCH /api/v1/epics/:id', () => {
  it('updates an epic', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const epic = await createEpic(project._id.toString(), user._id.toString());

    const { PATCH } = await import('@/app/api/v1/epics/[id]/route');
    const req = new Request('http://localhost/api/v1/epics/test', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: 'Updated', status: 'active' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: epic._id.toString() }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.title).toBe('Updated');
    expect(json.data.status).toBe('active');
  });
});

describe('DELETE /api/v1/epics/:id', () => {
  it('deletes an epic', async () => {
    const { user, token } = await getAuthenticatedUser('internal');
    const project = await createProject(user._id.toString());
    const epic = await createEpic(project._id.toString(), user._id.toString());

    const { DELETE } = await import('@/app/api/v1/epics/[id]/route');
    const req = new Request('http://localhost/api/v1/epics/test', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: epic._id.toString() }) });
    expect(res.status).toBe(200);
  });
});
