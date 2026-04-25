'use client';

import { useState } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { useCreateComment } from '@/hooks/queries/use-comments';
import { Button } from '@/components/ui/button';

interface CommentInputProps {
  projectId: string;
  parentType: 'bug' | 'task';
  parentId: string;
}

export function CommentInput({ projectId, parentType, parentId }: CommentInputProps) {
  const [content, setContent] = useState('');
  const createComment = useCreateComment(projectId, parentType, parentId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    createComment.mutate(
      { content: content.trim(), mentions: [] },
      {
        onSuccess: () => setContent(''),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        placeholder="Add a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="flex-1 rounded-md border border-default bg-surface px-2.5 py-1.5 text-sm text-primary placeholder:text-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e);
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!content.trim() || createComment.isPending}
        className="self-end"
      >
        <PaperPlaneTilt size={16} />
      </Button>
    </form>
  );
}
