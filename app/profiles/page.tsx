import { Sidebar } from '@/components/sidebar';
import { ProfilesClient } from './_components/profiles-client';

export default function ProfilesPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64">
        <ProfilesClient />
      </main>
    </div>
  );
}
