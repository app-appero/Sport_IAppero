import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { DayScroller } from '@/components/DayScroller';
import { DayStatsPanel } from '@/components/DayStatsPanel';
import { DecisionFilterButton } from '@/components/DecisionFilterButton';
import { EmptyState } from '@/components/EmptyState';
import { EventCard } from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/EventCardSkeleton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { FilterChips } from '@/components/FilterChips';
import { ProfileButton } from '@/components/ProfileButton';
import { ProviderWarning } from '@/components/ProviderWarning';
import { SportRail, type SportId } from '@/components/SportRail';
import { SportThemeProvider } from '@/components/SportTheme';
import { marketsForSport, predictionMatchesMarket } from '@/constants/markets';
import { fonts, fs, paletteFor, radii, spacing } from '@/constants/theme';
import { useProviderHealth, useSportPredictions } from '@/hooks/queries';
import { useOnline } from '@/hooks/useOnline';
import { usePersistedBoolean } from '@/hooks/usePersistedBoolean';
import type { FeedItem } from '@/types/api';
import { predictionMatchesDecision, type DecisionFilter } from '@/utils/decisionFilter';
import { buildDayRows, eventMatchesPhase, type DayRow, type ListPhase } from '@/utils/dayOrder';
import { buildDayStats } from '@/utils/dayStats';
import { todayKey } from '@/utils/dates';
import { formatApiError } from '@/utils/formatApiError';
import { offlineBannerText } from '@/utils/staleness';

