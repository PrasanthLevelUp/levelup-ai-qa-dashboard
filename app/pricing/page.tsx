export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import PricingClient from './_components/pricing-client';

export const metadata: Metadata = {
  title: 'Pricing | LevelUp AI QA',
  description: 'Flexible pricing plans for startups, growing teams, and enterprises. Pay for quality operations, not tokens.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <div className="lg:pl-64">
        <PricingClient />
      </div>
    </div>
  );
}
