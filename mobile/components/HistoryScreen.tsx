import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { EventCardSkeleton } from '@/components/EventCardSkeleton';
import { FilterChips } from '@/components/FilterChips';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SportRail, SPORTS, type SportId } from '@/components/SportRail';
import { SportThemeProvider, useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { marketLabel, marketsForSport } from '@/constants/markets';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import { useHistoryPredictions, useHistoryStats } from '@/hooks/queries';
import { useOnline } from '@/hooks/useOnline';
import type { HistoryCounts, HistoryPrediction, SettlementStatus } from '@/types/api';
import { formatApiError } from '@/utils/formatApiError';
import {
  STATUS_LABEL,
  barShares,
  decidedLine,
  excludedNote,
  formatKickoffDay,
  formatRate,
  groupsByMarket,
  othersLine,
} from '@/utils/history';
import { PERIOD_OPTIONS, periodFrom, periodLabel, romeToday, type PeriodId } from '@/utils/period';
import { offlineBannerText } from '@/utils/staleness';
import { selectionLabel } from '@/utils/selectionLabel';

const STATUS_FILTERS: { label: string; value: string | undefined }[] = [
  { label: 'Tutte', value: undefined },
  { label: 'Prese', value: 'won' },
  { label: 'Perse', value: 'lost' },
  { label: 'Annullate', value: 'void' },
  { label: 'In attesa', value: 'pending' },
];

/** Official-ledger history: rate with declared denominator, per-market groups, full list. */
export function HistoryScreen({ initialSport = 'football' }: { initialSport?: SportId }) {
  const [sport, setSport] = useState<SportId>(initialSport);
  return (
    <SportThemeProvider sport={sport}>
      <HistoryBody sport={sport} onSportChange={setSport} />
    </SportThemeProvider>
  );
}

function HistoryBody({
  sport,
  onSportChange,
}: {
  sport: SportId;
  onSportChange: (sport: SportId) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [market, setMarket] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<PeriodId>('all');
  const online = useOnline();

  const from = useMemo(() => periodFrom(period, romeToday()), [period]);
  const stats = useHistoryStats({ sport, market, from });
  const list = useHistoryPredictions({ sport, market, status, from });
  const rows = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  const offlineText = offlineBannerText(online, Boolean(stats.data), stats.dataUpdatedAt);
  const updating = stats.isPlaceholderData || list.isPlaceholderData;

  const header = (
    <View style={styles.header}>
      <SportRail
        value={sport}
        onChange={(next) => {
          onSportChange(next);
          setMarket(undefined);
          setStatus(undefined);
        }}
      />
      <FilterChips
        options={marketsForSport(sport)}
        value={market}
        onChange={setMarket}
        accessibilityLabel="Filtro mercato"
      />
      <FilterChips
        options={PERIOD_OPTIONS}
        value={period}
        onChange={(next) => setPeriod(next ?? 'all')}
        accessibilityLabel="Filtro periodo"
      />
      <OfflineBanner text={offlineText} />
      {stats.data ? (
        <>
          <Hero counts={stats.data.totals} sport={sport} period={period} />
          <Text style={styles.note}>
            Storico delle sole giocate consigliate (PLAY): le altre non sono contate. La percentuale conta solo prese e perse; annullate e in attesa non sono sconfitte.
            {excludedNote(stats.data.excluded_not_pre_match)
              ? ` ${excludedNote(stats.data.excluded_not_pre_match)}`
              : ''}
          </Text>
          {stats.data.groups.length > 0 ? (
            <>
              <Text style={styles.section}>Per mercato</Text>
              {groupsByMarket(stats.data.groups).map((g) => (
                <GroupCard key={g.market} title={marketLabel(g.market)} counts={g} />
              ))}
            </>
          ) : null}
        </>
      ) : null}
      <Text style={styles.section}>Elenco</Text>
      <FilterChips
        options={STATUS_FILTERS}
        value={status}
        onChange={setStatus}
        accessibilityLabel="Filtro stato"
      />
    </View>
  );

  if (stats.isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <EventCardSkeleton count={4} />
      </SafeAreaView>
    );
  }

  if (!stats.data) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <View style={styles.pad}>
          {!online ? (
            <EmptyState
              tone="error"
              title="Sei offline"
              subtitle="Nessun dato salvato per lo storico. Riconnettiti e riprova."
              actionLabel="Riprova"
              onAction={() => stats.refetch()}
            />
          ) : (
            <EmptyState
              tone="error"
              title="Storico non disponibile"
              subtitle={formatApiError(stats.error)}
              actionLabel="Riprova"
              onAction={() => stats.refetch()}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.revision_id)}
        contentContainerStyle={[styles.content, updating && styles.dimmed]}
        ListHeaderComponent={header}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
        }}
        ListFooterComponent={
          rows.length === 0 ? null : list.isFetchingNextPage ? (
            <Text style={styles.listEnd}>Carico altre predizioni…</Text>
          ) : list.hasNextPage ? null : (
            <Text style={styles.listEnd}>
              Fine dell&apos;elenco · {rows.length} {rows.length === 1 ? 'predizione' : 'predizioni'}
            </Text>
          )
        }
        ListEmptyComponent={
          list.isLoading ? (
            <EventCardSkeleton count={3} />
          ) : (
            <EmptyState
              title={status || market || from ? 'Nessuna predizione con questi filtri' : 'Ancora nessuna predizione'}
              subtitle={
                status || market || from
                  ? 'Prova a cambiare mercato, stato o periodo.'
                  : 'Lo storico si riempie man mano che le predizioni ufficiali vengono registrate.'
              }
              actionLabel={status || market || from ? 'Azzera filtri' : undefined}
              onAction={
                status || market || from
                  ? () => {
                      setMarket(undefined);
                      setStatus(undefined);
                      setPeriod('all');
                    }
                  : undefined
              }
            />
          )
        }
        renderItem={({ item }) => <Row item={item} />}
      />
      <View style={styles.footer}>
        <Text style={styles.footText}>
          Solo giocate consigliate (PLAY), ufficiali e registrate prima del calcio d&apos;inizio.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const STATUS_COLOR: Record<SettlementStatus, keyof Palette> = {
  won: 'hitBadge',
  lost: 'missBadge',
  void: 'inkMuted',
  pending: 'warning',
  not_placed: 'inkMuted',
  unknown: 'inkMuted',
};

