import { Metadata } from 'next';
import RCAIntelligenceClient from './_components/rca-intelligence-client';

export const metadata: Metadata = {
  title: 'RCA Intelligence | LevelUp AI QA',
  description: 'Enhanced Root Cause Analysis with Environment Intelligence',
};

export default function RCAIntelligencePage() {
  return <RCAIntelligenceClient />;
}
