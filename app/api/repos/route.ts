export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://levelup-ai-qa-agent-production.up.railway.app';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/repos`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Repos API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repos', details: String(error) },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(`${BACKEND_URL}/api/repos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Repos API POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add repo', details: String(error) },
      { status: 502 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoId = searchParams.get('id');
    if (!repoId) {
      return NextResponse.json({ error: 'Missing repo id' }, { status: 400 });
    }
    const response = await fetch(`${BACKEND_URL}/api/repos/${repoId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Repos API DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete repo', details: String(error) },
      { status: 502 }
    );
  }
}
