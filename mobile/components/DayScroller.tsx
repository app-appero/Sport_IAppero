import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import { buildDayWindow, type DayOption } from '@/utils/dates';

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
      // Rough chip width ~72 + gap
      ref.current?.scrollTo({ x: Math.max(0, (idx - 2) * 78), animated: false });
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
      <Text style={[styles.weekday, active && styles.textActive]}>{day.weekday}</Text>
      <Text style={[styles.label, active && styles.textActive]} numberOfLines={1}>
        {day.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    minWidth: 70,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipPast: { backgroundColor: '#151C18' },
  weekday: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.inkMuted,
    textTransform: 'capitalize',
  },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  textActive: { color: colors.onAccent },
});