const PHASE_OPTIONS: { label: string; value: ListPhase }[] = [
  { label: 'Tutte', value: 'all' },
  { label: 'Live', value: 'live' },
  { label: 'Concluse', value: 'done' },
];

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
  const [phase, setPhase] = useState<ListPhase>('all');
  const [decision, setDecision] = useState<DecisionFilter>('all');

  // Statistica giornata: visible by default, the choice is remembered on this device.
  const [statsVisible, toggleStats] = usePersistedBoolean('ui.dayStats.visible', true);

  const health = useProviderHealth();
  // Day feed without market/competition filters — chips and hero picks filter client-side
  // so tournament/league chips only list competitions that have matches that day.
  // No limit: BFF returns every predicted match for the selected calendar day.
  const query = useSportPredictions(sport, {
    date,
  });
  const online = useOnline();
  const offlineText = offlineBannerText(online, Boolean(query.data), query.dataUpdatedAt);
  // Previous day's list kept on screen while the new one loads.
  const showingPrevious = query.isPlaceholderData;
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
    const out: FeedItem[] = [];
    for (const item of dayEvents) {
      if (
        competitionId &&
        !(
          item.event.competition &&
          (item.event.competition.id === competitionId ||
            item.event.competition.name === competitionId)
        )
      ) {
        continue;
      }
      if (!eventMatchesPhase(item.event, phase, todayKey())) continue;
      // Tutti keeps every prediction, including the market chip only as a match gate.
      if (decision === 'all') {
        if (market && !item.predictions.some((p) => predictionMatchesMarket(p.prediction.type, market))) {
          continue;
        }
        out.push(item);
        continue;
      }
      const predictions = item.predictions.filter((p) => {
        if (!predictionMatchesDecision(p, decision)) return false;
        return !market || predictionMatchesMarket(p.prediction.type, market);
      });
      if (predictions.length === 0) continue;
      out.push({ ...item, predictions });
    }
    return out;
  }, [dayEvents, competitionId, market, phase, decision]);

  // Open and live matches by kickoff time, then a "Finite" divider and the finished ones, also by time.
  const rows: DayRow[] = useMemo(() => buildDayRows(events, todayKey()), [events]);

  const filtersActive = Boolean(
    market || competitionId || phase !== 'all' || decision !== 'all' || date !== todayKey(),
  );

  const clearFilters = () => {
    setDate(todayKey());
    setMarket(undefined);
    setCompetitionId(undefined);
    setPhase('all');
    setDecision('all');
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
      params: {
        id: item.event.id,
        sport,
        date,
        ...(decision === 'all' ? {} : { decision }),
      },
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
          <View style={styles.brandRow}>
            <BrandHeader />
<View style={styles.brandActions}>
            <Pressable
              onPress={() => router.push({ pathname: '/storico', params: { sport } })}
              style={[styles.historyBtn, { borderColor: colors.line, backgroundColor: colors.surfaceElevated }]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Apri storico"
            >
              <Text style={[styles.historyText, { color: colors.ink }]} maxFontSizeMultiplier={1.2}>
                Storico
              </Text>
            </Pressable>
            <ProfileButton />
          </View>
          </View>
          {showSportDropdown ? (
            <SportRail
              value={sport}
              onChange={(next) => {
                setSport(next);
                setMarket(undefined);
                setCompetitionId(undefined);
                setPhase('all');
                setDecision('all');
              }}
            />
          ) : null}
          <DayScroller value={date} onChange={onDateChange} />
          <View style={styles.metaRow}>
            {!query.isLoading && !query.isError && dayStats.events > 0 ? (
              <Fragment>
                <View style={styles.phaseSlot}>
                  <FilterChips
                    options={PHASE_OPTIONS}
                    value={phase}
                    onChange={setPhase}
                    accessibilityLabel="Filtro partite live e concluse"
                  />
                </View>
                <Pressable
                  onPress={toggleStats}
                  style={styles.statsToggle}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: statsVisible }}
                  accessibilityLabel={statsVisible ? 'Nascondi statistica giornata' : 'Mostra statistica giornata'}
                >
                  <Text style={[styles.statsToggleText, { color: colors.inkMuted }]} maxFontSizeMultiplier={1.2}>
                    Statistica giornata {statsVisible ? '▴' : '▾'}
                  </Text>
                </Pressable>
              </Fragment>
            ) : null}
          </View>
          {statsVisible && !query.isLoading && !query.isError ? (
            <DayStatsPanel stats={dayStats} sport={sport} />
          ) : null}
          {competitionOptions.length > 1 ? (
            <FilterChips
              options={competitionOptions}
              value={competitionId}
              onChange={setCompetitionId}
              accessibilityLabel="Filtro competizione"
            />
          ) : null}
          <ProviderWarning status={providerHealth?.status} provider={providerHealth?.provider} />
          <OfflineBanner text={offlineText} />
        </View>
        {showingPrevious ? (
          <View
            style={[styles.progress, { backgroundColor: colors.track }]}
            accessibilityRole="progressbar"
            accessibilityLabel="Aggiornamento in corso"
          >
            <View style={[styles.progressFill, { backgroundColor: colors.accent }]} />
          </View>
        ) : null}

        <View style={styles.body}>
        {query.isLoading ? (
          <EventCardSkeleton count={5} />
        ) : !query.data && !online ? (
          <View style={styles.emptyPad}>
            <EmptyState
              tone="error"
              title="Sei offline"
              subtitle="Nessun dato salvato per questo giorno. Riconnettiti e riprova."
              actionLabel="Riprova"
              onAction={() => query.refetch()}
            />
          </View>
        ) : query.isError && !query.data ? (
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
            style={styles.fill}
            data={rows}
            keyExtractor={(row) => (row.kind === 'divider' ? 'divider-finished' : row.item.event.id)}
            contentContainerStyle={[styles.list, showingPrevious && styles.dimmed]}
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
                    ? 'Prova a cambiare stato, mercato, competizione o giorno.'
                    : copy.emptyHint
                }
                actionLabel={filtersActive ? 'Azzera filtri' : undefined}
                onAction={filtersActive ? clearFilters : undefined}
              />
            }
            renderItem={({ item: row, index }) =>
              row.kind === 'divider' ? (
                <Text
                  style={[styles.finishedDivider, { color: colors.inkMuted, borderTopColor: colors.line }]}
                  accessibilityRole="header"
                  maxFontSizeMultiplier={1.2}
                >
                  Finite · {row.count}
                </Text>
              ) : (
                <EventCard
                  item={row.item}
                  index={index}
                  preferredMarket={market}
                  selectedDate={date}
                  onPress={() => openEvent(row.item)}
                />
              )
            }
          />
        )}
        </View>

        <View
          style={[
            styles.marketBar,
            { borderTopColor: colors.line, backgroundColor: colors.surface },
          ]}
        >
          <View style={styles.fabDock} pointerEvents="box-none">
            <DecisionFilterButton key={sport} value={decision} onChange={setDecision} />
          </View>
          <View style={styles.bottomFilters}>
            <FilterChips
              size="large"
              options={marketOptions}
              value={market}
              onChange={setMarket}
              accessibilityLabel="Filtro mercato"
            />
          </View>
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
  body: { flex: 1, minHeight: 0 },
  fill: { flex: 1 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  brandActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  historyBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  historyText: { fontFamily: fonts.bodyBold, fontSize: fs(13) },
  dimmed: { opacity: 0.4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minHeight: 28, gap: 8 },
  phaseSlot: { flexShrink: 1, minWidth: 0, marginBottom: -spacing.sm },
  statsToggle: { minHeight: 28, justifyContent: 'center', paddingHorizontal: 4, flexShrink: 0 },
  statsToggleText: { fontFamily: fonts.bodyBold, fontSize: fs(12) },
  finishedDivider: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(12),
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  progress: { height: 3, overflow: 'hidden' },
  progressFill: { height: 3, width: '40%' },
  emptyPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  marketBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fabDock: {
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    alignItems: 'flex-end',
  },
  bottomFilters: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
});
