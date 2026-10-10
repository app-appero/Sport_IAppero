import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';

export type ChipOption<T extends string | undefined = string | undefined> = {
  label: string;
  value: T;
};

type Props<T extends string | undefined> = {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /** Kept for call-site compat; both sizes use content-width chips (no viewport split). */
  size?: 'default' | 'large';
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
}: Props<T>) {
  if (options.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
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
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
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

const styles = StyleSheet.create({
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
  chip: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.ink,
    fontSize: 13,
  },
  chipTextActive: { color: colors.onAccent, fontFamily: fonts.bodyBold },
});
