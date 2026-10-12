import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useThemedStyles } from '@/components/SportTheme';
import { radii, spacing, type Palette } from '@/constants/theme';

/** Placeholder cards with the shape of `EventCard`, shown while the day loads. */
export function EventCardSkeleton({ count = 5 }: { count?: number }) {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      style={styles.list}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Caricamento partite"
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <Animated.View style={[styles.line, styles.short, animated]} />
          <Animated.View style={[styles.line, styles.title, animated]} />
          <Animated.View style={[styles.line, styles.bar, animated]} />
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    list: {
      alignSelf: 'stretch',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.line,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    line: { backgroundColor: colors.track, borderRadius: radii.sm },
    short: { height: 10, width: '35%' },
    title: { height: 16, width: '70%' },
    bar: { height: 10, width: '100%' },
  });
