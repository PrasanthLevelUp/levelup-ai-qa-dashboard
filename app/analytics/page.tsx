import { Sidebar } from '@/components/sidebar';
import { AnalyticsClient } from './_components/analytics-client';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <AnalyticsClient />
      </main>
    </div>
  );
}
