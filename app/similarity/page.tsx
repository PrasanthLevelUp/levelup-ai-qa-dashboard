import { Sidebar } from '@/components/sidebar';
import { SimilarityClient } from './_components/similarity-client';

export default function SimilarityPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <SimilarityClient />
      </main>
    </div>
  );
}
