export const dynamic = 'force-dynamic';

import { Sidebar } from '@/components/sidebar';
import UsersClient from './_components/users-client';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <UsersClient />
      </div>
    </div>
  );
}
