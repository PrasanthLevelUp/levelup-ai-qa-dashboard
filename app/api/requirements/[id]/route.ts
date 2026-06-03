export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/requirements/:id — single requirement */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/requirements/${params.id}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Requirement proxy GET] Backend returned', res.status, errText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[Requirement proxy GET]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch requirement' }, { status: 502 });
  }
}

/** PUT /api/requirements/:id — update a requirement */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl(`/api/requirements/${params.id}`), {
      method: 'PUT',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Requirement proxy PUT] Backend returned', res.status, errText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[Requirement proxy PUT]', error);
    return NextResponse.json({ success: false, error: 'Failed to update requirement' }, { status: 502 });
  }
}

/** DELETE /api/requirements/:id — soft-delete a requirement */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/requirements/${params.id}`), {
      method: 'DELETE',
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Requirement proxy DELETE] Backend returned', res.status, errText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[Requirement proxy DELETE]', error);
    return NextResponse.json({ success: false, error: 'Failed to delete requirement' }, { status: 502 });
  }
}
