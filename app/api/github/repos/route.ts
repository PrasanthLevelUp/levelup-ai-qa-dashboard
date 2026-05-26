export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

/** GET /api/github/repos — proxy to backend */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '30';
    const sort = searchParams.get('sort') || 'pushed';

    const data = await backendGet(
      `/api/github/repos?page=${page}&per_page=${perPage}&sort=${sort}`,
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GitHub Repos]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch repositories' },
      { status: 502 },
    );
  }
}
