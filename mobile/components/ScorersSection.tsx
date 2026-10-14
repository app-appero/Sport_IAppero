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
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import type { EventScorersResponse, ScorerPlayer } from '@/types/api';
import {
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

export const CARDS_PENDING_TEXT =
  'Formazione non ancora ufficiale. I cartellini probabili compaiono circa un’ora prima del calcio d’inizio.';

export type SectionVariant = 'scorers' | 'cards';

const COPY: Record<SectionVariant, { title: string; label: string; pending: string; hit: string; note: string }> = {
  scorers: {
    title: 'Marcatori probabili',
    label: 'Marcatori probabili',
    pending: SCORERS_PENDING_TEXT,
    hit: ' · ha segnato',
    note: 'Ogni giocatore ha la sua probabilità di segnare almeno un gol: le percentuali non si sommano a 100%.',
  },
  cards: {
    title: 'Gialli probabili',
    label: 'Gialli probabili',
    pending: CARDS_PENDING_TEXT,
    hit: ' · ammonito',
    note: 'Ogni giocatore ha la sua probabilità di essere ammonito: le percentuali non si sommano a 100%.',
  },
};

const FALLBACK_NOTE =
  'Ogni giocatore ha la sua probabilità di segnare almeno un gol: le percentuali non si sommano a 100%.';
const PAGE = 8;

type Props = {
  data: EventScorersResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  variant?: SectionVariant;
};

/**
 * Event detail: state banner, Tutti / team switch, ranked list. Hidden on errors and
 * for competitions without the market.
 */
export function ScorersSection({ data, isLoading, isError, variant = 'scorers' }: Props) {
  const styles = useThemedStyles(makeStyles);
  const copy = COPY[variant];
  const [tab, setTab] = useState<'all' | number>('all');
  const [expanded, setExpanded] = useState(false);

  const ranked = useMemo<ScorerPlayer[]>(() => {
    if (!data) return [];
    const teams = tab === 'all' ? data.teams : data.teams.filter((_, i) => i === tab);
    return teams
      .flatMap((t) => (t.players.length ? t.players : t.top))
      .sort((a, b) => b.probability - a.probability);
  }, [data, tab]);

  if (isLoading) return <ScorersSkeleton />;
  if (isError || !data || isScorersUnsupported(data)) return null;

  const chip = lineupChip(data);
  if (!chip) return null;
  const waiting = chip.kind === 'waiting';
  const shown = expanded ? ranked : ranked.slice(0, PAGE);
  const hidden = ranked.length - shown.length;

  return (
    <View style={styles.wrap} accessibilityLabel={copy.label}>
      <Text style={styles.cap} accessibilityRole="header">
        {copy.title}
      </Text>

      <View style={[styles.banner, waiting && styles.bannerWait, chip.kind === 'estimate' && styles.bannerEst]}>
        <View style={[styles.dot, waiting && styles.dotWait, chip.kind === 'estimate' && styles.dotEst]} />
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, waiting && styles.bannerTitleWait, chip.kind === 'estimate' && styles.bannerTitleEst]}>
            {waiting
              ? 'Formazioni non ancora ufficiali'
              : chip.kind === 'estimate'
                ? 'Formazioni probabili (stima)'
                : 'Formazioni ufficiali'}
          </Text>
          {waiting ? <Text style={styles.bannerSub}>{copy.pending}</Text> : null}
        </View>
      </View>

      {waiting ? null : (
        <>
          {data.teams.length > 1 ? (
            <View style={styles.seg} accessibilityRole="tablist">
              <SegButton label="Tutti" active={tab === 'all'} onPress={() => setTab('all')} />
              {data.teams.slice(0, 2).map((team, i) => (
                <SegButton key={team.team_id} label={team.team} active={tab === i} onPress={() => setTab(i)} />
              ))}
            </View>
          ) : null}

          <View style={styles.list}>
            {shown.map((player, i) => (
              <PlayerRow key={String(player.player_id)} player={player} rank={i + 1} estimate={chip.kind === 'estimate'} variant={variant} />
            ))}
          </View>

          {hidden > 0 ? (
            <Pressable onPress={() => setExpanded(true)} style={styles.showAll} accessibilityRole="button">
              <Text style={styles.showAllText}>Mostra altri {hidden}</Text>
            </Pressable>
          ) : null}

          <Text style={styles.note}>{data.note || copy.note}</Text>
        </>
      )}
    </View>
  );
}

function SegButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segBtn, active && styles.segBtnOn]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.segText, active && styles.segTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function PlayerRow({
  player,
  rank,
  estimate,
  variant,
}: {
  player: ScorerPlayer;
  rank: number;
  estimate: boolean;
  variant: SectionVariant;
}) {
  const styles = useThemedStyles(makeStyles);
  const scored = variant === 'cards' ? player.booked === true : player.scored === true;
  const ratio = scorerBarRatio(player.probability, 1);
  return (
    <View style={styles.row} accessible accessibilityLabel={scorerA11yLabel(player, variant)}>
      <Text style={styles.rank}>{rank}</Text>
      <View style={[styles.avatar, scored && styles.avatarScored]}>
        <Text style={[styles.avatarText, scored && styles.avatarTextScored]}>{initials(player.name)}</Text>
      </View>
      <View style={styles.mid}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{positionShort(player.position)}</Text>
          </View>
        </View>
        <Text style={styles.team} numberOfLines={1}>
          {player.team}
          {scored ? COPY[variant].hit : ''}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, estimate && styles.fillEst, { width: `${Math.round(ratio * 100)}%` }]} />
        </View>
      </View>
      <Text style={[styles.pct, rank === 1 && styles.pctTop]}>{formatScorerPct(player.probability)}</Text>
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
      style={styles.wrap}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Caricamento possibili marcatori"
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
    segText: { fontFamily: fonts.bodyMedium, fontSize: fs(13), color: colors.inkMuted },
    segTextOn: { fontFamily: fonts.bodyBold, color: colors.onAccent },

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
    track: { height: 4, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: colors.accent },
    fillEst: { backgroundColor: colors.warning },
    pct: { fontFamily: fonts.bodyBold, fontSize: fs(16), color: colors.ink, fontVariant: ['tabular-nums'] },
    pctTop: { color: colors.accentText },

    showAll: {
      alignSelf: 'center',
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    showAllText: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.accentText },
    note: { fontFamily: fonts.body, fontSize: fs(11), lineHeight: fs(15), color: colors.inkMuted },

    line: { backgroundColor: colors.track, borderRadius: radii.sm },
    lineTitle: { height: 12, width: '40%' },
    lineBanner: { height: 44, width: '100%' },
    lineList: { height: 180, width: '100%' },
  });
