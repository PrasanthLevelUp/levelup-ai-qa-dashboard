import { Metadata } from 'next';
import SignoffClient from './_components/signoff-client';

export const metadata: Metadata = {
  title: 'Release Signoff | LevelUp AI QA',
  description: 'AI-powered release signoff assistant with quality gate assessment',
};

export default function ReleaseSignoffPage() {
  return <SignoffClient />;
}
