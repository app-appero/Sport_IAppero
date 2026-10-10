import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import { buildDayWindow, type DayOption } from '@/utils/dates';

const CHIP_SLOT = 128;
const CHIP_GAP = 12;

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
        x: Math.max(0, (idx - 1) * (CHIP_SLOT + CHIP_GAP)),
        animated: false,
      });
    }
  }, [value, days]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.scrollContent}
      accessibilityLabel="Seleziona giorno"
    >
      <View style={styles.row} collapsable={false}>
        {days.map((d) => (
          <View key={d.key} collapsable={false} style={styles.slot}>
            <DayChip day={d} active={d.value === value} onPress={() => onChange(d.value)} />
          </View>
        ))}
      </View>
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
      <Text style={[styles.weekday, active && styles.textActive]} allowFontScaling={false}>
        {day.weekday}
      </Text>
      <Text style={[styles.label, active && styles.textActive]} allowFontScaling={false}>
        {day.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroller: { flexGrow: 0, marginBottom: spacing.sm },
  scrollContent: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingRight: spacing.sm,
  },
  slot: {
    width: CHIP_SLOT,
    marginRight: CHIP_GAP,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipPast: { backgroundColor: '#151C18' },
  weekday: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
    width: '100%',
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
    marginTop: 4,
    width: '100%',
  },
  textActive: { color: colors.onAccent },
});
