export const dynamic = 'force-dynamic';

import { Sidebar } from '@/components/sidebar';
import { KnowledgeClient } from './_components/knowledge-client';

export default function KnowledgePage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <KnowledgeClient />
      </div>
    </div>
  );
}
