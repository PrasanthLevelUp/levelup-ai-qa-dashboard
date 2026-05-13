import { Sidebar } from '@/components/sidebar';
import { JobsClient } from './_components/jobs-client';

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <JobsClient />
      </main>
    </div>
  );
}
