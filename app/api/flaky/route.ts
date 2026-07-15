export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://levelup-ai-qa-agent-production.up.railway.app';
const API_KEY = process.env.BACKEND_API_KEY || '';

const headers = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {}),
});

/** Forward only the workspace scope params the backend understands. */
const SCOPE_PARAMS = ['projectId', 'environmentId', 'startDate', 'endDate'] as const;

function scopeQuery(req: NextRequest): string {
  const { searchParams } = new URL(req.url);
  const out = new URLSearchParams();
  for (const key of SCOPE_PARAMS) {
    const v = searchParams.get(key);
    if (v) out.set(key, v);
  }
  const s = out.toString();
  return s ? `?${s}` : '';
}

/**
 * GET /api/flaky — Flaky test summary + list (proxy to backend), scoped to the
 * active project + environment + time window.
 */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/rca/flaky${scopeQuery(req)}`, {
      headers: headers(),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Flaky GET proxy]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach backend' },
      { status: 502 }
    );
  }
}
