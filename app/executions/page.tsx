import { Sidebar } from '@/components/sidebar';
import { ExecutionsListClient } from './_components/executions-list-client';

export default function ExecutionsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <ExecutionsListClient />
      </main>
    </div>
  );
}
