import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ConfidenceBar } from '@/components/ConfidenceBar';
import { marketLabel } from '@/constants/markets';
import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import type { UnifiedPrediction } from '@/types/api';
import { selectionLabel } from '@/utils/selectionLabel';

type Props = {
  item: UnifiedPrediction;
  index?: number;
  onPress: () => void;
};

export function PredictionCard({ item, index = 0, onPress }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <View style={styles.top}>
          <Text style={styles.badge}>
            {(item.event.competition?.name || item.sport).toUpperCase()}
          </Text>
          <Text style={styles.market}>{marketLabel(item.prediction.type)}</Text>
        </View>
        <Text style={styles.event}>{item.event.name}</Text>
        <Text style={styles.pickLabel}>Prediction</Text>
        <Text style={styles.pick}>{selectionLabel(item.prediction.selection.name)}</Text>
        <ConfidenceBar value={item.prediction.confidence} />
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    minHeight: 44,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  badge: {
    color: colors.onAccent,
    backgroundColor: colors.accent,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: fonts.bodyBold,
    fontSize: fs(11),
    letterSpacing: 0.4,
  },
  market: {
    color: colors.inkMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: fs(12),
    textTransform: 'capitalize',
    flexShrink: 1,
    textAlign: 'right',
  },
  event: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(17),
    color: colors.ink,
  },
  pickLabel: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: fs(12),
    marginTop: 2,
  },
  pick: {
    fontFamily: fonts.display,
    fontSize: fs(28),
    color: colors.accentText,
    letterSpacing: 0.5,
    lineHeight: fs(30),
  },
});
