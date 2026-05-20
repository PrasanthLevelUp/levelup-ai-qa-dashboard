import { Sidebar } from '@/components/sidebar';
import { ApiKeysClient } from './_components/api-keys-client';

export default function ApiKeysPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-8">
        <ApiKeysClient />
      </main>
    </div>
  );
}
