import { Sidebar } from '@/components/sidebar';
import { ScriptsClient } from './_components/scripts-client';

export default function ScriptsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <ScriptsClient />
      </main>
    </div>
  );
}
