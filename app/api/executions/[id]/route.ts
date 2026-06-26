export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

/** GET /api/executions/:id — the complete ExecutionRecord + derived timeline. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id ?? '';
    const result = await backendGet(`/api/dashboard/executions/${encodeURIComponent(id)}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Execution detail API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution record', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
