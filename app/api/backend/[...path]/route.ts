export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

/**
 * Proxy route to forward requests to the Railway backend.
 * Keeps BACKEND_API_KEY server-side — never exposed to the browser.
 * Usage: /api/backend/health → BACKEND_URL/api/health
 *        /api/backend/repos  → BACKEND_URL/api/repos
 */
async function proxyRequest(req: NextRequest, { params }: { params: { path: string[] } }) {
  const pathSegments = params.path;
  const backendPath = `/api/${pathSegments.join('/')}`;
  const url = new URL(backendPath, BACKEND_URL);

  // Forward query params
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

    const headers: Record<string, string> = {
      'Authorization': 'Bearer levelup_dev_test_key_2026',
      'x-api-key': 'levelup_dev_test_key_2026',
      'Content-Type': 'application/json',
    };

//   const headers = new Headers();

// headers.set(
//   'Authorization',
//   'Bearer levelup_dev_test_key_2026'
// );

// headers.set('Content-Type', 'application/json');

  let body: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    try {
      body = await req.text();
    } catch {
      // no body
    }
  }

  try {
    const response = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      const html = await response.text();
      return new NextResponse(html, {
        status: response.status,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Backend Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Backend service unavailable', details: String(error) },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
