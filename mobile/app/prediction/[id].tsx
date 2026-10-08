import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ConfidenceBar } from '@/components/ConfidenceBar';
import { EmptyState } from '@/components/EmptyState';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import { usePredictionDetail } from '@/hooks/queries';

export default function PredictionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = usePredictionDetail(String(id ?? ''));

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Prediction not found"
        subtitle={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  const item = query.data;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.brand}>ORACLE SPORTS</Text>
      <Text style={styles.sport}>{String(item.sport).toUpperCase()}</Text>
      <Text style={styles.event}>{item.event.name}</Text>
      <Text style={styles.meta}>
        {item.event.competition?.name ?? 'Competition'}
        {item.event.start_time ? ` · ${new Date(item.event.start_time).toLocaleString()}` : ''}
      </Text>

      <View style={styles.block}>
        <Text style={styles.label}>Market</Text>
        <Text style={styles.value}>{item.prediction.type.replace(/_/g, ' ')}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Prediction</Text>
        <Text style={styles.pick}>{item.prediction.selection.name}</Text>
        <ConfidenceBar value={item.prediction.confidence} />
      </View>

      {item.probabilities.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.label}>Probabilities</Text>
          {item.probabilities.map((p) => (
            <View key={`${p.key}-${p.label}`} style={styles.probRow}>
              <Text style={styles.probLabel}>{p.label}</Text>
              <Text style={styles.probValue}>{Math.round(p.value * 100)}%</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.label}>Provider</Text>
        <Text style={styles.value}>{item.provider.name}</Text>
      </View>

      <Pressable
        style={styles.cta}
        onPress={() =>
          router.push({
            pathname: '/event/[id]',
            params: { id: item.event.id },
          })
        }
      >
        <Text style={styles.ctaText}>View all markets for this event</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.brand,
    letterSpacing: 1,
  },
  sport: {
    fontFamily: fonts.bodyBold,
    color: colors.inkMuted,
    fontSize: 12,
    letterSpacing: 1,
  },
  event: {
    fontFamily: fonts.bodyBold,
    fontSize: 24,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 14,
  },
  block: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 16,
    textTransform: 'capitalize',
  },
  pick: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.brand,
    lineHeight: 38,
  },
  probRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  probLabel: { fontFamily: fonts.body, color: colors.ink, fontSize: 15 },
  probValue: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 15 },
  cta: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
  },
  ctaText: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
