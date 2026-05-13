export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = searchParams.get('limit') || '50';
    const status = searchParams.get('status') || '';

    const params = new URLSearchParams();
    if (limit) params.set('limit', limit);
    if (status) params.set('status', status);

    const url = `${BACKEND_URL}/api/jobs?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Failed to fetch jobs', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Jobs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: String(error) },
      { status: 500 }
    );
  }
}
