export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const result = await backendGet(`/api/dashboard/scripts/${id}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Scripts] GET/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch script', details: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const projectHeaders = extractProjectHeaders(req);
    const res = await fetch(
      backendUrl(`/api/scripts/${params.id}`),
      { method: 'DELETE', headers: proxyHeaders(projectHeaders), cache: 'no-store' },
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: errText || 'Delete failed' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Scripts] DELETE/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete script' },
      { status: 500 },
    );
  }
}
