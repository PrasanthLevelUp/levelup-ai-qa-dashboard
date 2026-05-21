export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://levelup-ai-qa-agent-production.up.railway.app';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function GET(_req: NextRequest, { params }: { params: { repoId: string } }) {
  try {
    const { repoId } = params;
    const response = await fetch(`${BACKEND_URL}/api/repo-intelligence/${encodeURIComponent(repoId)}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[RepoIntelligence Get] Error:', error);
    return NextResponse.json({ error: 'Failed to get repo intelligence', details: String(error) }, { status: 502 });
  }
}
