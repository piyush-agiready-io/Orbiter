interface ChatGPTStatusBadgeProps {
  connected: boolean;
  email?: string;
  planType?: string;
}

export function ChatGPTStatusBadge({
  connected,
  email,
  planType,
}: ChatGPTStatusBadgeProps) {
  if (!connected) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-subtle px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />
        <span className="text-sm text-[var(--color-text-muted)]">Disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full bg-[var(--color-success-muted)] px-3 py-1">
      <span className="h-2 w-2 rounded-full bg-success" />
      <span className="text-sm text-primary">
        Connected{email ? ` as ${email}` : ''}
        {planType ? ` (${planType})` : ''}
      </span>
    </div>
  );
}
