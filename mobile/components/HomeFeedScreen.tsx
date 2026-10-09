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

import { EmptyState } from '@/components/EmptyState';
import { FeedBanner } from '@/components/FeedBanner';
import { FilterChips } from '@/components/FilterChips';
import { PredictionCard } from '@/components/PredictionCard';
import { marketsForSport } from '@/constants/markets';
import { colors, fonts, spacing } from '@/constants/theme';
import { useFeed, useSportCompetitions } from '@/hooks/queries';
import { API_BASE_URL } from '@/services/api';
import type { UnifiedPrediction } from '@/types/api';

type SportFilter = 'all' | 'football' | 'tennis';

const SPORT_CHIPS: { label: string; value: SportFilter }[] = [
  { label: 'Tutti', value: 'all' },
  { label: 'Calcio', value: 'football' },
  { label: 'Tennis', value: 'tennis' },
];

const DATE_CHIPS = [
  { label: 'Oggi', value: undefined as string | undefined },
  { label: '20 Sep', value: '2026-09-20' },
];

export function HomeFeedScreen() {
  const router = useRouter();
  const [sport, setSport] = useState<SportFilter>('all');
  const [date, setDate] = useState<string | undefined>(DATE_CHIPS[0].value);
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
    return opts.length > 1 ? opts : opts;
  }, [sport, footballComps.data?.items, tennisComps.data?.items]);

  const predictions = useMemo(() => {
    const items = feed.data?.items ?? [];
    const flat: UnifiedPrediction[] = [];
    for (const item of items) {
      for (const pred of item.predictions) {
        flat.push(pred);
      }
    }
    return flat;
  }, [feed.data?.items]);

  const filtersActive = Boolean(market || competition || sport !== 'all' || date);

  const clearFilters = () => {
    setSport('all');
    setDate(undefined);
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
          <Text style={styles.title}>Oggi e mercati</Text>
          <Text style={styles.apiHint}>
            API {API_BASE_URL || '(same origin /api → :8000)'}
          </Text>

          <FilterChips
            options={SPORT_CHIPS}
            value={sport}
            onChange={(v) => {
              setSport(v);
              setMarket(undefined);
              setCompetition(undefined);
            }}
            accessibilityLabel="Filtro sport"
          />
          <FilterChips
            options={DATE_CHIPS}
            value={date}
            onChange={setDate}
            accessibilityLabel="Filtro data"
          />
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
            data={predictions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} />
            }
            ListEmptyComponent={
              <EmptyState
                tone={feed.data?.meta.status === 'degraded' ? 'degraded' : 'empty'}
                title={filtersActive ? 'Nessun risultato per questi filtri' : 'Nessuna predizione'}
                subtitle={
                  filtersActive
                    ? 'Prova a togliere mercato o competizione, oppure cambia giorno/sport.'
                    : 'Nessun evento pre-match al momento. Tira per aggiornare.'
                }
                actionLabel={filtersActive ? 'Azzera filtri' : undefined}
                onAction={filtersActive ? clearFilters : undefined}
              />
            }
            renderItem={({ item, index }) => (
              <PredictionCard
                item={item}
                index={index}
                onPress={() =>
                  router.push({
                    pathname: '/prediction/[id]',
                    params: { id: item.id },
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
  },
  apiHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
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
