import { DocList } from '@/components/features/docs/doc-list';

export default function DocsPage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-h1 font-semibold text-primary">Documents</h1>
      <DocList />
    </div>
  );
}
