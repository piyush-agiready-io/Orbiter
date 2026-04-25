'use client';

import { Trash } from '@phosphor-icons/react';
import Avatar from 'boring-avatars';
import { useComments, useDeleteComment } from '@/hooks/queries/use-comments';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface CommentItem {
  id: string;
  content: string;
  author: { id?: string; _id?: string; name: string; email: string; avatar?: string };
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface CommentListProps {
  projectId: string;
  parentType: 'bug' | 'task';
  parentId: string;
}

export function CommentList({ projectId, parentType, parentId }: CommentListProps) {
  const { user } = useAuth();
  const { data, isLoading } = useComments(projectId, parentType, parentId);
  const deleteComment = useDeleteComment(parentType, parentId);

  const comments: CommentItem[] =
    (data as { comments?: CommentItem[] })?.comments ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-2.5">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted">No comments yet</p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const authorId = comment.author.id ?? comment.author._id ?? '';
        const isOwn = user?.id === authorId;
        const isAdmin = user?.role === 'admin';

        return (
          <div key={comment.id} className="group flex gap-2.5">
            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
              <Avatar
                size={24}
                variant="beam"
                name={comment.author.name}
                colors={['#5B5FC7', '#4E52B0', '#E8E9F5', '#2E7D57', '#3178B9']}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  {comment.author.name}
                </span>
                <span className="text-xs text-muted">{timeAgo(comment.createdAt)}</span>
                {(isOwn || isAdmin) && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    <Trash size={12} />
                  </Button>
                )}
              </div>
              <p className="mt-0.5 text-sm text-secondary whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
