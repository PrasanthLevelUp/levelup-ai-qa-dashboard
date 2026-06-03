import { Sidebar } from '@/components/sidebar';
import RTMClient from './_components/rtm-client';

export const metadata = {
  title: 'RTM Dashboard',
  description: 'Requirements Traceability Matrix — coverage, gaps and end-to-end traceability',
};

export default function RTMPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64">
        <RTMClient />
      </main>
    </div>
  );
}
