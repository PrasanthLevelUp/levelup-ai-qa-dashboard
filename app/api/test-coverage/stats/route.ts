export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/test-coverage/stats — Coverage statistics */
export async function GET() {
  try {
    const res = await fetch(backendUrl('/api/test-coverage/stats'), { headers: proxyHeaders(), cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Test coverage stats proxy]', error);
    return NextResponse.json({ totalRequirements: 0, totalScenarios: 0, totalTestCases: 0, automationReadyCount: 0, coverageTypeBreakdown: {}, priorityBreakdown: {} }, { status: 502 });
  }
}
