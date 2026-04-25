'use client';

import { useParams } from 'next/navigation';
import { GitHubDashboard } from '@/components/features/github/github-dashboard';

export default function GitHubPage() {
  const params = useParams<{ id: string }>();
  return <GitHubDashboard projectId={params.id} />;
}
