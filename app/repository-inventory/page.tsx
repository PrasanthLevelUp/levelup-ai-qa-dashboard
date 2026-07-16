import { Sidebar } from '@/components/sidebar';
import RepositoryInventoryClient from './_components/repository-inventory-client';

export default function RepositoryInventoryPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="lg:ml-64">
        <RepositoryInventoryClient />
      </main>
    </div>
  );
}
