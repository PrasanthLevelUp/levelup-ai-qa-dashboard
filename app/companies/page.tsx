import { Sidebar } from '@/components/sidebar';
import { CompaniesClient } from './_components/companies-client';

export default function CompaniesPage() {
  return (
    <div className="min-h-screen bg-[#080d19]">
      <Sidebar />
      <main className="lg:ml-64 p-6 lg:p-10">
        <CompaniesClient />
      </main>
    </div>
  );
}
