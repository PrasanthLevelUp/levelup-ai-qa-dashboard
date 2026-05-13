export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://levelup-ai-qa-agent-production.up.railway.app';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/repos`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'x-api-key': API_KEY,
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Repos API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repos', details: String(error) },
      { status: 502 }
    );
  }
}