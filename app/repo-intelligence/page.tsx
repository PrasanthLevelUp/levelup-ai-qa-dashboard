import { Sidebar } from '@/components/sidebar';
import { RepoIntelligenceClient } from './_components/repo-intelligence-client';

export default function RepoIntelligencePage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <RepoIntelligenceClient />
      </main>
    </div>
  );
}