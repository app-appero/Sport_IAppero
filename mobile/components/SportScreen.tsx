import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { PredictionCard } from '@/components/PredictionCard';
import { ProviderWarning } from '@/components/ProviderWarning';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { useProviderHealth, useSportPredictions } from '@/hooks/queries';
import { API_BASE_URL } from '@/services/api';

type DateOption = { label: string; value?: string };

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
  const health = useProviderHealth();
  const query = useSportPredictions(sport, { date, limit: 50 });
  const providerKey = sport === 'football' ? 'football' : 'tennis';
  const providerHealth = health.data?.[providerKey];

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
          <Text style={styles.apiHint}>API {API_BASE_URL}</Text>
          {dateOptions && dateOptions.length > 0 ? (
            <View style={styles.chips}>
              {dateOptions.map((opt) => {
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
          ) : null}
          <ProviderWarning status={providerHealth?.status} provider={providerHealth?.provider} />
        </View>

        {query.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : query.isError ? (
          <EmptyState
            title="Unable to load predictions"
            subtitle={query.error instanceof Error ? query.error.message : 'Unknown error'}
          />
        ) : (
          <FlatList
            data={query.data?.items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
            }
            ListEmptyComponent={
              <EmptyState title="No predictions right now" subtitle={emptyHint} />
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
