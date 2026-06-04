export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * POST /api/github/create-pr — proxy to backend
 *
 * SECURITY: proxyHeaders() forwards the session cookie so the PR is created
 * using the CURRENT USER's stored GitHub token.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/github/create-pr'), {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Create PR]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create pull request' },
      { status: 502 },
    );
  }
}
