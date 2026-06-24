import { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import HealingAnalyticsClient from './_components/healing-analytics-client';

export const metadata: Metadata = {
  title: 'Healing Analytics | LevelUp AI QA',
  description: 'Success rate, top healed & failing elements, confidence distribution and healing trend',
};

export default function HealingAnalyticsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <HealingAnalyticsClient />
      </main>
    </div>
  );
}
