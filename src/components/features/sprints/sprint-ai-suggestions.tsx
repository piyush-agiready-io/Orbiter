'use client';

import { useState } from 'react';
import { Sparkle, CircleNotch, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { AiNotConnected } from '@/components/features/ai/ai-not-connected';
import { useUpdateTask } from '@/hooks/queries/use-tasks';
import { api } from '@/shared/lib/api-client';

interface Suggestion {
  taskId: string;
  taskTitle: string;
  sprintId: string;
  sprintName: string;
  assigneeId: string;
  assigneeName: string;
  reason: string;
}

interface SprintAiSuggestionsProps {
  projectId: string;
}

interface SuggestResponse {
  suggestions: Suggestion[];
  aiNotConnected?: boolean;
  reason?: string;
}

export function SprintAiSuggestions({ projectId }: SprintAiSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiNotConnected, setAiNotConnected] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const updateTask = useUpdateTask(projectId);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    setAiNotConnected(false);
    setReason(null);
    setSuggestions([]);
    setAppliedIds(new Set());

    try {
      const data = await api.get<SuggestResponse>(
        `/projects/${projectId}/sprints/suggest`,
      );
      if (data.aiNotConnected) {
        setAiNotConnected(true);
      } else {
        setSuggestions(data.suggestions);
        setReason(data.reason ?? null);
      }
      setFetched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get suggestions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleApply(suggestion: Suggestion) {
    updateTask.mutate(
      {
        taskId: suggestion.taskId,
        data: {
          sprintId: suggestion.sprintId,
          assigneeIds: [suggestion.assigneeId],
        },
      },
      {
        onSuccess: () => {
          setAppliedIds((prev) => new Set(prev).add(suggestion.taskId));
        },
      },
    );
  }

  if (aiNotConnected) {
    return (
      <div className="px-6 pt-6">
        <AiNotConnected feature="Sprint AI suggestions" compact />
      </div>
    );
  }

  return (
    <div className="px-6 pt-6">
      {!fetched && (
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchSuggestions}
          disabled={loading}
        >
          {loading ? (
            <>
              <CircleNotch size={14} className="mr-1.5 animate-spin" />
              Analyzing backlog...
            </>
          ) : (
            <>
              <Sparkle size={14} weight="fill" className="mr-1.5" />
              Get AI Suggestions
            </>
          )}
        </Button>
      )}

      {error && (
        <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>
      )}

      {fetched && suggestions.length === 0 && !loading && (
        <div className="mt-2 flex items-start justify-between gap-3 rounded-md border border-subtle bg-surface px-3 py-2 text-xs text-secondary">
          <div className="flex items-start gap-2">
            <Sparkle size={14} className="mt-0.5 shrink-0" />
            <span>{reason ?? 'No suggestions available right now.'}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            disabled={loading}
          >
            Retry
          </Button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-secondary">
              <Sparkle size={14} weight="fill" className="text-[var(--color-accent-text)]" />
              AI Sprint Suggestions
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSuggestions}
              disabled={loading}
            >
              {loading ? (
                <CircleNotch size={14} className="animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
          </div>

          {suggestions.map((s) => {
            const isApplied = appliedIds.has(s.taskId);
            return (
              <div
                key={s.taskId}
                className="flex items-start gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-surface p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {s.taskTitle}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-secondary">
                    <span className="font-medium">{s.sprintName}</span>
                    <ArrowRight size={10} />
                    <span className="font-medium">{s.assigneeName}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {s.reason}
                  </p>
                </div>

                <div className="shrink-0 pt-0.5">
                  {isApplied ? (
                    <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
                      <CheckCircle size={14} weight="fill" />
                      Applied
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleApply(s)}
                      disabled={updateTask.isPending}
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
