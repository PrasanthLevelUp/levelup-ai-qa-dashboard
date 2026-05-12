import { Sidebar } from '@/components/sidebar';
import { HealingDetailClient } from './_components/healing-detail-client';

export default function HealingDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <HealingDetailClient id={params?.id ?? '0'} />
      </main>
    </div>
  );
}
