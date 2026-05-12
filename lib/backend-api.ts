/**
 * Backend API client for LevelUp AI QA Agent (Railway)
 * Used for write operations: trigger healing, manage repos
 * Read-only stats continue using Prisma for speed
 */

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

interface BackendRequestOptions {
  method?: string;
  body?: unknown;
  timeout?: number;
}

class BackendApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
  }
}

async function backendFetch<T>(endpoint: string, options: BackendRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeout = 30000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => 'Unknown error');
      throw new BackendApiError(
        `Backend API error: ${res.status} - ${errBody}`,
        res.status
      );
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ============= Types =============

export interface BackendRepo {
  id: string;
  name: string;
  url: string;
  branch: string;
  localPath?: string;
  enabled: boolean;
}

export interface HealingJobRequest {
  repoUrl: string;
  branch?: string;
  testFile?: string;
  failureLog?: string;
}

export interface HealingJobResponse {
  jobId: string;
  status: string;
  message?: string;
}

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
}

// ============= API Methods =============

export const backendApi = {
  // Health
  health: () => backendFetch<HealthStatus>('/api/health'),

  // Repos
  listRepos: () => backendFetch<{ repositories: BackendRepo[] }>('/api/repos'),
  addRepo: (data: { name: string; url: string; branch?: string }) =>
    backendFetch<BackendRepo>('/api/repos', { method: 'POST', body: data }),
  updateRepo: (id: string, data: Partial<BackendRepo>) =>
    backendFetch<BackendRepo>(`/api/repos/${id}`, { method: 'PUT', body: data }),
  deleteRepo: (id: string) =>
    backendFetch<{ success: boolean }>(`/api/repos/${id}`, { method: 'DELETE' }),

  // Healing Jobs
  triggerHealing: (data: HealingJobRequest) =>
    backendFetch<HealingJobResponse>('/api/heal', { method: 'POST', body: data, timeout: 60000 }),
  getJobStatus: (jobId: string) =>
    backendFetch<JobStatus>(`/api/status/${jobId}`),
  listJobs: () =>
    backendFetch<{ jobs: JobStatus[] }>('/api/status'),

  // Reports
  getReport: (jobId: string) =>
    backendFetch<unknown>(`/api/reports/${jobId}`),
};

export { BackendApiError };
