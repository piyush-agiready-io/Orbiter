import { resolveApiKey } from '@/modules/ai/resolve-api-key';
import { CodexClient } from '@/modules/ai/codex-client';

interface TaskSummary {
  title: string;
  priority: string;
  type: string;
  description?: string;
}

interface AssignmentSuggestion {
  sprintId: string;
  sprintName: string;
  assigneeId: string;
  assigneeName: string;
  reason: string;
}

const SYSTEM_INSTRUCTIONS = `You are a sprint planning assistant. Given a new task and team capacity data, suggest which sprint to add the task to and which team member should be assigned.

Consider:
1. Current workload — prefer members with fewer tasks in the active sprint.
2. Member skills — match task type/description to member skill sets.
3. Priority — P0/P1 tasks should go to the most available skilled member.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "sprintId": "<sprint ID>",
  "assigneeId": "<user ID>",
  "reason": "<1-2 sentence explanation>"
}

If you cannot determine a good assignment, respond with: { "skip": true, "reason": "..." }`;

export const SprintAssignmentAgent = {
  /**
   * Suggest a sprint and assignee for a new task.
   * Never auto-applied — returns a suggestion for the PM to confirm or dismiss.
   * Returns null if ChatGPT is unavailable or no active sprint exists.
   */
  async suggest(
    userId: string,
    projectId: string,
    task: TaskSummary,
  ): Promise<AssignmentSuggestion | null> {
    try {
      const key = await resolveApiKey(userId);
      if (!key) return null;

      // Lazy-import to avoid circular dependencies
      const { SprintService } = await import('@/modules/sprints/sprint.service');
      const { UserService } = await import('@/modules/users/user.service');

      const activeSprint = await SprintService.getActiveSprint(projectId);
      if (!activeSprint) return null;

      const [taskCounts, members] = await Promise.all([
        SprintService.getTaskCountPerMember(activeSprint._id.toString()),
        UserService.getProjectMembers(projectId),
      ]);

      const input = JSON.stringify({
        task: {
          title: task.title,
          priority: task.priority,
          type: task.type,
          description: task.description,
        },
        activeSprint: {
          id: activeSprint._id.toString(),
          name: activeSprint.name,
        },
        teamCapacity: taskCounts.map((tc: { userId: string; name: string; count: number }) => ({
          userId: tc.userId,
          name: tc.name,
          currentTasks: tc.count,
        })),
        members: members.map((m: { _id: { toString(): string }; name: string; skills: string[] }) => ({
          id: m._id.toString(),
          name: m.name,
          skills: m.skills,
        })),
      });

      const response = await CodexClient.complete({
        accessToken: key.token,
        accountId: key.accountId,
        instructions: SYSTEM_INSTRUCTIONS,
        input,
      });

      const parsed = JSON.parse(response.trim());

      if (parsed.skip) return null;

      // Validate that the suggested IDs are valid
      const validMember = members.find(
        (m: { _id: { toString(): string }; name: string }) => m._id.toString() === parsed.assigneeId,
      );
      if (!validMember) return null;

      return {
        sprintId: activeSprint._id.toString(),
        sprintName: activeSprint.name,
        assigneeId: parsed.assigneeId,
        assigneeName: validMember.name,
        reason: parsed.reason ?? 'AI-suggested assignment based on team capacity and skills.',
      };
    } catch (error) {
      console.error('Sprint assignment agent failed:', error);
      return null;
    }
  },
};
