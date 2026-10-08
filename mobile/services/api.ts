import Constants from 'expo-constants';

import type {
  CompetitionListResponse,
  EventListResponse,
  MarketListResponse,
  PredictionListResponse,
  SportInfo,
  UnifiedPrediction,
} from '@/types/api';

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000`;
    }
  }
  return 'http://localhost:8000';
}

export const API_BASE_URL = resolveBaseUrl();

async function getJson<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status} ${path}: ${text.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

export function getSports() {
  return getJson<SportInfo[]>('/api/v1/sports');
}

export function getCompetitions(sport: string, date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return getJson<CompetitionListResponse>(`/api/v1/sports/${sport}/competitions${q}`);
}

export function getEvents(sport: string, opts?: { date?: string; competitionId?: string }) {
  const params = new URLSearchParams();
  if (opts?.date) params.set('date', opts.date);
  if (opts?.competitionId) params.set('competition_id', opts.competitionId);
  const q = params.toString() ? `?${params}` : '';
  return getJson<EventListResponse>(`/api/v1/sports/${sport}/events${q}`);
}

export function getPredictions(
  sport: string,
  opts?: {
    date?: string;
    competitionId?: string;
    eventId?: string;
    market?: string;
    minConfidence?: number;
    limit?: number;
  },
) {
  const params = new URLSearchParams();
  if (opts?.date) params.set('date', opts.date);
  if (opts?.competitionId) params.set('competition_id', opts.competitionId);
  if (opts?.eventId) params.set('event_id', opts.eventId);
  if (opts?.market) params.set('market', opts.market);
  if (opts?.minConfidence != null) params.set('min_confidence', String(opts.minConfidence));
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  const q = params.toString() ? `?${params}` : '';
  return getJson<PredictionListResponse>(`/api/v1/sports/${sport}/predictions${q}`);
}

export function getPrediction(id: string) {
  return getJson<UnifiedPrediction>(`/api/v1/predictions/${encodeURIComponent(id)}`);
}

export function getEventPredictions(eventId: string) {
  return getJson<PredictionListResponse>(
    `/api/v1/events/${encodeURIComponent(eventId)}/predictions`,
  );
}

export function getMarkets(sport: string) {
  return getJson<MarketListResponse>(`/api/v1/sports/${sport}/markets`);
}

export function getHealthProviders() {
  return getJson<Record<string, { provider: string; status: string; detail?: string | null }>>(
    '/api/v1/health/providers',
  );
}
