import { serve } from 'inngest/next';
import { inngest } from '@/shared/lib/inngest';
import { githubSyncFunction } from '@/modules/ai/agents/github-sync.inngest';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [githubSyncFunction],
});
