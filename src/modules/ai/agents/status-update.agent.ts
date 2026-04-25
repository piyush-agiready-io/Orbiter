import { GitHubService } from '@/modules/github/github.service';
import { Task } from '@/modules/tasks/task.model';
import { Bug } from '@/modules/bugs/bug.model';
import { Notification } from '@/modules/notifications/notification.model';
import { Project } from '@/modules/projects/project.model';

/**
 * Status Update Agent — processes merged PRs and updates task/bug status.
 *
 * Called during GitHub sync when a merged PR is detected.
 * Extracts the task ID from branch name, PR title, or commit messages,
 * marks the task as done, resolves linked bugs, and notifies clients.
 */
export async function processStatusUpdate(
  projectId: string,
  branchName: string,
  prTitle?: string,
  commitMessages?: string[],
): Promise<{ taskId: string; actions: string[] } | null> {
  // 1. Extract task ID — try branch name first, then PR title, then commit messages
  let extractedId = GitHubService.extractTaskId(branchName);

  if (!extractedId && prTitle) {
    extractedId = GitHubService.extractTaskId(prTitle);
  }

  if (!extractedId && commitMessages) {
    for (const msg of commitMessages) {
      extractedId = GitHubService.extractTaskId(msg);
      if (extractedId) break;
    }
  }

  if (!extractedId) return null;

  // 2. Find the task — try by sequential number (order) first, then by ObjectId
  let task = await Task.findOne({ project: projectId, order: Number(extractedId) });
  if (!task) {
    try {
      task = await Task.findById(extractedId);
    } catch {
      // Invalid ObjectId format — ignore
    }
  }

  if (!task) return null;

  const actions: string[] = [];

  // 3. Update task status to 'done' if not already done
  if (task.status !== 'done') {
    task.status = 'done';
    await task.save();
    actions.push('status_updated_to_done');
  }

  // 4. Resolve linked bugs
  const linkedBugs = await Bug.find({
    task: task._id,
    status: { $nin: ['closed'] },
  });

  for (const bug of linkedBugs) {
    bug.status = 'resolved';
    await bug.save();
    actions.push(`bug_resolved: ${String(bug._id)}`);
  }

  // 5. Send client notification if task is clientVisible
  if (task.clientVisible) {
    const project = await Project.findById(projectId).select('clients').lean();

    if (project?.clients?.length) {
      for (const clientId of project.clients) {
        await Notification.create({
          user: clientId,
          type: 'client_task_done',
          title: 'Task Completed',
          message: `Task "${task.title}" has been completed.`,
          link: `/projects/${projectId}/tasks/${String(task._id)}`,
        });
      }
      actions.push('client_notified');
    }
  }

  // 6. Return result
  return { taskId: String(task._id), actions };
}

/**
 * StatusUpdateAgent — object-style export for batch processing during GitHub sync.
 */
export const StatusUpdateAgent = {
  /**
   * Process a batch of commits, extracting task IDs and updating statuses.
   * Returns an array of results indicating which commits triggered updates.
   */
  async processBatch(
    projectId: string,
    commits: Array<{ message: string; branch: string }>,
  ): Promise<Array<{ sha?: string; updated: boolean; taskId?: string }>> {
    const results: Array<{ sha?: string; updated: boolean; taskId?: string }> = [];

    for (const commit of commits) {
      try {
        const result = await processStatusUpdate(
          projectId,
          commit.branch,
          undefined,
          [commit.message],
        );

        results.push({
          updated: result !== null,
          taskId: result?.taskId,
        });
      } catch (error) {
        console.error('Status update failed for commit:', error);
        results.push({ updated: false });
      }
    }

    return results;
  },
};
