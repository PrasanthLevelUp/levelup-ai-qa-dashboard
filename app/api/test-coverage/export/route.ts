import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * POST /api/test-coverage/export
 * Proxies export request to backend and streams the binary file response back.
 * Body: { requirementId, format: 'excel'|'csv', includeGaps?, includeMetadata? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectHeaders = extractProjectHeaders(req);

    const res = await fetch(backendUrl('/api/test-coverage/export'), {
      method: 'POST',
      headers: proxyHeaders(projectHeaders),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: errorText || 'Export failed' },
        { status: res.status }
      );
    }

    // Stream the binary response back with original headers
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
    console.error('[export] proxy error:', err);
    return NextResponse.json({ error: 'Export proxy failed' }, { status: 500 });
  }
}
