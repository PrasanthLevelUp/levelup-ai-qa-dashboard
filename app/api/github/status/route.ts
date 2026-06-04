export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/github/status — proxy to backend
 *
 * SECURITY: proxyHeaders() forwards the session cookie so the backend uses the
 * CURRENT USER's stored GitHub token (not a shared/tenant token).
 */
export async function GET() {
  try {
    const res = await fetch(backendUrl('/api/github/status'), {
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Status]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check GitHub connection' },
      { status: 502 },
    );
  }
}
