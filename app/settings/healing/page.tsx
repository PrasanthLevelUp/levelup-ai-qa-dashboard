import { Sidebar } from '@/components/sidebar';
import HealingSettingsClient from './_components/healing-settings-client';

export const dynamic = 'force-dynamic';

export default function HealingSettingsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64">
        <HealingSettingsClient />
      </main>
    </div>
  );
}
