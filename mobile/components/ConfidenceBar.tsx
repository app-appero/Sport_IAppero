import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii } from '@/constants/theme';

export function ConfidenceBar({ value }: { value: number | null }) {
  const pct = value == null ? 0 : Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.label}>{value == null ? '—' : `${pct}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  track: {
    height: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accentDeep,
    borderRadius: radii.sm,
  },
  label: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 13,
  },
});
