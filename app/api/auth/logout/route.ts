export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const COOKIE_NAME = 'levelup_session';

/**
 * POST /api/auth/logout
 * Proxies logout to backend and clears the session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    // Forward cookie to backend for session cleanup
    const cookie = req.cookies.get(COOKIE_NAME)?.value;

    if (cookie) {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `${COOKIE_NAME}=${cookie}`,
        },
      }).catch(() => { /* backend cleanup is best-effort */ });
    }

    // Always clear the cookie on the dashboard side
    const response = NextResponse.json({ success: true, message: 'Logged out' });
    response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (error) {
    console.error('[Auth Proxy] Logout error:', error);
    const response = NextResponse.json({ success: true, message: 'Logged out' });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}
