export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * POST /api/scripts/validate-locators
 * Proxy to the backend locator-validation endpoint (Sprint 4). Validates a set
 * of candidate locators against the cached DOM of the Application Profile for a
 * given URL and returns per-locator validity + a summary.
 *
 * Body: { url: string, locators: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/scripts/validate-locators'), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[ValidateLocators proxy POST] Backend returned', res.status, errText);
      return NextResponse.json(
        { success: false, error: 'Backend error', details: errText },
        { status: res.status },
      );
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[ValidateLocators proxy POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate locators' },
      { status: 502 },
    );
  }
}
