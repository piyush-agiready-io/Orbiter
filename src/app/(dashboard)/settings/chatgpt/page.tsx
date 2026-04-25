'use client';

import { ChatGPTConnection } from '@/components/features/settings/chatgpt-connection';

export default function ChatGPTSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">
          ChatGPT Integration
        </h1>
        <p className="mt-1 text-secondary">
          Connect your ChatGPT account to enable AI agents for automatic priority detection, sprint suggestions, GitHub sync summaries, and task status updates.
        </p>
      </div>

      <ChatGPTConnection />

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-subtle p-4">
        <h4 className="text-sm font-medium text-primary">
          How it works
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-secondary">
          <li>AI features use your ChatGPT subscription — no separate API costs.</li>
          <li>All AI suggestions are drafts — you always confirm or dismiss.</li>
          <li>Your tokens are encrypted and never shared with other users.</li>
        </ul>
      </div>
    </div>
  );
}
