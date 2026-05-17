export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://levelup-ai-qa-agent-production.up.railway.app';
const API_KEY = process.env.BACKEND_API_KEY || '';

const headers = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
});

/** GET /api/dom-memory/snapshots — DOM snapshots list (proxy) */
export async function GET(req: NextRequest) {
  try {
    const limit = new URL(req.url).searchParams.get('limit') || '50';
    const res = await fetch(`${BACKEND_URL}/api/dom/snapshots?limit=${limit}`, { headers: headers() });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[DOM Memory snapshots proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
