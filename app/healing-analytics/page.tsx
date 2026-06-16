import { Metadata } from 'next';
import HealingAnalyticsClient from './_components/healing-analytics-client';

export const metadata: Metadata = {
  title: 'Healing Analytics | LevelUp AI QA',
  description: 'Success rate, top healed & failing elements, confidence distribution and healing trend',
};

export default function HealingAnalyticsPage() {
  return <HealingAnalyticsClient />;
}
