'use client';

import { use } from 'react';
import { BugList } from '@/components/features/bugs/bug-list';

export default function BugsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="p-6">
      <BugList projectId={id} />
    </div>
  );
}
