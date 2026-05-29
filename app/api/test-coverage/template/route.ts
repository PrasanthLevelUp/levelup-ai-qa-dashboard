import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/test-coverage/template?format=excel|csv
 * Proxies template download request to backend and streams binary response.
 */
export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get('format') || 'excel';
    const projectHeaders = extractProjectHeaders(req);

    const res = await fetch(backendUrl(`/api/test-coverage/template?format=${format}`), {
      method: 'GET',
      headers: proxyHeaders(projectHeaders),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: errorText || 'Template download failed' },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = res.headers.get('content-disposition') || '';

    const blob = await res.arrayBuffer();

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(contentDisposition && { 'Content-Disposition': contentDisposition }),
      },
    });
  } catch (err) {
    console.error('[template] proxy error:', err);
    return NextResponse.json({ error: 'Template proxy failed' }, { status: 500 });
  }
}
