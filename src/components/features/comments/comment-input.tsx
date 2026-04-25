'use client';

import { useState, useCallback } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { useCreateComment } from '@/hooks/queries/use-comments';
import { Button } from '@/components/ui/button';
import { MentionInput } from '@/components/shared/mention-input';

interface CommentInputProps {
  projectId: string;
  parentType: 'bug' | 'task';
  parentId: string;
}

export function CommentInput({ projectId, parentType, parentId }: CommentInputProps) {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const createComment = useCreateComment(projectId, parentType, parentId);

  const handleSubmit = useCallback(() => {
    if (!content.trim()) return;
    createComment.mutate(
      { content: content.trim(), mentions },
      { onSuccess: () => { setContent(''); setMentions([]); } },
    );
  }, [content, mentions, createComment]);

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <MentionInput
          value={content}
          onChange={setContent}
          onMentionsChange={setMentions}
          onSubmit={handleSubmit}
        />
      </div>
      <Button
        type="button"
        size="icon"
        onClick={handleSubmit}
        disabled={!content.trim() || createComment.isPending}
        className="self-end"
      >
        <PaperPlaneTilt size={16} />
      </Button>
    </div>
  );
}
