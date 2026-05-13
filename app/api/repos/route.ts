import { NextResponse } from 'next/server';

export async function GET() {
  const response = await fetch(
    'https://levelup-ai-qa-agent-production.up.railway.app/api/repos',
    {
      headers: {
        Authorization: 'Bearer levelup_dev_test_key_2026',
      },
      cache: 'no-store',
    }
  );

  const data = await response.json();

  return NextResponse.json(data, {
    status: response.status,
  });
}