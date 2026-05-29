export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/scripts/:id/download
 * Proxies script download to backend, streams the binary file response.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const projectHeaders = extractProjectHeaders(req);

    const res = await fetch(
      backendUrl(`/api/scripts/${params.id}/download`),
      { headers: proxyHeaders(projectHeaders), cache: 'no-store' },
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: errText || 'Download failed' },
        { status: res.status },
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
  } catch (error) {
    console.error('[Scripts] Download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download script' },
      { status: 500 },
    );
  }
}
