import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import type { LiveBoardData } from '@/utils/liveScore';

/**
 * Tennis live scoreboard inside the match card: a row per player with games per set
 * (the set in play highlighted), the current game and a dot on the server.
 * Fed by `Event.live`; see `liveBoard()` in utils/liveScore.ts.
 */
export function LiveBoard({ board }: { board: LiveBoardData }) {
  const styles = useThemedStyles(makeStyles);
  const hasPoint = board.rows.some((r) => r.point != null);
  return (
    <View style={styles.wrap} accessibilityLabel="Punteggio in diretta">
      {board.rows.map((row) => (
        <View key={row.name} style={styles.row}>
          <View style={styles.serve}>{row.serving ? <View style={styles.serveDot} accessibilityLabel="Al servizio" /> : null}</View>
          <Text style={styles.name} numberOfLines={1}>
            {row.name}
          </Text>
          <View style={styles.sets}>
            {row.games.map((g, i) => (
              <Text key={i} style={[styles.set, i === board.currentSet && styles.setNow]}>
                {g}
              </Text>
            ))}
          </View>
          {hasPoint ? <Text style={styles.point}>{row.point ?? ''}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      gap: 6,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.track,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    serve: { width: 10, alignItems: 'center' },
    serveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    name: { flex: 1, minWidth: 0, fontFamily: fonts.bodyBold, fontSize: fs(14), color: colors.ink },
    sets: { flexDirection: 'row', gap: 4 },
    set: {
      minWidth: 22,
      textAlign: 'center',
      fontFamily: fonts.bodyMedium,
      fontSize: fs(15),
      color: colors.inkMuted,
      fontVariant: ['tabular-nums'],
    },
    setNow: { fontFamily: fonts.bodyBold, color: colors.ink },
    point: {
      minWidth: 30,
      textAlign: 'center',
      fontFamily: fonts.bodyBold,
      fontSize: fs(15),
      color: colors.accentText,
      paddingLeft: 6,
      fontVariant: ['tabular-nums'],
    },
  });