function Hero({
  counts,
  sport,
  period,
}: {
  counts: HistoryCounts;
  sport: SportId;
  period: PeriodId;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useSportPalette();
  const sportLabel = SPORTS.find((x) => x.value === sport)?.label ?? sport;
  const shares = barShares(counts);
  const others = othersLine(counts);
  return (
    <View style={styles.hero} accessible accessibilityLabel={`Storico: ${formatRate(counts.win_rate)}, ${decidedLine(counts)}`}>
      <Text style={styles.kicker}>{`${sportLabel} · solo giocate consigliate${period === 'all' ? '' : ` · ${periodLabel(period).toLowerCase()}`}`}</Text>
      <Text style={styles.big}>{formatRate(counts.win_rate)}</Text>
      <Text style={styles.sub}>{decidedLine(counts)}</Text>
      {shares.length > 0 ? (
        <View style={styles.stack}>
          {shares.map((s) => (
            <View
              key={s.status}
              style={{ flex: s.share, backgroundColor: colors[STATUS_COLOR[s.status]] as string }}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.legend}>
        <Legend label="Prese" value={counts.won} color={colors.hitBadge} />
        <Legend label="Perse" value={counts.lost} color={colors.missBadge} />
      </View>
      {others ? <Text style={styles.sub}>{others}</Text> : null}
    </View>
  );
}

function Legend({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function GroupCard({ title, counts }: { title: string; counts: HistoryCounts }) {
  const styles = useThemedStyles(makeStyles);
  const others = othersLine(counts);
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Text style={styles.groupTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.groupRate, counts.win_rate == null && styles.groupRateNa]}>
          {formatRate(counts.win_rate)}
        </Text>
      </View>
      <Text style={styles.groupSub}>
        {decidedLine(counts)}
        {others ? ` · ${others}` : ''}
      </Text>
    </View>
  );
}

function Row({ item }: { item: HistoryPrediction }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useSportPalette();
  const st = item.settlement.status;
  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.rowMeta}>{marketLabel(item.market)}</Text>
        <Text style={styles.rowMeta}>{formatKickoffDay(item.kickoff_at)}</Text>
      </View>
      <Text style={styles.rowTitle}>{item.event_name ?? `Partita ${item.event_id.split(':')[1] ?? ''}`}</Text>
      <View style={styles.rowBottom}>
        <Text style={styles.rowPick} numberOfLines={1}>
          {selectionLabel(item.selection)}
          {item.odds != null ? ` · quota ${item.odds.toFixed(2)}` : ''}
        </Text>
        <View style={[styles.badge, { backgroundColor: colors[STATUS_COLOR[st]] as string }]}>
          <Text style={styles.badgeText}>{STATUS_LABEL[st]}</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    pad: { padding: spacing.lg },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
    dimmed: { opacity: 0.4 },
    header: { gap: spacing.sm, paddingTop: spacing.sm },
    hero: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: 4,
    },
    kicker: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(11),
      color: colors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    big: { fontFamily: fonts.display, fontSize: fs(56), color: colors.accentText, lineHeight: fs(60) },
    sub: { fontFamily: fonts.body, fontSize: fs(13), color: colors.inkMuted },
    stack: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginVertical: spacing.sm,
      backgroundColor: colors.track,
    },
    legend: { flexDirection: 'row', gap: spacing.lg },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendText: { fontFamily: fonts.body, fontSize: fs(13), color: colors.ink },
    legendValue: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.ink },
    dot: { width: 8, height: 8, borderRadius: 4 },
    note: {
      fontFamily: fonts.body,
      fontSize: fs(12),
      color: colors.inkMuted,
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radii.sm,
      padding: spacing.sm,
    },
    section: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(11),
      color: colors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: spacing.xs,
    },
    group: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: 2,
    },
    groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    groupTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: fs(14), color: colors.ink },
    groupRate: { fontFamily: fonts.bodyBold, fontSize: fs(16), color: colors.accentText },
    groupRateNa: { color: colors.inkMuted, fontFamily: fonts.body, fontSize: fs(13) },
    groupSub: { fontFamily: fonts.body, fontSize: fs(12), color: colors.inkMuted },
    row: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: 3,
    },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
    rowMeta: { fontFamily: fonts.bodyMedium, fontSize: fs(11), color: colors.inkMuted },
    rowTitle: { fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.ink },
    rowBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    rowPick: { flex: 1, fontFamily: fonts.body, fontSize: fs(13), color: colors.ink },
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: fs(11), color: '#FFFFFF' },
    listEnd: {
      fontFamily: fonts.body,
      fontSize: fs(12),
      color: colors.inkMuted,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
    footer: {
      borderTopColor: colors.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
    },
    footText: { fontFamily: fonts.body, fontSize: fs(11), color: colors.inkMuted },
  });
