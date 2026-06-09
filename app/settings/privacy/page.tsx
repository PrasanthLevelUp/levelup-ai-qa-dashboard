import { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import PrivacySettingsClient from './_components/privacy-settings-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Learning & Privacy | LevelUp AI QA',
  description: 'Control how the AI learns and what data it can access — enterprise data governance.',
};

export default function PrivacySettingsPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64">
        <PrivacySettingsClient />
      </main>
    </div>
  );
}
