import { Sidebar } from '@/components/sidebar';
import { HealingsClient } from './_components/healings-client';

export const metadata = {
  title: 'Healings — LevelUp AI QA',
  description: 'Self-healing activity across your projects with diagnostics.',
};

export default function HealingsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <HealingsClient />
      </main>
    </div>
  );
}
