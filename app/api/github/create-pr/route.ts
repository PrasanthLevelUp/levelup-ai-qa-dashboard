export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendPost } from '@/lib/backend-api';

/** POST /api/github/create-pr — proxy to backend */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await backendPost('/api/github/create-pr', body);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GitHub Create PR]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create pull request' },
      { status: 502 },
    );
  }
}
