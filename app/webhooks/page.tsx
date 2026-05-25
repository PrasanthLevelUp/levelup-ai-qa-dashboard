import { Sidebar } from '@/components/sidebar';
import WebhooksClient from './_components/webhooks-client';

export const metadata = {
  title: 'Webhooks — LevelUp AI',
  description: 'Configure autonomous CI healing via GitHub webhooks',
};

export default function WebhooksPage() {
  return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          <WebhooksClient />
        </div>
      </main>
    </div>
  );
}
