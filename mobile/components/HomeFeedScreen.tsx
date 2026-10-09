import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { FeedBanner } from '@/components/FeedBanner';
import { PredictionCard } from '@/components/PredictionCard';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useFeed } from '@/hooks/queries';
import { API_BASE_URL } from '@/services/api';
import type { UnifiedPrediction } from '@/types/api';

type SportFilter = 'all' | 'football' | 'tennis';

const SPORT_CHIPS: { label: string; value: SportFilter }[] = [
  { label: 'Tutti', value: 'all' },
  { label: 'Calcio', value: 'football' },
  { label: 'Tennis', value: 'tennis' },
];

const DATE_CHIPS = [
  { label: 'Today', value: undefined as string | undefined },
  { label: '20 Sep', value: '2026-09-20' },
];

export function HomeFeedScreen() {
  const router = useRouter();
  const [sport, setSport] = useState<SportFilter>('all');
  const [date, setDate] = useState<string | undefined>(DATE_CHIPS[0].value);
  const sportsParam =
    sport === 'all' ? 'football,tennis' : sport === 'football' ? 'football' : 'tennis';

  const feed = useFeed({ date, sports: sportsParam, limit: 40 });

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

          <View style={styles.chips}>
            {SPORT_CHIPS.map((opt) => {
              const active = sport === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSport(opt.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.chips}>
            {DATE_CHIPS.map((opt) => {
              const active = date === opt.value;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => setDate(opt.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FeedBanner meta={feed.data?.meta} source={feed.data?.source} />
        </View>

        {feed.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : feed.isError ? (
          <EmptyState
            title="Unable to load feed"
            subtitle={feed.error instanceof Error ? feed.error.message : 'Unknown error'}
          />
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
                title="Nessuna predizione"
                subtitle="Prova un altro giorno o sport, oppure attendi il redeploy Railway del /feed."
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13 },
  chipTextActive: { color: colors.accent },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
