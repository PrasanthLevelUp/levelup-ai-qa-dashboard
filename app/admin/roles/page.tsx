export const dynamic = 'force-dynamic';

import { Sidebar } from '@/components/sidebar';
import RolesClient from './_components/roles-client';

export default function RolesPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <RolesClient />
      </div>
    </div>
  );
}
