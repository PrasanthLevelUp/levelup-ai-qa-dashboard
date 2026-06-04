import { Sidebar } from '@/components/sidebar';
import SprintsClient from './_components/sprints-client';

export const dynamic = 'force-dynamic';

export default function SprintsSettingsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64">
        <SprintsClient />
      </main>
    </div>
  );
}
