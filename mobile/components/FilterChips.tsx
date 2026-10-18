import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';

export type ChipOption<T extends string | undefined = string | undefined> = {
  label: string;
  value: T;
};

type Props<T extends string | undefined> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /** `compact` is the day-phase row: shorter chips beside “Statistica giornata”. */
  size?: 'default' | 'large' | 'compact';
};

/**
 * Horizontal chips sized to their label.
 * Android bug: putting chips as direct ScrollView children measures them into the
 * viewport width (equal squeeze → "Tut"/"Dop"). One inner row View fixes it.
 */
export function FilterChips<T extends string | undefined>({
  options,
  value,
  onChange,
  accessibilityLabel,
  size = 'default',
}: Props<T>) {
  const styles = useThemedStyles(makeStyles);
  const compact = size === 'compact';
  if (options.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroller, compact && styles.scrollerCompact]}
      contentContainerStyle={styles.scrollContent}
      accessibilityLabel={accessibilityLabel}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.row} collapsable={false}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.label + String(opt.value ?? 'all')}
              onPress={() => onChange(opt.value)}
              hitSlop={5}
              style={[styles.chip, compact && styles.chipCompact, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
            >
              <Text
                style={[styles.chipText, compact && styles.chipTextCompact, active && styles.chipTextActive]}
                allowFontScaling={false}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function FilterChipStack({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  scroller: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  scrollerCompact: { flexShrink: 1, marginBottom: 0, minWidth: 0 },
  chip: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  chipCompact: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minHeight: 26,
  },
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    fontSize: fs(13),
  },
  chipTextCompact: { fontSize: fs(11) },
  chipTextActive: { color: colors.accentText, fontFamily: fonts.bodyBold },
});
