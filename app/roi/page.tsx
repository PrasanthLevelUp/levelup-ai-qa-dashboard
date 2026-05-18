import { Metadata } from 'next';
import ROIClient from './_components/roi-client';

export const metadata: Metadata = {
  title: 'ROI Dashboard | LevelUp AI QA',
  description: 'Return on Investment and Maintenance Cost Savings Dashboard',
};

export default function ROIPage() {
  return <ROIClient />;
}
