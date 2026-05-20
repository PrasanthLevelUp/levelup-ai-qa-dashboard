export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://levelup-ai-qa-agent-production.up.railway.app';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/api/status/${jobId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Cancel Job] Error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job', details: String(error) },
      { status: 500 }
    );
  }
}
