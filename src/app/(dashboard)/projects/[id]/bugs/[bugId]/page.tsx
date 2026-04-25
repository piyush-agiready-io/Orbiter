'use client';

import { use } from 'react';
import { BugDetail } from '@/components/features/bugs/bug-detail';

export default function BugDetailPage({
  params,
}: {
  params: Promise<{ id: string; bugId: string }>;
}) {
  const { id, bugId } = use(params);
  return (
    <div className="p-6">
      <BugDetail projectId={id} bugId={bugId} />
    </div>
  );
}
