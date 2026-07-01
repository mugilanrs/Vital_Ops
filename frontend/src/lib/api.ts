import type {
  AnalyticsSummary,
  DqResult,
  Incident,
  IncidentListResponse,
  IntelligenceResult,
  IrrResult,
  Team,
  TrendPoint,
  TriageResult,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  incidents: {
    list: (params: {
      status?: string;
      service_instance?: string;
      priority?: string;
      is_live?: boolean;
      search?: string;
      page?: number;
      page_size?: number;
    } = {}) => {
      const q = new URLSearchParams();
      if (params.status) q.set('status', params.status);
      if (params.service_instance) q.set('service_instance', params.service_instance);
      if (params.priority) q.set('priority', params.priority);
      if (params.is_live !== undefined) q.set('is_live', String(params.is_live));
      if (params.search) q.set('search', params.search);
      if (params.page) q.set('page', String(params.page));
      if (params.page_size) q.set('page_size', String(params.page_size));
      return req<IncidentListResponse>(`/incidents?${q}`);
    },

    get: (ticketId: string) => req<Incident>(`/incidents/${ticketId}`),

    create: (body: {
      service_instance: string;
      subject: string;
      description: string;
      priority?: string;
      impact?: string;
      reporter_name?: string;
      organisation?: string;
      department?: string;
      location?: string;
      source?: string;
      environment?: string;
      category?: string;
      incident_type?: string;
    }) => req<Incident>('/incidents', { method: 'POST', body: JSON.stringify(body) }),

    runTriage: (ticketId: string) =>
      req<TriageResult>(`/incidents/${ticketId}/triage`, { method: 'POST' }),

    runIntelligence: (ticketId: string) =>
      req<IntelligenceResult>(`/incidents/${ticketId}/intelligence`, { method: 'POST' }),

    runIrr: (ticketId: string) =>
      req<IrrResult>(`/incidents/${ticketId}/irr`, { method: 'POST' }),

    resolve: (ticketId: string, resolution_notes: string) =>
      req<Incident>(`/incidents/${ticketId}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ resolution_notes }),
      }),

    runDq: (ticketId: string) =>
      req<DqResult>(`/incidents/${ticketId}/dq`, { method: 'POST' }),

    runPipeline: (ticketId: string) =>
      req<Record<string, unknown>>(`/incidents/${ticketId}/run-pipeline`, { method: 'POST' }),
  },

  teams: {
    list: () => req<Team[]>('/teams'),
    engineers: (teamId: string) => req<import('./types').Engineer[]>(`/teams/${teamId}/engineers`),
  },

  analytics: {
    summary: () => req<AnalyticsSummary>('/analytics/summary'),
    trends: (days?: number) =>
      req<TrendPoint[]>(`/analytics/trends${days ? `?days=${days}` : ''}`),
  },
};
