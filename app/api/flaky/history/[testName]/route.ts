export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://levelup-ai-qa-agent-production.up.railway.app';
const API_KEY = process.env.BACKEND_API_KEY || '';

const headers = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
});

/**
 * GET /api/flaky/history/:testName — Full RCA history for a test (proxy to backend)
 */
export async function GET(
  _req: Request,
  { params }: { params: { testName: string } }
) {
  try {
    const testName = encodeURIComponent(params.testName);
    const res = await fetch(`${BACKEND_URL}/api/rca/flaky/history/${testName}`, {
      headers: headers(),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Flaky History proxy]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach backend' },
      { status: 502 }
    );
  }
}
