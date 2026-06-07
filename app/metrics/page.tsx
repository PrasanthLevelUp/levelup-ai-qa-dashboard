import { Sidebar } from '@/components/sidebar';
import { MetricsClient } from './_components/metrics-client';

export const metadata = {
  title: 'Metrics · LevelUp AI QA',
  description: 'Investor-grade, observable proof that the platform improves the more it is used.',
};

export default function MetricsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MetricsClient />
      </main>
    </div>
  );
}
