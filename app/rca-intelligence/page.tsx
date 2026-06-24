import { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import RCAIntelligenceClient from './_components/rca-intelligence-client';

export const metadata: Metadata = {
  title: 'RCA Intelligence | LevelUp AI QA',
  description: 'Enhanced Root Cause Analysis with Environment Intelligence',
};

export default function RCAIntelligencePage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <RCAIntelligenceClient />
      </main>
    </div>
  );
}
