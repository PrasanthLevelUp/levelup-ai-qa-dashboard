export const dynamic = 'force-dynamic';

import { Sidebar } from '@/components/sidebar';
import { TestDataClient } from './_components/test-data-client';

export default function TestDataPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <TestDataClient />
      </div>
    </div>
  );
}
