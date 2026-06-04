import { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import SignoffClient from './_components/signoff-client';

export const metadata: Metadata = {
  title: 'Release Signoff | LevelUp AI QA',
  description: 'AI-powered release signoff assistant with quality gate assessment',
};

export default function ReleaseSignoffPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <SignoffClient />
      </main>
    </div>
  );
}
