export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repository, branch, testFile } = body;

    if (!repository) {
      return NextResponse.json(
        { error: 'Missing required field: repository' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/heal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repository, branch, testFile }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Failed to trigger healing', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Trigger Job] Error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger healing job', details: String(error) },
      { status: 500 }
    );
  }
}
