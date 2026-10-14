import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type {
  AdminPermissionList,
  AdminRefreshResponse,
  AdminRefreshStatus,
  AdminUser,
  AdminUserList,
  CompetitionListResponse,
  EventListResponse,
  EventScorersResponse,
  FeedItem,
  AuthSession,
  AuthUser,
  FeedResponse,
  HistoryPredictionList,
  HistoryStats,
  MarketListResponse,
  PredictionListResponse,
  SportInfo,
  UnifiedPrediction,
  UserRole,
} from '@/types/api';

export class ApiError extends Error {
  status: number;
  code?: string;
  /** Seconds to wait before retrying (BFF 429 on admin refresh). */
  retryAfterSeconds?: number;

  constructor(status: number, message: string, code?: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.name = 'ApiError';
  }
}

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';

  // Web: same-origin so one port-forward (8081) is enough; serve-web proxies /api → :8000.
  if (Platform.OS === 'web') {
    if (fromEnv && !/localhost|127\.0\.0\.1/.test(fromEnv)) {
      return fromEnv;
    }
    return '';
  }

  if (fromEnv) return fromEnv;

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

function extractErrorCode(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as {
      detail?: { code?: string; error?: { code?: string } } | string;
    };
    if (!parsed || typeof parsed !== 'object') return undefined;
    const detail = parsed.detail;
    if (typeof detail === 'string') return undefined;
    return detail?.error?.code || detail?.code;
  } catch {
    return undefined;
  }
}

