import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { fonts, fs, radii, spacing, type Palette } from '@/constants/theme';
import { DECISION_FILTERS, type DecisionFilter } from '@/utils/decisionFilter';

type Props = {
  value: DecisionFilter;
  onChange: (value: DecisionFilter) => void;
};

/**
 * Round filter button. The screen puts it in the market-filter bar, just above the chips,
 * so it stays with that bar instead of floating over it. Closed until tapped.
 */
export function DecisionFilterButton({ value, onChange }: Props) {
  const colors = useSportPalette();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const active = value !== 'all';

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {open ? (
        <View style={styles.panel}>
          {DECISION_FILTERS.map((option) => {
            const selected = value === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange(option.value)}
                style={[styles.chip, selected && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]} allowFontScaling={false}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={[styles.button, active && styles.buttonActive]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? 'Chiudi filtro stati' : 'Apri filtro stati'}
      >
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path
            d="M2.5 3.5h13l-5 6.2V14l-3 1.5V9.7l-5-6.2z"
            fill="none"
            stroke={active ? colors.onAccent : colors.ink}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'flex-end',
      gap: 8,
    },
    panel: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      padding: spacing.sm,
      gap: 6,
      minWidth: 148,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      borderRadius: radii.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
      minHeight: 38,
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    chipText: {
      fontFamily: fonts.bodyMedium,
      color: colors.ink,
      fontSize: fs(13),
    },
    chipTextActive: { color: colors.accentText, fontFamily: fonts.bodyBold },
    button: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  });
