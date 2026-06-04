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
export function proxyHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) h['Authorization'] = `Bearer ${API_KEY}`;

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

  // Merge extra headers (e.g., x-project-id for multi-project isolation)
  if (extraHeaders) {
    Object.assign(h, extraHeaders);
  }

  return h;
}

/**
 * Extract the workspace-context headers (project / environment / sprint) from an
 * incoming request for forwarding to the backend. Backward compatible — only
 * emits the headers that are present.
 */
export function extractProjectHeaders(req: { headers: { get(name: string): string | null } }): Record<string, string> {
  const out: Record<string, string> = {};
  const projectId = req.headers.get('x-project-id');
  const environmentId = req.headers.get('x-environment-id');
  const sprintId = req.headers.get('x-sprint-id');
  if (projectId) out['x-project-id'] = projectId;
  if (environmentId) out['x-environment-id'] = environmentId;
  if (sprintId) out['x-sprint-id'] = sprintId;
  return out;
}
