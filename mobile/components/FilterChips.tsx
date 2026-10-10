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
  /** Bottom market bar: readable type without Android truncating long labels. */
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
            style={[styles.slot, last && styles.slotLast]}
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
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingRight: spacing.sm,
  },
  rowLarge: {
    marginBottom: spacing.xs,
    paddingVertical: 2,
  },
  slot: {
    marginRight: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
  slotLast: {
    marginRight: 0,
  },
  chip: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    // Compact padding — large padding + bold 16 was clipping labels on Android APK.
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipLarge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: radii.sm,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    fontSize: 13,
  },
  chipTextLarge: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  chipTextActive: { color: colors.onAccent, fontFamily: fonts.bodyBold },
});
