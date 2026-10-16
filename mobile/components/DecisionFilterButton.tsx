import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { fonts, fs, radii, spacing, type Palette } from '@/constants/theme';
import { DECISION_FILTERS, type DecisionFilter } from '@/utils/decisionFilter';

type Props = {
  value: DecisionFilter;
  onChange: (value: DecisionFilter) => void;
};

/**
 * Funnel button. Closed until tapped, then Tutti / Play / Borderline / No bet
 * open on a horizontal row underneath and push whatever follows downward.
 */
export function DecisionFilterButton({ value, onChange }: Props) {
  const colors = useSportPalette();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const active = value !== 'all';

  return (
    <View style={styles.wrap}>
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
      {open ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroller}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.row} collapsable={false}>
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
        </ScrollView>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      gap: 8,
    },
    scroller: { alignSelf: 'stretch', flexGrow: 0 },
    scrollContent: { flexGrow: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingRight: spacing.sm,
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
