export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const headers = { 'Authorization': `Bearer ${API_KEY}` };

    // Get job from backend
    let job = null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/jobs/${jobId}`, { headers });
      if (res.ok) {
        job = await res.json();
      }
    } catch {
      // Backend may be unreachable
    }

    // Get live status from backend
    let backendStatus = null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/status/${jobId}`, { headers });
      if (res.ok) {
        backendStatus = await res.json();
      }
    } catch {
      // Backend may be unreachable
    }

    // Get report from backend
    let report = null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/reports/${jobId}`, { headers });
      if (res.ok) {
        report = await res.json();
      }
    } catch {
      // No report available
    }

    return NextResponse.json({
      job,
      backendStatus,
      report,
    });
  } catch (error) {
    console.error('[Job Detail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details', details: String(error) },
      { status: 500 }
    );
  }
}
