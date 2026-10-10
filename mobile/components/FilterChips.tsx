import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';

export type ChipOption<T extends string | undefined = string | undefined> = {
  label: string;
  value: T;
};

type ChipSize = 'default' | 'large';

type Props<T extends string | undefined> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /** `large` for bottom market bar — more padding + bigger type for APK readability. */
  size?: ChipSize;
};

export function FilterChips<T extends string | undefined>({
  options,
  value,
  onChange,
  accessibilityLabel,
  size = 'default',
}: Props<T>) {
  if (options.length === 0) return null;
  const large = size === 'large';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, large && styles.rowLarge]}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.label + String(opt.value ?? 'all')}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, large && styles.chipLarge, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.chipText,
                large && styles.chipTextLarge,
                active && styles.chipTextActive,
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function FilterChipStack({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    marginBottom: spacing.sm,
    paddingRight: spacing.sm,
  },
  rowLarge: {
    gap: 10,
    marginBottom: spacing.xs,
    paddingVertical: 4,
  },
  chip: {
    // Horizontal ScrollView on Android compresses children without flexShrink:0.
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipLarge: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 52,
    borderRadius: radii.md,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: {
    flexShrink: 0,
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    fontSize: 13,
    paddingHorizontal: 2,
    includeFontPadding: false,
  },
  chipTextLarge: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    paddingHorizontal: 4,
  },
  chipTextActive: { color: colors.onAccent },
});
