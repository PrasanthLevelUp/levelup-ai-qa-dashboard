import { Sidebar } from '@/components/sidebar';
import { DomMemoryClient } from './_components/dom-memory-client';

export default function DomMemoryPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <DomMemoryClient />
      </main>
    </div>
  );
}
