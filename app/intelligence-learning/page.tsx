import { Metadata } from 'next';
import IntelligenceLearningClient from './_components/intelligence-learning-client';

export const metadata: Metadata = {
  title: 'Intelligence Learning | LevelUp AI QA',
  description: 'Watch the AI learn, heal, and harden your test suite over time',
};

export default function IntelligenceLearningPage() {
  return <IntelligenceLearningClient />;
}
