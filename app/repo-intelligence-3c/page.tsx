import { Sidebar } from '@/components/sidebar';
import { RepoIntelligence3CClient } from './_components/repo-intelligence-3c-client';

export const metadata = {
  title: 'Repository Intelligence — Phase 3C',
};

export default function RepoIntelligence3CPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <RepoIntelligence3CClient />
      </main>
    </div>
  );
}
