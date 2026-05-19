export const dynamic = 'force-dynamic';

import { Sidebar } from '@/components/sidebar';
import UsageClient from './_components/usage-client';

export default function UsagePage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <UsageClient />
      </div>
    </div>
  );
}
