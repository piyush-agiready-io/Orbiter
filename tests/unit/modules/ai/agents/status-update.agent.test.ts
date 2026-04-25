import { processStatusUpdate } from '@/modules/ai/agents/status-update.agent';
import { GitHubService } from '@/modules/github/github.service';
import { Task } from '@/modules/tasks/task.model';
import { Bug } from '@/modules/bugs/bug.model';
import { Notification } from '@/modules/notifications/notification.model';
import { Project } from '@/modules/projects/project.model';

// Mock all models and services
jest.mock('@/modules/github/github.service');
jest.mock('@/modules/tasks/task.model');
jest.mock('@/modules/bugs/bug.model');
jest.mock('@/modules/notifications/notification.model');
jest.mock('@/modules/projects/project.model');

const mockExtractTaskId = GitHubService.extractTaskId as jest.Mock;
const mockTaskFindOne = Task.findOne as jest.Mock;
const mockTaskFindById = Task.findById as jest.Mock;
const mockBugFind = Bug.find as jest.Mock;
const mockNotificationCreate = Notification.create as jest.Mock;
const mockProjectFindById = Project.findById as jest.Mock;

describe('processStatusUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationCreate.mockResolvedValue({});
  });

  it('extracts task ID from branch name and updates status to done', async () => {
    mockExtractTaskId.mockReturnValueOnce('123');

    const mockTask = {
      _id: 'task-obj-id',
      title: 'Add login page',
      status: 'in_progress',
      clientVisible: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockTaskFindOne.mockResolvedValue(mockTask);
    mockBugFind.mockResolvedValue([]);

    const result = await processStatusUpdate(
      'project-1',
      'feature/TASK-123-add-login',
    );

    expect(mockExtractTaskId).toHaveBeenCalledWith('feature/TASK-123-add-login');
    expect(mockTaskFindOne).toHaveBeenCalledWith({ project: 'project-1', order: 123 });
    expect(mockTask.status).toBe('done');
    expect(mockTask.save).toHaveBeenCalled();
    expect(result).toEqual({
      taskId: 'task-obj-id',
      actions: ['status_updated_to_done'],
    });
  });

  it('extracts task ID from PR title when branch has none', async () => {
    mockExtractTaskId
      .mockReturnValueOnce(null)   // branch name
      .mockReturnValueOnce('42');  // PR title

    const mockTask = {
      _id: 'task-42',
      title: 'Fix bug',
      status: 'review',
      clientVisible: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockTaskFindOne.mockResolvedValue(mockTask);
    mockBugFind.mockResolvedValue([]);

    const result = await processStatusUpdate(
      'project-1',
      'main',
      'Fix login bug (fixes #42)',
    );

    expect(mockExtractTaskId).toHaveBeenCalledWith('main');
    expect(mockExtractTaskId).toHaveBeenCalledWith('Fix login bug (fixes #42)');
    expect(result).toEqual({
      taskId: 'task-42',
      actions: ['status_updated_to_done'],
    });
  });

  it('extracts task ID from commit messages as last resort', async () => {
    mockExtractTaskId
      .mockReturnValueOnce(null)   // branch name
      .mockReturnValueOnce(null)   // PR title
      .mockReturnValueOnce(null)   // first commit
      .mockReturnValueOnce('99');  // second commit

    const mockTask = {
      _id: 'task-99',
      title: 'Refactor auth',
      status: 'todo',
      clientVisible: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockTaskFindOne.mockResolvedValue(mockTask);
    mockBugFind.mockResolvedValue([]);

    const result = await processStatusUpdate(
      'project-1',
      'main',
      'Some PR',
      ['random commit', 'TASK-99 done'],
    );

    expect(result).toEqual({
      taskId: 'task-99',
      actions: ['status_updated_to_done'],
    });
  });

  it('resolves linked bugs when task is completed', async () => {
    mockExtractTaskId.mockReturnValueOnce('10');

    const mockTask = {
      _id: 'task-10',
      title: 'Fix auth',
      status: 'in_progress',
      clientVisible: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockTaskFindOne.mockResolvedValue(mockTask);

    const mockBug1 = {
      _id: 'bug-1',
      status: 'open',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const mockBug2 = {
      _id: 'bug-2',
      status: 'investigating',
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockBugFind.mockResolvedValue([mockBug1, mockBug2]);

    const result = await processStatusUpdate(
      'project-1',
      'feature/TASK-10-fix-auth',
    );

    expect(mockBugFind).toHaveBeenCalledWith({
      task: 'task-10',
      status: { $nin: ['closed'] },
    });
    expect(mockBug1.status).toBe('resolved');
    expect(mockBug1.save).toHaveBeenCalled();
    expect(mockBug2.status).toBe('resolved');
    expect(mockBug2.save).toHaveBeenCalled();
    expect(result!.actions).toContain('bug_resolved: bug-1');
    expect(result!.actions).toContain('bug_resolved: bug-2');
  });

  it('sends client notification for clientVisible tasks', async () => {
    mockExtractTaskId.mockReturnValueOnce('5');

    const mockTask = {
      _id: 'task-5',
      title: 'Dashboard redesign',
      status: 'review',
      clientVisible: true,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockTaskFindOne.mockResolvedValue(mockTask);
    mockBugFind.mockResolvedValue([]);

    const mockProject = {
      clients: ['client-a', 'client-b'],
    };
    mockProjectFindById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      }),
    });

    const result = await processStatusUpdate(
      'project-1',
      'feature/TASK-5-dashboard',
    );

    expect(mockNotificationCreate).toHaveBeenCalledTimes(2);
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'client-a',
        type: 'client_task_done',
        title: 'Task Completed',
        message: 'Task "Dashboard redesign" has been completed.',
      }),
    );
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'client-b',
        type: 'client_task_done',
      }),
    );
    expect(result!.actions).toContain('client_notified');
  });

  it('returns null when no task ID is extractable', async () => {
    mockExtractTaskId.mockReturnValue(null);

    const result = await processStatusUpdate(
      'project-1',
      'main',
      'Update README',
      ['chore: lint fixes'],
    );

    expect(result).toBeNull();
    expect(mockTaskFindOne).not.toHaveBeenCalled();
  });

  it('returns null when task is not found in database', async () => {
    mockExtractTaskId.mockReturnValueOnce('999');
    mockTaskFindOne.mockResolvedValue(null);
    mockTaskFindById.mockResolvedValue(null);

    const result = await processStatusUpdate(
      'project-1',
      'feature/TASK-999-nonexistent',
    );

    expect(result).toBeNull();
  });

  it('does not update status if task is already done', async () => {
    mockExtractTaskId.mockReturnValueOnce('7');

    const mockTask = {
      _id: 'task-7',
      title: 'Already done task',
      status: 'done',
      clientVisible: false,
      save: jest.fn(),
    };
    mockTaskFindOne.mockResolvedValue(mockTask);
    mockBugFind.mockResolvedValue([]);

    const result = await processStatusUpdate(
      'project-1',
      'feature/TASK-7-already-done',
    );

    expect(mockTask.save).not.toHaveBeenCalled();
    expect(result!.actions).not.toContain('status_updated_to_done');
  });
});
