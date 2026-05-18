export const dynamic = 'force-dynamic';

import { Sidebar } from '@/components/sidebar';
import { TestCoverageClient } from './_components/test-coverage-client';

export default function TestCoveragePage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <TestCoverageClient />
      </div>
    </div>
  );
}
