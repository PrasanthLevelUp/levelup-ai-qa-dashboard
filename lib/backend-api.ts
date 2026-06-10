/**
 * Backend API client — all dashboard data fetched from Railway backend.
 */

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

/**
 * Build standard headers, merging any extra headers (e.g. x-project-id).
 */
function buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  };
}

export async function backendGet(path: string, extraHeaders?: Record<string, string>): Promise<any> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    headers: buildHeaders(extraHeaders),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  return res.json();
}

export async function backendPost(path: string, body: any, extraHeaders?: Record<string, string>): Promise<any> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(extraHeaders),
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * POST that preserves the backend's HTTP status and parsed body instead of throwing
 * on non-2xx responses. Use this when the caller needs to forward a meaningful status
 * code (e.g. 409 Conflict for a duplicate resource) and structured error payload to the
 * client, rather than collapsing everything into a generic 500.
 */
export async function backendPostRaw(
  path: string,
  body: any,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; ok: boolean; data: any }> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(extraHeaders),
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { success: false, error: text || `Backend ${res.status}` };
  }
  return { status: res.status, ok: res.ok, data };
}

export async function backendPut(path: string, body: any, extraHeaders?: Record<string, string>): Promise<any> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders(extraHeaders),
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  return res.json();
}

export async function backendDelete(path: string, extraHeaders?: Record<string, string>): Promise<any> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: buildHeaders(extraHeaders),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  return res.json();
}

export { BACKEND_URL, API_KEY };
