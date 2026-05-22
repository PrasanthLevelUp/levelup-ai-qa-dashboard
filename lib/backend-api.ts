/**
 * Backend API client — all dashboard data fetched from Railway backend.
 */

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function backendGet(path: string): Promise<any> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  return res.json();
}

export async function backendPost(path: string, body: any): Promise<any> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  return res.json();
}

export async function backendDelete(path: string): Promise<any> {
  const url = `${BACKEND_URL}${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  return res.json();
}

export { BACKEND_URL, API_KEY };
