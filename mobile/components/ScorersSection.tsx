import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, yellowCard, type Palette, fs } from '@/constants/theme';
import type {
  BookingPlayer,
  EventBookingsResponse,
  EventScorersResponse,
  ScorerPlayer,
} from '@/types/api';
import {
  bookingA11yLabel,
  initials,
  isScorersUnsupported,
  lineupChip,
  formatScorerPct,
  positionShort,
  scorerA11yLabel,
  scorerBarRatio,
} from '@/utils/scorers';

export const SCORERS_PENDING_TEXT =
  'Formazione non ancora ufficiale. I possibili marcatori compaiono circa un’ora prima del calcio d’inizio.';

const SCORERS_NOTE =
  'Ogni giocatore ha la sua probabilità di segnare almeno un gol: le percentuali non si sommano a 100%.';
const BOOKINGS_NOTE =
  'Probabilità di ricevere almeno un cartellino giallo. Ogni giocatore ha la sua: le percentuali non si sommano a 100%.';
const PAGE = 8;

type Variant = 'scorers' | 'bookings';
type AnyPlayer = ScorerPlayer | BookingPlayer;

type Props = {
  data: EventScorersResponse | EventBookingsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  /** `bookings` = probable yellow cards: yellow accents, yellow row once booked. */
  variant?: Variant;
};

function isDone(p: AnyPlayer): boolean {
  return ('scored' in p ? p.scored : p.booked) === true;
}

/**
 * Event detail list: state banner, Tutti / team switch, ranked players. Used for the
 * probable scorers and, with `variant="bookings"`, for the probable yellow cards.
 * Hidden on errors and for competitions without the market.
 */
