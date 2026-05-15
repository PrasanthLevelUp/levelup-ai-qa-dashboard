export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const COOKIE_NAME = 'levelup_session';

/**
 * GET /api/auth/me
 * Validates current session by proxying to backend.
 */
export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get(COOKIE_NAME)?.value;

    if (!cookie) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Cookie': `${COOKIE_NAME}=${cookie}`,
      },
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error('[Auth Proxy] /me error:', error);
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    );
  }
}
