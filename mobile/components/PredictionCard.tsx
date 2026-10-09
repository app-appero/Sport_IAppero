import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ConfidenceBar } from '@/components/ConfidenceBar';
import { marketLabel } from '@/constants/markets';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import type { UnifiedPrediction } from '@/types/api';

type Props = {
  item: UnifiedPrediction;
  index?: number;
  onPress: () => void;
};

export function PredictionCard({ item, index = 0, onPress }: Props) {
  const sportColor = item.sport === 'tennis' ? colors.tennis : colors.football;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <View style={styles.top}>
          <Text style={[styles.badge, { backgroundColor: sportColor }]}>
            {(item.event.competition?.name || item.sport).toUpperCase()}
          </Text>
          <Text style={styles.market}>{marketLabel(item.prediction.type)}</Text>
        </View>
        <Text style={styles.event}>{item.event.name}</Text>
        <Text style={styles.pickLabel}>Prediction</Text>
        <Text style={styles.pick}>{item.prediction.selection.name}</Text>
        <ConfidenceBar value={item.prediction.confidence} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    minHeight: 44,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  badge: {
    color: colors.accent,
    overflow: 'hidden',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  market: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textTransform: 'capitalize',
    flexShrink: 1,
    textAlign: 'right',
  },
  event: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.ink,
  },
  pickLabel: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pick: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.brand,
    letterSpacing: 0.5,
    lineHeight: 30,
  },
});
