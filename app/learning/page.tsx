import { Sidebar } from '@/components/sidebar';
import { LearningClient } from './_components/learning-client';

export default function LearningPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <LearningClient />
      </main>
    </div>
  );
}
