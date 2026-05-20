import { Sidebar } from '@/components/sidebar';
import { IngestionClient } from './_components/ingestion-client';

export default function IngestionPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <IngestionClient />
      </main>
    </div>
  );
}