export function ScorersSection({ data, isLoading, isError, variant = 'scorers' }: Props) {
  const styles = useThemedStyles(makeStyles);
  const yellow = variant === 'bookings';
  const [tab, setTab] = useState<'all' | number>('all');
  const [expanded, setExpanded] = useState(false);

  const ranked = useMemo<AnyPlayer[]>(() => {
    if (!data) return [];
    const teams = tab === 'all' ? data.teams : data.teams.filter((_, i) => i === tab);
    return (teams as { players: AnyPlayer[]; top: AnyPlayer[] }[])
      .flatMap((t) => (t.players.length ? t.players : t.top))
      .sort((a, b) => b.probability - a.probability);
  }, [data, tab]);

  if (isLoading) return <ListSkeleton />;
  if (isError || !data || isScorersUnsupported(data)) return null;

  const chip = lineupChip(data);
  if (!chip) return null;
  const waiting = chip.kind === 'waiting';
  const shown = expanded ? ranked : ranked.slice(0, PAGE);
  const hidden = ranked.length - shown.length;
  const noteText = data.note && !yellow ? data.note : yellow ? BOOKINGS_NOTE : SCORERS_NOTE;

  return (
    <View style={styles.wrap} accessibilityLabel={yellow ? 'Gialli probabili' : 'Marcatori probabili'}>
      <SectionTitle yellow={yellow} />

      {waiting ? (
        <Banner tone="wait" title="Formazioni non ancora ufficiali" sub={yellow ? undefined : SCORERS_PENDING_TEXT} />
      ) : !yellow ? (
        <Banner
          tone={chip.kind === 'estimate' ? 'est' : 'ok'}
          title={chip.kind === 'estimate' ? 'Formazioni probabili (stima)' : 'Formazioni ufficiali'}
        />
      ) : null}

      {waiting ? null : (
        <>
          {data.teams.length > 1 ? (
            <View style={styles.seg} accessibilityRole="tablist">
              <SegButton label="Tutti" active={tab === 'all'} yellow={yellow} onPress={() => setTab('all')} />
              {data.teams.slice(0, 2).map((team, i) => (
                <SegButton
                  key={team.team_id}
                  label={team.team}
                  active={tab === i}
                  yellow={yellow}
                  onPress={() => setTab(i)}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.list}>
            {shown.map((player, i) => (
              <PlayerRow
                key={String(player.player_id)}
                player={player}
                rank={i + 1}
                variant={variant}
                estimate={chip.kind === 'estimate'}
              />
            ))}
          </View>

          {hidden > 0 ? (
            <Pressable onPress={() => setExpanded(true)} style={styles.showAll} accessibilityRole="button">
              <Text style={[styles.showAllText, yellow && styles.showAllYellow]}>Mostra altri {hidden}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.note}>{noteText}</Text>
        </>
      )}
    </View>
  );
}

function SectionTitle({ yellow }: { yellow: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.titleRow}>
      <Text style={styles.cap} accessibilityRole="header">
        {yellow ? 'Gialli probabili' : 'Marcatori probabili'}
      </Text>
    </View>
  );
}

function Banner({
  tone,
  title,
  sub,
}: {
  tone: 'ok' | 'est' | 'wait';
  title: string;
  sub?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.banner,
        tone === 'wait' && styles.bannerWait,
        tone === 'est' && styles.bannerEst,
      ]}
    >
      <View
        style={[
          styles.dot,
          tone === 'wait' && styles.dotWait,
          tone === 'est' && styles.dotEst,
        ]}
      />
      <View style={styles.bannerText}>
        <Text
          style={[
            styles.bannerTitle,
            tone === 'wait' && styles.bannerTitleWait,
            tone === 'est' && styles.bannerTitleEst,
          ]}
        >
          {title}
        </Text>
        {sub ? <Text style={styles.bannerSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function SegButton({
  label,
  active,
  yellow,
  onPress,
}: {
  label: string;
  active: boolean;
  yellow: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segBtn, active && (yellow ? styles.segBtnOnYellow : styles.segBtnOn)]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.segText, active && (yellow ? styles.segTextOnYellow : styles.segTextOn)]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function PlayerRow({
  player,
  rank,
  variant,
  estimate,
}: {
  player: AnyPlayer;
  rank: number;
  variant: Variant;
  estimate: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const yellow = variant === 'bookings';
  const done = isDone(player);
  const ratio = scorerBarRatio(player.probability, 1);
  const label = yellow ? bookingA11yLabel(player as BookingPlayer) : scorerA11yLabel(player as ScorerPlayer);
  return (
    <View
      style={[styles.row, done && (yellow ? styles.rowYellow : styles.rowScored)]}
      accessible
      accessibilityLabel={label}
    >
      <Text style={styles.rank}>{rank}</Text>
      {yellow ? (
        <View style={styles.cardWrap}>
          <View style={styles.card} />
        </View>
      ) : (
        <View style={[styles.avatar, done && styles.avatarScored]}>
          <Text style={[styles.avatarText, done && styles.avatarTextScored]}>{initials(player.name)}</Text>
        </View>
      )}
      <View style={styles.mid}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{positionShort(player.position)}</Text>
          </View>
        </View>
        <Text style={[styles.team, done && (yellow ? styles.teamYellow : styles.teamScored)]} numberOfLines={1}>
          {player.team}
          {done ? (yellow ? ' · ammonito' : ' · ha segnato') : ''}
        </Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              yellow && styles.fillYellow,
              estimate && !yellow && styles.fillEst,
              { width: `${Math.round(ratio * 100)}%` },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.pct, yellow && styles.pctYellow, rank === 1 && !yellow && styles.pctTop]}>
        {formatScorerPct(player.probability)}
      </Text>
    </View>
  );
}

function ListSkeleton() {
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
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Caricamento giocatori"
    >
      <Animated.View style={[styles.line, styles.lineTitle, animated]} />
      <Animated.View style={[styles.line, styles.lineBanner, animated]} />
      <Animated.View style={[styles.line, styles.lineList, animated]} />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { gap: spacing.sm, marginTop: spacing.sm },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cap: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(11),
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.inkMuted,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    bannerWait: { borderColor: colors.line, backgroundColor: colors.track },
    bannerEst: { borderColor: colors.warning, backgroundColor: 'rgba(230,184,77,0.10)' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    dotWait: { backgroundColor: colors.inkMuted },
    dotEst: { backgroundColor: colors.warning },
    bannerText: { flex: 1, gap: 2 },
    bannerTitle: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.accentText },
    bannerTitleWait: { color: colors.ink },
    bannerTitleEst: { color: colors.warning },
    bannerSub: { fontFamily: fonts.body, fontSize: fs(12), lineHeight: fs(17), color: colors.inkMuted },

    seg: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radii.pill,
      padding: 3,
      gap: 2,
    },
    segBtn: {
      flex: 1,
      minHeight: 34,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    segBtnOn: { backgroundColor: colors.accent },
    segBtnOnYellow: { backgroundColor: yellowCard.fill },
    segText: { fontFamily: fonts.bodyMedium, fontSize: fs(13), color: colors.inkMuted },
    segTextOn: { fontFamily: fonts.bodyBold, color: colors.onAccent },
    segTextOnYellow: { fontFamily: fonts.bodyBold, color: yellowCard.onFill },

    list: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    rowYellow: { backgroundColor: yellowCard.bg },
    rowScored: { backgroundColor: colors.accentSoft },
    rank: { width: 16, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: fs(12), color: colors.inkMuted },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.track,
      borderWidth: 1,
      borderColor: colors.line,
    },
    avatarScored: { backgroundColor: colors.hitBadge, borderColor: colors.hitBadge },
    avatarText: { fontFamily: fonts.bodyBold, fontSize: fs(11), color: colors.ink },
    avatarTextScored: { color: '#fff' },
    cardWrap: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    card: {
      width: 15,
      height: 20,
      borderRadius: 3,
      backgroundColor: yellowCard.fill,
      transform: [{ rotate: '8deg' }],
    },
    mid: { flex: 1, minWidth: 0, gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: fs(14), color: colors.ink },
    tag: {
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    tagText: { fontFamily: fonts.bodyBold, fontSize: fs(9), letterSpacing: 0.5, color: colors.inkMuted },
    team: { fontFamily: fonts.body, fontSize: fs(11), color: colors.inkMuted },
    teamYellow: { color: yellowCard.fill },
    teamScored: { color: colors.accent },
    track: { height: 4, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
    fillYellow: { backgroundColor: yellowCard.fill },
    fillEst: { backgroundColor: colors.warning },
    pct: { fontFamily: fonts.bodyBold, fontSize: fs(16), color: colors.ink, fontVariant: ['tabular-nums'] },
    pctTop: { color: colors.accentText },
    pctYellow: { color: yellowCard.fill },

    showAll: {
      alignSelf: 'center',
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    showAllText: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.accentText },
    showAllYellow: { color: yellowCard.fill },
    note: { fontFamily: fonts.body, fontSize: fs(11), lineHeight: fs(15), color: colors.inkMuted },

    line: { backgroundColor: colors.track, borderRadius: radii.sm },
    lineTitle: { height: 12, width: '40%' },
    lineBanner: { height: 44, width: '100%' },
    lineList: { height: 180, width: '100%' },
  });
