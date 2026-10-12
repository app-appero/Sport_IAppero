import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, paletteFor, radii, spacing, type Palette } from '@/constants/theme';

export type SportId = 'football' | 'tennis';

/** Add a sport here (and a palette in constants/theme.ts) to show it in the rail. */
export const SPORTS: { label: string; value: SportId }[] = [
  { label: 'Calcio', value: 'football' },
  { label: 'Tennis', value: 'tennis' },
];

type Props = {
  value: SportId;
  onChange: (value: SportId) => void;
};

/**
 * Horizontal sport switcher. The active pill takes the sport's own colour;
 * inactive pills carry a dot in theirs. One inner row View (see FilterChips)
 * keeps Android from squeezing the pills into the viewport width.
 */
export function SportRail({ value, onChange }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.scrollContent}
      accessibilityLabel="Seleziona sport"
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.row} collapsable={false}>
        {SPORTS.map((sport) => {
          const active = sport.value === value;
          const palette = paletteFor(sport.value);
          return (
            <Pressable
              key={sport.value}
              onPress={() => onChange(sport.value)}
              style={[
                styles.pill,
                active && { backgroundColor: palette.accent, borderColor: palette.accent },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={sport.label}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: active ? palette.onAccent : palette.dot },
                ]}
              />
              <Text
                style={[styles.label, active && { color: palette.onAccent, fontFamily: fonts.bodyBold }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {sport.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    scroller: { flexGrow: 0, marginBottom: spacing.sm },
    scrollContent: { flexGrow: 0 },
    row: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.sm },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginRight: 8,
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    // flexShrink:0 + padding — Android otherwise clips the last glyph ("Calci").
    label: {
      flexShrink: 0,
      fontFamily: fonts.bodyMedium,
      color: colors.ink,
      fontSize: 15,
      paddingRight: 2,
      includeFontPadding: false,
    },
  });
