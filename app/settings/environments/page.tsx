import { Sidebar } from '@/components/sidebar';
import EnvironmentsClient from './_components/environments-client';

export const dynamic = 'force-dynamic';

export default function EnvironmentsSettingsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64">
        <EnvironmentsClient />
      </main>
    </div>
  );
}
