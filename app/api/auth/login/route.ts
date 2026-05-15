export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

/**
 * POST /api/auth/login
 * Proxies login to backend, forwards the Set-Cookie header back to browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': req.headers.get('x-forwarded-for') || req.ip || '',
        'User-Agent': req.headers.get('user-agent') || '',
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();

    // Create response
    const response = NextResponse.json(data, { status: backendRes.status });

    // Forward Set-Cookie headers from backend
    const setCookieHeaders = backendRes.headers.getSetCookie?.() || [];
    for (const cookie of setCookieHeaders) {
      response.headers.append('Set-Cookie', cookie);
    }

    // If backend didn't set cookie but login succeeded, set it from response data
    if (data.success && setCookieHeaders.length === 0) {
      // The backend sets the cookie directly — but since we're proxying,
      // we need to extract and forward it. If the cookie didn't come through,
      // we'll handle auth via the backend /me endpoint.
    }

    return response;
  } catch (error) {
    console.error('[Auth Proxy] Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 502 }
    );
  }
}
