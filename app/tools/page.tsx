import { Sidebar } from '@/components/sidebar';
import { ToolsClient } from './_components/tools-client';

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <ToolsClient />
      </main>
    </div>
  );
}
