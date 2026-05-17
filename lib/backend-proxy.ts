/**
 * Shared helper for proxying requests to the Railway backend.
 * Forwards the user's session cookie for company-scoped access.
 */
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_API_URL || 'https://levelup-ai-qa-agent-production.up.railway.app';
const API_KEY = process.env.BACKEND_API_KEY || '';
const COOKIE_NAME = 'levelup_session';

export function backendUrl(path: string): string {
  return `${BACKEND_URL}${path}`;
}

/** Build headers that carry auth API key + user session cookie for company scoping */
export function proxyHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) h['x-api-key'] = API_KEY;

  // Forward session cookie so backend company middleware can resolve tenant
  try {
    const cookieStore = cookies();
    const session = cookieStore.get(COOKIE_NAME)?.value;
    if (session) {
      h['Cookie'] = `${COOKIE_NAME}=${session}`;
    }
  } catch {
    // cookies() may fail in some contexts (e.g., during build) — skip
  }

  return h;
}
