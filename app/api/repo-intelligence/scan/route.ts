export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://levelup-ai-qa-agent-production.up.railway.app';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(`${BACKEND_URL}/api/repo-intelligence/scan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[RepoIntelligence Scan] Error:', error);
    return NextResponse.json({ error: 'Failed to scan repository', details: String(error) }, { status: 502 });
  }
}