function extractRetryAfter(body: string): number | undefined {
  try {
    const parsed = JSON.parse(body) as { detail?: { retry_after_seconds?: unknown } | string };
    const detail = parsed?.detail;
    if (!detail || typeof detail === 'string') return undefined;
    const n = Number(detail.retry_after_seconds);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  } catch {
    return undefined;
  }
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  opts?: { body?: unknown; token?: string },
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {};
  if (opts?.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
  const response = await fetch(url, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(
      response.status,
      `API ${response.status} ${path}: ${text.slice(0, 200)}`,
      extractErrorCode(text),
      extractRetryAfter(text),
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function getJson<T>(path: string): Promise<T> {
  return request<T>('GET', path);
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

export function getFeed(opts?: {
  date?: string;
  sports?: string;
  market?: string;
  competition?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}) {
  const params = new URLSearchParams();
  if (opts?.date) params.set('date', opts.date);
  if (opts?.sports) params.set('sports', opts.sports);
  if (opts?.market) params.set('market', opts.market);
  if (opts?.competition) params.set('competition', opts.competition);
  if (opts?.sort) params.set('sort', opts.sort);
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  if (opts?.cursor) params.set('cursor', opts.cursor);
  const q = params.toString() ? `?${params}` : '';
  return getJson<FeedResponse>(`/api/v1/feed${q}`);
}

/** When /feed is not deployed yet, synthesize a feed from per-sport endpoints. */
export async function getFeedWithFallback(opts?: {
  date?: string;
  sports?: string;
  market?: string;
  competition?: string;
  limit?: number;
}): Promise<FeedResponse & { source: 'feed' | 'fallback' }> {
  try {
    const feed = await getFeed(opts);
    return { ...feed, source: 'feed' };
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) throw err;

    const sportList = (opts?.sports || 'football,tennis')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const limit = opts?.limit ?? 30;
    const results = await Promise.all(
      sportList.map(async (sport) => {
        try {
          const res = await getPredictions(sport, {
            date: opts?.date,
            market: opts?.market,
            competitionId: opts?.competition,
            limit,
          });
          return { sport, res, ok: true as const };
        } catch {
          return {
            sport,
            res: {
              items: [] as UnifiedPrediction[],
              meta: {
                count: 0,
                sport,
                provider: sport === 'tennis' ? 'tennis-oracle' : 'soccer-oracle',
                provider_status: 'unavailable',
              },
            },
            ok: false as const,
          };
        }
      }),
    );

    const byEvent = new Map<
      string,
      { event: UnifiedPrediction['event']; predictions: UnifiedPrediction[]; sport: string }
    >();
    for (const { res } of results) {
      for (const pred of res.items) {
        const key = `${pred.sport}:${pred.event.id}`;
        const existing = byEvent.get(key);
        if (!existing) {
          byEvent.set(key, {
            event: pred.event,
            predictions: [pred],
            sport: String(pred.sport),
          });
        } else {
          existing.predictions.push(pred);
        }
      }
    }

    const items = Array.from(byEvent.values()).slice(0, limit);
    const anyOk = results.some((r) => r.ok);
    const allOk = results.every((r) => r.ok);
    const status = !anyOk ? 'unavailable' : allOk ? (items.length ? 'ok' : 'empty') : 'degraded';

    return {
      schema_version: '1',
      snapshot_id: 'fallback-local',
      generated_at: new Date().toISOString(),
      query: {
        date: opts?.date ?? null,
        timezone: 'Europe/Rome',
        sports: sportList,
        market: opts?.market ?? null,
        competition: opts?.competition ?? null,
        sort: 'start_time_asc',
        limit,
      },
      items,
      page: { limit, next_cursor: null },
      meta: {
        status,
        is_complete: allOk,
        providers: results.map((r) => ({
          provider: r.res.meta.provider,
          status: r.ok ? r.res.meta.provider_status : 'unavailable',
          item_count: new Set(r.res.items.map((i) => i.event.id)).size,
          truncated: false,
        })),
        warnings: allOk
          ? ['Feed unificato non ancora deployato — vista da endpoint per sport']
          : ['Feed unificato non disponibile; alcuni provider in errore'],
      },
      source: 'fallback',
    };
  }
}

export function getPrediction(id: string, opts?: { date?: string }) {
  const params = new URLSearchParams();
  if (opts?.date) params.set('date', opts.date);
  const q = params.toString() ? `?${params}` : '';
  return getJson<UnifiedPrediction>(
    `/api/v1/predictions/${encodeURIComponent(id)}${q}`,
  );
}

export async function getEventPredictions(
  eventId: string,
  opts?: { sport?: string; date?: string },
) {
  const params = new URLSearchParams();
  if (opts?.sport) params.set('sport', opts.sport);
  if (opts?.date) params.set('date', opts.date);
  const q = params.toString() ? `?${params}` : '';

  // Prefer feed snapshot / provider rebuild on BFF event detail.
  try {
    const snap = await getJson<FeedItem>(
      `/api/v1/events/${encodeURIComponent(eventId)}${q}`,
    );
    if (snap?.predictions?.length) {
      return {
        items: snap.predictions,
        meta: {
          count: snap.predictions.length,
          sport: snap.sport,
          provider: snap.predictions[0]?.provider?.name ?? 'unknown',
          provider_status: 'ok',
        },
      } satisfies PredictionListResponse;
    }
  } catch {
    // fall through
  }
  return getJson<PredictionListResponse>(
    `/api/v1/events/${encodeURIComponent(eventId)}/predictions${q}`,
  );
}

export function getEventScorers(eventId: string) {
  return getJson<EventScorersResponse>(
    `/api/v1/events/${encodeURIComponent(eventId)}/scorers`,
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

export function getHistoryStats(opts?: { sport?: string; market?: string; from?: string }) {
  const params = new URLSearchParams();
  if (opts?.sport) params.set('sport', opts.sport);
  if (opts?.market) params.set('market', opts.market);
  if (opts?.from) params.set('from', opts.from);
  const q = params.toString() ? `?${params}` : '';
  return getJson<HistoryStats>(`/api/v1/history/stats${q}`);
}

export function getHistoryPredictions(opts?: {
  sport?: string;
  market?: string;
  status?: string;
  from?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.sport) params.set('sport', opts.sport);
  if (opts?.market) params.set('market', opts.market);
  if (opts?.from) params.set('from', opts.from);
  if (opts?.status) params.set('status', opts.status);
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  if (opts?.offset != null) params.set('offset', String(opts.offset));
  const q = params.toString() ? `?${params}` : '';
  return getJson<HistoryPredictionList>(`/api/v1/history/predictions${q}`);
}


export function loginWithGoogle(idToken: string) {
  return request<AuthSession>('POST', '/api/v1/auth/google', { body: { id_token: idToken } });
}

export function getMe(token: string) {
  return request<AuthUser>('GET', '/api/v1/me', { token });
}

export function deleteMe(token: string) {
  return request<void>('DELETE', '/api/v1/me', { token });
}

export function adminListUsers(
  token: string,
  opts?: { limit?: number; offset?: number; q?: string },
) {
  const params = new URLSearchParams();
  params.set('limit', String(opts?.limit ?? 50));
  params.set('offset', String(opts?.offset ?? 0));
  if (opts?.q) params.set('q', opts.q);
  return request<AdminUserList>('GET', `/api/v1/admin/users?${params}`, { token });
}

export function adminListPermissions(token: string) {
  return request<AdminPermissionList>('GET', '/api/v1/admin/permissions', { token });
}

export function adminSetRole(
  token: string,
  userId: string,
  body: { role: Exclude<UserRole, 'super_admin'>; permissions: string[] },
) {
  return request<AdminUser>('PUT', `/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
    token,
    body,
  });
}

export function adminRefresh(token: string, sports: string[], opts?: { forceOutsideHours?: boolean }) {
  return request<AdminRefreshResponse>('POST', '/api/v1/admin/refresh', {
    token,
    body: { sports, force_outside_hours: opts?.forceOutsideHours === true },
  });
}

/** `refs` maps a sport to the `ref` returned when its refresh started. */
export function adminRefreshStatus(token: string, refs: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [sport, ref] of Object.entries(refs)) params.set(sport, ref);
  return request<AdminRefreshStatus>('GET', `/api/v1/admin/refresh/status?${params}`, { token });
}
