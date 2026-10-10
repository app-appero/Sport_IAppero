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
  /** `large` for bottom market bar — wider slots + bigger type for APK. */
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
      {options.map((opt, i) => {
        const active = value === opt.value;
        const last = i === options.length - 1;
        return (
          <View
            key={opt.label + String(opt.value ?? 'all')}
            collapsable={false}
            style={[
              styles.slot,
              large && styles.slotLarge,
              last && styles.slotLast,
            ]}
          >
            <Pressable
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
                allowFontScaling={false}
              >
                {opt.label}
              </Text>
            </Pressable>
          </View>
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
    alignItems: 'stretch',
    marginBottom: spacing.sm,
    paddingRight: spacing.sm,
  },
  rowLarge: {
    marginBottom: spacing.xs,
    paddingVertical: 4,
  },
  // margin instead of gap — gap in horizontal ScrollView compresses children on Android APK.
  slot: {
    marginRight: 8,
    flexShrink: 0,
  },
  slotLarge: {
    marginRight: 12,
    minWidth: 170,
  },
  slotLast: {
    marginRight: 0,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLarge: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    minHeight: 58,
    borderRadius: radii.md,
    minWidth: 170,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    fontSize: 13,
  },
  chipTextLarge: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  chipTextActive: { color: colors.onAccent },
});
