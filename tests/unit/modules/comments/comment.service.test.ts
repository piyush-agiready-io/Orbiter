jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { json: jest.fn() },
}), { virtual: true });

jest.mock('@/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    MONGODB_URI: 'mongodb://localhost:27017/test',
    NODE_ENV: 'test',
  },
}));

import { setupTestDB, teardownTestDB, clearCollections } from '../../../helpers/db';
import { createUser, createProject, createBug, createComment } from '../../../helpers/factory';
import { CommentService } from '@/modules/comments/comment.service';

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
afterEach(async () => { await clearCollections(); });

describe('CommentService', () => {
  describe('create', () => {
    it('creates a comment on a bug', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      const comment = await CommentService.create(
        { content: 'This is a comment', mentions: [] },
        user._id.toString(),
        'bug',
        bug._id.toString(),
      );
      expect(comment.content).toBe('This is a comment');
      expect(comment.author.toString()).toBe(user._id.toString());
      expect(comment.bugId!.toString()).toBe(bug._id.toString());
    });

    it('dispatches mention notifications', async () => {
      const author = await createUser();
      const mentioned = await createUser();
      const project = await createProject(author._id.toString());
      const bug = await createBug(project._id.toString(), author._id.toString());

      await CommentService.create(
        { content: 'Hey check this', mentions: [mentioned._id.toString()] },
        author._id.toString(),
        'bug',
        bug._id.toString(),
      );

      const { NotificationService } = await import(
        '@/modules/notifications/notification.service'
      );
      const result = await NotificationService.list(mentioned._id.toString(), { page: 1, limit: 10 });
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].type).toBe('comment_mention');
    });
  });

  describe('list', () => {
    it('returns comments for a bug in chronological order', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());

      await createComment(user._id.toString(), { bugId: bug._id.toString(), content: 'First' });
      await createComment(user._id.toString(), { bugId: bug._id.toString(), content: 'Second' });

      const result = await CommentService.list('bug', bug._id.toString(), { page: 1, limit: 50 });
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0].content).toBe('First');
      expect(result.comments[1].content).toBe('Second');
    });
  });

  describe('delete', () => {
    it('allows author to delete their comment', async () => {
      const user = await createUser();
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());
      const comment = await createComment(user._id.toString(), { bugId: bug._id.toString() });

      await CommentService.delete(comment._id.toString(), user._id.toString(), 'internal');
      const result = await CommentService.list('bug', bug._id.toString(), { page: 1, limit: 50 });
      expect(result.comments).toHaveLength(0);
    });

    it('allows admin to delete any comment', async () => {
      const user = await createUser();
      const admin = await createUser({ role: 'admin' });
      const project = await createProject(user._id.toString());
      const bug = await createBug(project._id.toString(), user._id.toString());
      const comment = await createComment(user._id.toString(), { bugId: bug._id.toString() });

      await CommentService.delete(comment._id.toString(), admin._id.toString(), 'admin');
      const result = await CommentService.list('bug', bug._id.toString(), { page: 1, limit: 50 });
      expect(result.comments).toHaveLength(0);
    });

    it('throws ForbiddenError when non-author non-admin tries to delete', async () => {
      const author = await createUser();
      const other = await createUser();
      const project = await createProject(author._id.toString());
      const bug = await createBug(project._id.toString(), author._id.toString());
      const comment = await createComment(author._id.toString(), { bugId: bug._id.toString() });

      await expect(
        CommentService.delete(comment._id.toString(), other._id.toString(), 'internal'),
      ).rejects.toThrow('Only the author or an admin can delete this comment');
    });
  });
});
