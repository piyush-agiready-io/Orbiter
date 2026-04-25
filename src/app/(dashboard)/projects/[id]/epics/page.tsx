'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { EpicList } from '@/components/features/epics/epic-list';
import { EpicForm } from '@/components/features/epics/epic-form';

export default function EpicsPage() {
  const params = useParams<{ id: string }>();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEpicId, setEditingEpicId] = useState<string | undefined>();

  return (
    <>
      <EpicList
        projectId={params.id}
        onCreate={() => { setEditingEpicId(undefined); setFormOpen(true); }}
        onEdit={(epicId) => { setEditingEpicId(epicId); setFormOpen(true); }}
      />
      <EpicForm
        projectId={params.id}
        epicId={editingEpicId}
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingEpicId(undefined); }}
      />
    </>
  );
}
