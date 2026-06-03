import { Sidebar } from '@/components/sidebar';
import RequirementsClient from './_components/requirements-client';

export default function RequirementsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64">
        <RequirementsClient />
      </main>
    </div>
  );
}
