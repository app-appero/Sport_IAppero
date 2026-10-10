import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import { buildDayWindow, type DayOption } from '@/utils/dates';

const CHIP_WIDTH = 92;
const CHIP_GAP = 10;

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function DayScroller({ value, onChange }: Props) {
  const days = useMemo(() => buildDayWindow(), []);
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const idx = days.findIndex((d) => d.value === value);
    if (idx >= 0) {
      ref.current?.scrollTo({
        x: Math.max(0, (idx - 1) * (CHIP_WIDTH + CHIP_GAP)),
        animated: false,
      });
    }
  }, [value, days]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Seleziona giorno"
    >
      {days.map((d) => (
        <DayChip
          key={d.key}
          day={d}
          active={d.value === value}
          onPress={() => onChange(d.value)}
        />
      ))}
    </ScrollView>
  );
}

function DayChip({
  day,
  active,
  onPress,
}: {
  day: DayOption;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive, day.isPast && !active && styles.chipPast]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[styles.weekday, active && styles.textActive]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {day.weekday}
      </Text>
      <Text
        style={[styles.label, active && styles.textActive]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
      >
        {day.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: CHIP_GAP,
    marginBottom: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    width: CHIP_WIDTH,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipPast: { backgroundColor: '#151C18' },
  weekday: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'capitalize',
    textAlign: 'center',
    // Android custom fonts often clip the last glyph without a hair of padding.
    paddingHorizontal: 2,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  textActive: { color: colors.onAccent },
});
