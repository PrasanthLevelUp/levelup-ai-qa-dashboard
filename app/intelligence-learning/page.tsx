import { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import IntelligenceLearningClient from './_components/intelligence-learning-client';

export const metadata: Metadata = {
  title: 'Intelligence Learning | LevelUp AI QA',
  description: 'Watch the AI learn, heal, and harden your test suite over time',
};

export default function IntelligenceLearningPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <IntelligenceLearningClient />
      </main>
    </div>
  );
}
