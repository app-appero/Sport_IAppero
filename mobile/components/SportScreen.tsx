import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayScroller } from '@/components/DayScroller';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { FilterChips } from '@/components/FilterChips';
import { ProviderWarning } from '@/components/ProviderWarning';
import { SportDropdown, type SportId } from '@/components/SportDropdown';
import { APP_NAME } from '@/constants/brand';
import { marketsForSport } from '@/constants/markets';
import { colors, fonts, gradients, spacing } from '@/constants/theme';
import { useProviderHealth, useSportCompetitions, useSportPredictions } from '@/hooks/queries';
import type { FeedItem, PredictionListResponse } from '@/types/api';
import { todayKey } from '@/utils/dates';

const SPORT_COPY: Record<SportId, { emptyHint: string }> = {
  football: {
    emptyHint: 'Nessuna partita per la giornata selezionata.',
  },
  tennis: {
    emptyHint: 'Nessuna prediction tennis per questa giornata.',
  },
};

type Props = {
  /** Initial sport when embedding a fixed tab; omit for dropdown-driven browse. */
  initialSport?: SportId;
  showSportDropdown?: boolean;
};

export function SportScreen({
  initialSport = 'football',
  showSportDropdown = true,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sport, setSport] = useState<SportId>(initialSport);
  const [date, setDate] = useState(todayKey());
  const [market, setMarket] = useState<string | undefined>(undefined);
  const [competitionId, setCompetitionId] = useState<string | undefined>(undefined);

  const health = useProviderHealth();
  const query = useSportPredictions(sport, {
    date,
    market,
    competitionId,
    limit: 100,
  });
  const competitions = useSportCompetitions(sport, date);
  const providerHealth = health.data?.[sport];
  const copy = SPORT_COPY[sport];

  const marketOptions = useMemo(() => marketsForSport(sport), [sport]);
  const competitionOptions = useMemo(() => {
    const opts: { label: string; value: string | undefined }[] = [
      { label: sport === 'tennis' ? 'Tutti i tornei' : 'Tutti i campionati', value: undefined },
    ];
    const seen = new Set<string>();
    for (const c of competitions.data?.items ?? []) {
      const key = c.id || c.name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      opts.push({ label: c.name, value: key });
    }
    return opts;
  }, [competitions.data?.items, sport]);

  const events: FeedItem[] = useMemo(() => {
    const byEvent = new Map<string, FeedItem>();
    for (const pred of query.data?.items ?? []) {
      const key = pred.event.id;
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
    return Array.from(byEvent.values());
  }, [query.data?.items]);

  const filtersActive = Boolean(market || competitionId || date !== todayKey());

  const clearFilters = () => {
    setDate(todayKey());
    setMarket(undefined);
    setCompetitionId(undefined);
  };

  const onDateChange = (next: string) => {
    setDate(next);
    // Competition chips are day-scoped; keep a stale league and past days look empty.
    setCompetitionId(undefined);
  };

  const openEvent = (item: FeedItem) => {
    const payload: PredictionListResponse = {
      items: item.predictions,
      meta: {
        count: item.predictions.length,
        sport: item.sport,
        provider: item.predictions[0]?.provider?.name ?? 'unknown',
        provider_status: 'ok',
      },
    };
    // Seed cache so detail is instant even if snapshot/provider lookup lags.
    queryClient.setQueryData(['event-predictions', item.event.id, sport, date], payload);
    router.push({
      pathname: '/event/[id]',
      params: { id: item.event.id, sport, date },
    });
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...gradients.screen]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          {showSportDropdown ? (
            <SportDropdown
              value={sport}
              onChange={(next) => {
                setSport(next);
                setMarket(undefined);
                setCompetitionId(undefined);
              }}
            />
          ) : null}
          <DayScroller value={date} onChange={onDateChange} />
          {competitionOptions.length > 1 ? (
            <FilterChips
              options={competitionOptions}
              value={competitionId}
              onChange={setCompetitionId}
              accessibilityLabel="Filtro competizione"
            />
          ) : null}
          <ProviderWarning status={providerHealth?.status} provider={providerHealth?.provider} />
        </View>

        {query.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : query.isError ? (
          <View style={styles.emptyPad}>
            <EmptyState
              tone="error"
              title="Impossibile caricare le predizioni"
              subtitle={query.error instanceof Error ? query.error.message : 'Errore sconosciuto'}
              actionLabel="Riprova"
              onAction={() => query.refetch()}
            />
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.event.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor={colors.accent}
              />
            }
            ListEmptyComponent={
              <EmptyState
                tone={
                  providerHealth?.status && providerHealth.status !== 'ok' ? 'degraded' : 'empty'
                }
                title={filtersActive ? 'Nessun risultato per questi filtri' : 'Nessuna partita'}
                subtitle={
                  filtersActive
                    ? 'Prova a cambiare mercato, competizione o giorno.'
                    : copy.emptyHint
                }
                actionLabel={filtersActive ? 'Azzera filtri' : undefined}
                onAction={filtersActive ? clearFilters : undefined}
              />
            }
            renderItem={({ item, index }) => (
              <EventCard
                item={item}
                index={index}
                preferredMarket={market}
                onPress={() => openEvent(item)}
              />
            )}
          />
        )}

        <View style={styles.bottomFilters}>
          <FilterChips
            options={marketOptions}
            value={market}
            onChange={setMarket}
            accessibilityLabel="Filtro mercato"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 6,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.accent,
    letterSpacing: 0.5,
    lineHeight: 36,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  bottomFilters: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
});
