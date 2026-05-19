export const dynamic = 'force-dynamic';

import { Sidebar } from '@/components/sidebar';
import AuditLogsClient from './_components/audit-logs-client';

export default function AuditLogsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <AuditLogsClient />
      </div>
    </div>
  );
}
