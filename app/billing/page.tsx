export const dynamic = 'force-dynamic';

import { Sidebar } from '@/components/sidebar';
import BillingClient from './_components/billing-client';

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <BillingClient />
      </div>
    </div>
  );
}
