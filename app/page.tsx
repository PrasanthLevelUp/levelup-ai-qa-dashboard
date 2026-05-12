import { Sidebar } from '@/components/sidebar';
import { DashboardClient } from '@/components/dashboard-client';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <DashboardClient />
      </main>
    </div>
  );
}
