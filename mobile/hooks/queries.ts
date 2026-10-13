import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getCompetitions,
  getEventPredictions,
  getEventScorers,
  getEvents,
  getFeedWithFallback,
  getHealthProviders,
  getHistoryPredictions,
  getHistoryStats,
  getPrediction,
  getPredictions,
} from '@/services/api';
import { pollIntervalFor } from '@/utils/staleness';
import { todayKey } from '@/utils/dates';
import { shouldPollScorers } from '@/utils/scorers';
import type { FeedResponse, PredictionListResponse, UnifiedPrediction } from '@/types/api';

export function useProviderHealth() {
  return useQuery({
    queryKey: ['health', 'providers'],
    queryFn: getHealthProviders,
    staleTime: 30_000,
  });
}

export function useFeed(opts?: {
  date?: string;
  sports?: string;
  market?: string;
  competition?: string;
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      'feed',
      opts?.date ?? null,
      opts?.sports ?? null,
      opts?.market ?? null,
      opts?.competition ?? null,
      opts?.limit ?? null,
    ],
    queryFn: () =>
      getFeedWithFallback({
        date: opts?.date,
        sports: opts?.sports,
        market: opts?.market,
        competition: opts?.competition,
        limit: opts?.limit ?? 40,
      }),
    enabled: opts?.enabled ?? true,
    staleTime: 30_000,
    // Keep the previous day on screen while the next one loads.
    placeholderData: keepPreviousData,
    refetchInterval: pollIntervalFor(opts?.date, todayKey()),
  });
}

export function useSportPredictions(
  sport: string,
  opts?: {
    date?: string;
    market?: string;
    competitionId?: string;
    limit?: number;
    enabled?: boolean;
  },
) {
  return useQuery({
    queryKey: [
      'predictions',
      sport,
      opts?.date ?? null,
      opts?.market ?? null,
      opts?.competitionId ?? null,
      opts?.limit ?? null,
    ],
    queryFn: () =>
      getPredictions(sport, {
        date: opts?.date,
        market: opts?.market,
        competitionId: opts?.competitionId,
        // No default limit — day screens need every match; omit unless caller sets it.
        limit: opts?.limit,
      }),
    enabled: opts?.enabled ?? true,
    // Keep the previous day on screen while the next one loads; never carry
    // another sport's list over (different palette, different matches).
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === sport ? previous : undefined,
    // Today refreshes while the app is in the foreground; other days are static.
    refetchInterval: pollIntervalFor(opts?.date, todayKey()),
  });
}

export function useSportCompetitions(sport: string, date?: string) {
  return useQuery({
    queryKey: ['competitions', sport, date ?? null],
    queryFn: () => getCompetitions(sport, date),
  });
}

export function useSportEvents(sport: string, date?: string) {
  return useQuery({
    queryKey: ['events', sport, date ?? null],
    queryFn: () => getEvents(sport, { date }),
  });
}

function predictionFromCaches(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
): UnifiedPrediction | undefined {
  const eventCaches = qc.getQueriesData<PredictionListResponse>({
    queryKey: ['event-predictions'],
  });
  for (const [, data] of eventCaches) {
    const hit = data?.items?.find((item) => item.id === id);
    if (hit) return hit;
  }

  const feedCaches = qc.getQueriesData<FeedResponse>({ queryKey: ['feed'] });
  for (const [, data] of feedCaches) {
    for (const event of data?.items ?? []) {
      const hit = event.predictions?.find((item) => item.id === id);
      if (hit) return hit;
    }
  }
  return undefined;
}

export function usePredictionDetail(id: string, opts?: { date?: string }) {
  const qc = useQueryClient();
  const cached = id ? predictionFromCaches(qc, id) : undefined;
  return useQuery({
    queryKey: ['prediction', id, opts?.date ?? null],
    queryFn: () => getPrediction(id, { date: opts?.date }),
    enabled: Boolean(id),
    // Reuse the board already loaded on the event page so past-day taps
    // open instantly; background refetch can enrich EV when available.
    ...(cached
      ? { initialData: cached, staleTime: 30_000 }
      : {}),
  });
}

export function useEventPredictions(
  eventId: string,
  opts?: { sport?: string; date?: string },
) {
  return useQuery({
    queryKey: ['event-predictions', eventId, opts?.sport ?? null, opts?.date ?? null],
    queryFn: () => getEventPredictions(eventId, opts),
    enabled: Boolean(eventId),
  });
}

export const SCORERS_STALE_MS = 2 * 60_000;
export const SCORERS_PENDING_REFETCH_MS = 5 * 60_000;

/** Possible scorers (football only). Until the official line-up is out, refetch every 5 min. */
export function useEventScorers(eventId: string, enabled = true) {
  return useQuery({
    queryKey: ['event-scorers', eventId],
    queryFn: () => getEventScorers(eventId),
    enabled: enabled && Boolean(eventId),
    staleTime: SCORERS_STALE_MS,
    // Keep the last snapshot on screen (also offline / while refetching).
    placeholderData: keepPreviousData,
    // Only polls while data says "not available yet"; React Query pauses it in
    // background and offline. Errors stop the polling and the section hides.
    refetchInterval: (query) => (shouldPollScorers(query.state.data) ? SCORERS_PENDING_REFETCH_MS : false),
  });
}

export function useHistoryStats(opts?: { sport?: string; market?: string; from?: string }) {
  return useQuery({
    queryKey: ['history', 'stats', opts?.sport ?? null, opts?.market ?? null, opts?.from ?? null],
    queryFn: () => getHistoryStats(opts),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export const HISTORY_PAGE_SIZE = 50;

/** Ledger list, 50 rows per page; the BFF has no total, a full page means "maybe more". */
export function useHistoryPredictions(opts?: {
  sport?: string;
  market?: string;
  status?: string;
  from?: string;
}) {
  return useInfiniteQuery({
    queryKey: [
      'history',
      'predictions',
      opts?.sport ?? null,
      opts?.market ?? null,
      opts?.status ?? null,
      opts?.from ?? null,
    ],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getHistoryPredictions({ ...opts, limit: HISTORY_PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (last) =>
      last.count >= HISTORY_PAGE_SIZE ? last.offset + HISTORY_PAGE_SIZE : undefined,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
