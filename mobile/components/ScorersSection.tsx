import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import type { EventScorersResponse, ScorerPlayer } from '@/types/api';
import {
  maxProbability,
  formatScorerPct,
  positionShort,
  scorerA11yLabel,
  scorerBarRatio,
} from '@/utils/scorers';

export const SCORERS_PENDING_TEXT =
  'Formazione non ancora ufficiale. I possibili marcatori compaiono circa un’ora prima del calcio d’inizio.';

type Props = {
  data: EventScorersResponse | undefined;
  isLoading: boolean;
  isError: boolean;
};

/** "Possibili marcatori": top 3 per team. Hidden on errors (and when there is nothing to say). */
export function ScorersSection({ data, isLoading, isError }: Props) {
  const styles = useThemedStyles(makeStyles);

  if (isLoading) return <ScorersSkeleton />;
  if (isError || !data) return null;

  return (
    <View style={styles.card} accessibilityLabel="Possibili marcatori">
      <Text style={styles.title} accessibilityRole="header">
        Possibili marcatori
      </Text>

      {!data.available || data.teams.length === 0 ? (
        <View style={styles.pending}>
          <Text style={styles.pendingText}>{SCORERS_PENDING_TEXT}</Text>
        </View>
      ) : (
        data.teams.map((team) => {
          const shown = team.top.slice(0, 3);
          const max = maxProbability(shown);
          return (
            <View key={team.team_id} style={styles.team}>
              <Text style={styles.teamName}>{team.team}</Text>
              {shown.map((player) => (
                <PlayerRow key={String(player.player_id)} player={player} max={max} />
              ))}
            </View>
          );
        })
      )}

      {data.note ? <Text style={styles.note}>{data.note}</Text> : null}
    </View>
  );
}

function PlayerRow({ player, max }: { player: ScorerPlayer; max: number }) {
  const styles = useThemedStyles(makeStyles);
  const ratio = scorerBarRatio(player.probability, max);
  return (
    <View style={styles.row} accessible accessibilityLabel={scorerA11yLabel(player)}>
      <View style={styles.rowTop}>
        <View style={styles.nameWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          {player.scored === true ? (
            <View style={styles.scored}>
              <Text style={styles.scoredText}>⚽ segnato</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.pct}>{formatScorerPct(player.probability)}</Text>
      </View>
      <View style={styles.rowBottom}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{positionShort(player.position)}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
        </View>
      </View>
    </View>
  );
}

function ScorersSkeleton() {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Caricamento possibili marcatori"
    >
      <Animated.View style={[styles.line, styles.lineTitle, animated]} />
      <Animated.View style={[styles.line, styles.lineWide, animated]} />
      <Animated.View style={[styles.line, styles.lineBar, animated]} />
      <Animated.View style={[styles.line, styles.lineWide, animated]} />
      <Animated.View style={[styles.line, styles.lineBar, animated]} />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.line,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    title: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(15),
      color: colors.ink,
    },
    pending: {
      backgroundColor: colors.track,
      borderRadius: radii.sm,
      padding: spacing.md,
    },
    pendingText: {
      fontFamily: fonts.body,
      fontSize: fs(13),
      lineHeight: fs(18),
      color: colors.inkMuted,
    },
    team: { gap: spacing.sm, marginTop: spacing.xs },
    teamName: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(13),
      color: colors.inkMuted,
    },
    row: {
      gap: 6,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    nameWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 0,
    },
    name: {
      flexShrink: 1,
      fontFamily: fonts.bodyBold,
      fontSize: fs(15),
      color: colors.ink,
    },
    scored: {
      backgroundColor: colors.accentSoft,
      borderRadius: radii.pill,
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    scoredText: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(11),
      color: colors.accentText,
    },
    pct: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(16),
      color: colors.accentText,
      fontVariant: ['tabular-nums'],
    },
    rowBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    pill: {
      backgroundColor: colors.track,
      borderRadius: radii.pill,
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    pillText: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(10),
      color: colors.inkMuted,
    },
    track: {
      flex: 1,
      height: 5,
      borderRadius: radii.sm,
      backgroundColor: colors.track,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radii.sm,
      backgroundColor: colors.accent,
    },
    note: {
      fontFamily: fonts.body,
      fontSize: fs(11),
      lineHeight: fs(15),
      color: colors.inkMuted,
      marginTop: spacing.xs,
    },
    line: { backgroundColor: colors.track, borderRadius: radii.sm },
    lineTitle: { height: 14, width: '45%' },
    lineWide: { height: 14, width: '70%' },
    lineBar: { height: 6, width: '100%' },
  });
