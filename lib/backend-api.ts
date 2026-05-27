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
