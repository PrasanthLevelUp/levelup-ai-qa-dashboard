import { Sidebar } from '@/components/sidebar';
import { ExecutionDetailClient } from './_components/execution-detail-client';

export default function ExecutionDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <ExecutionDetailClient id={params?.id ?? ''} />
      </main>
    </div>
  );
}
