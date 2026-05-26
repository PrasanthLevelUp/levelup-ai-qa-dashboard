export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

/** GET /api/github/status — proxy to backend */
export async function GET() {
  try {
    const data = await backendGet('/api/github/status');
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GitHub Status]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check GitHub connection' },
      { status: 502 },
    );
  }
}
