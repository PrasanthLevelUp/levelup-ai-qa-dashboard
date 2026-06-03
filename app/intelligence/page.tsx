import { Sidebar } from '@/components/sidebar';
import { IntelligenceClient } from './_components/intelligence-client';

export default function IntelligencePage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64">
        <IntelligenceClient />
      </main>
    </div>
  );
}
