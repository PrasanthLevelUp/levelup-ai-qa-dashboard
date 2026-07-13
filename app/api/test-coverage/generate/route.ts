export const dynamic = 'force-dynamic';
// Test-case generation is a long-running LLM call. Without this, the Vercel
// serverless function is killed at the platform default (as low as 10–15s),
// which surfaced to users as a generic "Failed to reach backend" 502 whenever
// a generation ran long (e.g. a comprehensive requirement crossing ~9K tokens).
// Raise the function budget so the proxy can wait for the backend. Vercel clamps
// this to the plan maximum; non-Vercel hosts ignore it (harmless).
export const maxDuration = 300;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

// Upstream request timeout — kept just under `maxDuration` so we can return a
// clean, specific error instead of letting the function be hard-killed by the
// platform (which produces an opaque 502).
const UPSTREAM_TIMEOUT_MS = Number(process.env.GENERATE_UPSTREAM_TIMEOUT_MS || 290_000);

/** POST /api/test-coverage/generate — Generate test coverage from requirement (project-scoped) */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // AbortController gives us a precise, catchable timeout with a helpful message,
  // rather than relying on undici's 300s default or the platform hard-kill.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const res = await fetch(backendUrl('/api/test-coverage/generate'), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    // Distinguish a timeout (generation ran too long) from a genuine
    // connectivity failure so the user knows whether to retry or simplify.
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Test coverage generate proxy] upstream timed out', { UPSTREAM_TIMEOUT_MS });
      return NextResponse.json(
        {
          error: 'Generation timed out',
          details:
            'The backend took too long to generate test cases. Try fewer coverage types, ' +
            'turn off Deep Coverage, or split the requirement into smaller parts.',
        },
        { status: 504 },
      );
    }
    console.error('[Test coverage generate proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
