import { Sidebar } from '@/components/sidebar';
import { PatternsClient } from './_components/patterns-client';

export default function PatternsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <PatternsClient />
      </main>
    </div>
  );
}
