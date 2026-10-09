import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
import { FeedBanner } from '@/components/FeedBanner';
import { FilterChips } from '@/components/FilterChips';
import { SportDropdown, type SportFilter } from '@/components/SportDropdown';
import { marketsForSport } from '@/constants/markets';
import { colors, fonts, spacing } from '@/constants/theme';
import { useFeed, useSportCompetitions } from '@/hooks/queries';
import type { FeedItem } from '@/types/api';
import { todayKey } from '@/utils/dates';

export function HomeFeedScreen() {
  const router = useRouter();
  const [sport, setSport] = useState<SportFilter>('all');
  const [date, setDate] = useState(todayKey());
  const [market, setMarket] = useState<string | undefined>(undefined);
  const [competition, setCompetition] = useState<string | undefined>(undefined);

  const sportsParam =
    sport === 'all' ? 'football,tennis' : sport === 'football' ? 'football' : 'tennis';

  const feed = useFeed({
    date,
    sports: sportsParam,
    market,
    competition,
    limit: 40,
  });

  const footballComps = useSportCompetitions('football', date);
  const tennisComps = useSportCompetitions('tennis', date);

  const marketOptions = useMemo(() => marketsForSport(sport), [sport]);

  const competitionOptions = useMemo(() => {
    const items = [
      ...(sport === 'all' || sport === 'football' ? footballComps.data?.items ?? [] : []),
      ...(sport === 'all' || sport === 'tennis' ? tennisComps.data?.items ?? [] : []),
    ];
    const seen = new Set<string>();
    const opts: { label: string; value: string | undefined }[] = [
      { label: 'Tutte le competizioni', value: undefined },
    ];
    for (const c of items) {
      const key = c.id || c.name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      opts.push({ label: c.name, value: key });
    }
    return opts;
  }, [sport, footballComps.data?.items, tennisComps.data?.items]);

  const events: FeedItem[] = useMemo(() => feed.data?.items ?? [], [feed.data?.items]);

  const filtersActive = Boolean(market || competition || sport !== 'all' || date !== todayKey());

  const clearFilters = () => {
    setSport('all');
    setDate(todayKey());
    setMarket(undefined);
    setCompetition(undefined);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#E7F2E4', colors.surface, '#F7F3E8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.brand}>ORACLE SPORTS</Text>
          <Text style={styles.eyebrow}>Home · feed unificato</Text>
          <Text style={styles.title}>Partite e mercati</Text>

          <SportDropdown
            value={sport}
            onChange={(v) => {
              setSport(v);
              setMarket(undefined);
              setCompetition(undefined);
            }}
          />
          <DayScroller value={date} onChange={setDate} />
          <FilterChips
            options={marketOptions}
            value={market}
            onChange={setMarket}
            accessibilityLabel="Filtro mercato"
          />
          {competitionOptions.length > 1 ? (
            <FilterChips
              options={competitionOptions}
              value={competition}
              onChange={setCompetition}
              accessibilityLabel="Filtro competizione"
            />
          ) : null}

          <FeedBanner meta={feed.data?.meta} source={feed.data?.source} />
        </View>

        {feed.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : feed.isError ? (
          <View style={styles.emptyPad}>
            <EmptyState
              tone="error"
              title="Impossibile caricare il feed"
              subtitle={feed.error instanceof Error ? feed.error.message : 'Errore sconosciuto'}
              actionLabel="Riprova"
              onAction={() => feed.refetch()}
            />
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => `${item.sport}:${item.event.id}`}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} />
            }
            ListEmptyComponent={
              <EmptyState
                tone={feed.data?.meta.status === 'degraded' ? 'degraded' : 'empty'}
                title={filtersActive ? 'Nessun risultato per questi filtri' : 'Nessuna partita'}
                subtitle={
                  filtersActive
                    ? 'Prova un altro giorno, mercato o competizione.'
                    : 'Nessun evento per questa giornata. Tira per aggiornare.'
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
                onPress={() =>
                  router.push({
                    pathname: '/event/[id]',
                    params: { id: item.event.id },
                  })
                }
              />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: colors.brand,
    letterSpacing: 1,
    lineHeight: 44,
  },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: 4,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
