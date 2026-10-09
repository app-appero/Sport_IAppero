import { useQuery } from '@tanstack/react-query';

import {
  getCompetitions,
  getEventPredictions,
  getEvents,
  getFeedWithFallback,
  getHealthProviders,
  getPrediction,
  getPredictions,
} from '@/services/api';

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
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['feed', opts?.date ?? null, opts?.sports ?? null, opts?.limit ?? null],
    queryFn: () =>
      getFeedWithFallback({
        date: opts?.date,
        sports: opts?.sports,
        limit: opts?.limit ?? 40,
      }),
    enabled: opts?.enabled ?? true,
    staleTime: 30_000,
  });
}

export function useSportPredictions(
  sport: string,
  opts?: { date?: string; limit?: number; enabled?: boolean },
) {
  return useQuery({
    queryKey: ['predictions', sport, opts?.date ?? null, opts?.limit ?? null],
    queryFn: () => getPredictions(sport, { date: opts?.date, limit: opts?.limit ?? 40 }),
    enabled: opts?.enabled ?? true,
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

export function usePredictionDetail(id: string) {
  return useQuery({
    queryKey: ['prediction', id],
    queryFn: () => getPrediction(id),
    enabled: Boolean(id),
  });
}

export function useEventPredictions(eventId: string) {
  return useQuery({
    queryKey: ['event-predictions', eventId],
    queryFn: () => getEventPredictions(eventId),
    enabled: Boolean(eventId),
  });
}
