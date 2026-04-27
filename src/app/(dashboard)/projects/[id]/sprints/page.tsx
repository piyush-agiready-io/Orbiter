'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { SprintList } from '@/components/features/sprints/sprint-list';
import { SprintCloseDialog } from '@/components/features/sprints/sprint-close-dialog';
import { SprintForm } from '@/components/features/sprints/sprint-form';
import { SprintAiSuggestions } from '@/components/features/sprints/sprint-ai-suggestions';

export default function SprintsPage() {
  const params = useParams<{ id: string }>();
  const [closingSprintId, setClosingSprintId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <SprintAiSuggestions projectId={params.id} />
      <SprintList
        projectId={params.id}
        onClose={setClosingSprintId}
        onCreate={() => setFormOpen(true)}
      />
      <SprintForm
        projectId={params.id}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
      {closingSprintId && (
        <SprintCloseDialog
          sprintId={closingSprintId}
          projectId={params.id}
          open={!!closingSprintId}
          onClose={() => setClosingSprintId(null)}
        />
      )}
    </>
  );
}
