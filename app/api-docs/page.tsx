export const dynamic = 'force-dynamic';

import { Sidebar } from '@/components/sidebar';
import { ApiDocsClient } from './_components/api-docs-client';

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <ApiDocsClient />
      </div>
    </div>
  );
}
