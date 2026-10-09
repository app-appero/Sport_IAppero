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
import { FilterChips } from '@/components/FilterChips';
import { PredictionCard } from '@/components/PredictionCard';
import { ProviderWarning } from '@/components/ProviderWarning';
import { marketsForSport } from '@/constants/markets';
import { colors, fonts, spacing } from '@/constants/theme';
import { useProviderHealth, useSportCompetitions, useSportPredictions } from '@/hooks/queries';
import { API_BASE_URL } from '@/services/api';

type DateOption = { label: string; value: string | undefined };

type Props = {
  sport: 'football' | 'tennis';
  title: string;
  eyebrow: string;
  emptyHint: string;
  dateOptions?: DateOption[];
};

export function SportScreen({ sport, title, eyebrow, emptyHint, dateOptions }: Props) {
  const router = useRouter();
  const [date, setDate] = useState<string | undefined>(dateOptions?.[0]?.value);
  const [market, setMarket] = useState<string | undefined>(undefined);
  const [competitionId, setCompetitionId] = useState<string | undefined>(undefined);

  const health = useProviderHealth();
  const query = useSportPredictions(sport, {
    date,
    market,
    competitionId,
    limit: 50,
  });
  const competitions = useSportCompetitions(sport, date);
  const providerKey = sport === 'football' ? 'football' : 'tennis';
  const providerHealth = health.data?.[providerKey];

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

  const filtersActive = Boolean(market || competitionId || date);

  const clearFilters = () => {
    setDate(dateOptions?.[0]?.value);
    setMarket(undefined);
    setCompetitionId(undefined);
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
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.apiHint}>
            API {API_BASE_URL || '(same origin /api → :8000)'}
          </Text>
          {dateOptions && dateOptions.length > 0 ? (
            <FilterChips
              options={dateOptions}
              value={date}
              onChange={setDate}
              accessibilityLabel="Filtro data"
            />
          ) : null}
          <FilterChips
            options={marketOptions}
            value={market}
            onChange={setMarket}
            accessibilityLabel="Filtro mercato"
          />
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
            <ActivityIndicator color={colors.brand} />
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
            data={query.data?.items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
            }
            ListEmptyComponent={
              <EmptyState
                tone={
                  providerHealth?.status && providerHealth.status !== 'ok' ? 'degraded' : 'empty'
                }
                title={filtersActive ? 'Nessun risultato per questi filtri' : 'Nessuna predizione'}
                subtitle={
                  filtersActive
                    ? 'Prova a cambiare mercato, competizione o giorno.'
                    : emptyHint
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
