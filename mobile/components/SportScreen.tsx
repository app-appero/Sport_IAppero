import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { DayScroller } from '@/components/DayScroller';
import { DayStatsPanel } from '@/components/DayStatsPanel';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { FilterChips } from '@/components/FilterChips';
import { ProviderWarning } from '@/components/ProviderWarning';
import { SportRail, type SportId } from '@/components/SportRail';
import { SportThemeProvider } from '@/components/SportTheme';
import { marketsForSport, predictionMatchesMarket } from '@/constants/markets';
import { paletteFor, spacing } from '@/constants/theme';
import { useProviderHealth, useSportPredictions } from '@/hooks/queries';
import type { FeedItem } from '@/types/api';
import { buildDayStats } from '@/utils/dayStats';
import { todayKey } from '@/utils/dates';
import { formatApiError } from '@/utils/formatApiError';

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
  const [sport, setSport] = useState<SportId>(initialSport);
  const [date, setDate] = useState(todayKey());
  const [market, setMarket] = useState<string | undefined>(undefined);
  const [competitionId, setCompetitionId] = useState<string | undefined>(undefined);

  const health = useProviderHealth();
  // Day feed without market/competition filters — chips and hero picks filter client-side
  // so tournament/league chips only list competitions that have matches that day.
  // No limit: BFF returns every predicted match for the selected calendar day.
  const query = useSportPredictions(sport, {
    date,
  });
  const providerHealth = health.data?.[sport];
  const copy = SPORT_COPY[sport];
  const colors = paletteFor(sport);

  const marketOptions = useMemo(() => marketsForSport(sport), [sport]);

  const dayEvents: FeedItem[] = useMemo(() => {
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

  const competitionOptions = useMemo(() => {
    const opts: { label: string; value: string | undefined }[] = [
      { label: sport === 'tennis' ? 'Tutti i tornei' : 'Tutti i campionati', value: undefined },
    ];
    const seen = new Set<string>();
    for (const item of dayEvents) {
      const c = item.event.competition;
      if (!c) continue;
      const key = c.id || c.name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      opts.push({ label: c.name, value: key });
    }
    return opts;
  }, [dayEvents, sport]);

  // Full-day stats (not narrowed by market/competition chips).
  const dayStats = useMemo(
    () => buildDayStats(dayEvents, { date }),
    [dayEvents, date],
  );

  useEffect(() => {
    if (!competitionId) return;
    const stillThere = competitionOptions.some((o) => o.value === competitionId);
    if (!stillThere) setCompetitionId(undefined);
  }, [competitionId, competitionOptions]);

  const events: FeedItem[] = useMemo(() => {
    return dayEvents.filter((item) => {
      if (
        competitionId &&
        !(
          item.event.competition &&
          (item.event.competition.id === competitionId ||
            item.event.competition.name === competitionId)
        )
      ) {
        return false;
      }
      if (market && !item.predictions.some((p) => predictionMatchesMarket(p.prediction.type, market))) {
        return false;
      }
      return true;
    });
  }, [dayEvents, competitionId, market]);

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
    // Do not seed day-shaped predictions: event detail must fetch match
    // boards (1x2 / both OU sides) + EV from the provider.
    router.push({
      pathname: '/event/[id]',
      params: { id: item.event.id, sport, date },
    });
  };

  return (
    <SportThemeProvider sport={sport}>
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <LinearGradient
        colors={[...colors.gradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <BrandHeader />
          {showSportDropdown ? (
            <SportRail
              value={sport}
              onChange={(next) => {
                setSport(next);
                setMarket(undefined);
                setCompetitionId(undefined);
              }}
            />
          ) : null}
          <DayScroller value={date} onChange={onDateChange} />
          {!query.isLoading && !query.isError ? <DayStatsPanel stats={dayStats} /> : null}
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
              subtitle={formatApiError(query.error)}
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
                selectedDate={date}
                onPress={() => openEvent(item)}
              />
            )}
          />
        )}

        <View
          style={[
            styles.bottomFilters,
            { borderTopColor: colors.line, backgroundColor: colors.surface },
          ]}
        >
          <FilterChips
            size="large"
            options={marketOptions}
            value={market}
            onChange={setMarket}
            accessibilityLabel="Filtro mercato"
          />
        </View>
      </SafeAreaView>
    </View>
    </SportThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 6,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  bottomFilters: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
