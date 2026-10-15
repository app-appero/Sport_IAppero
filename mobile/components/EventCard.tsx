import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CardPlayers } from '@/components/CardPlayers';
import { LiveBoard } from '@/components/LiveBoard';
import { MarketsStrip } from '@/components/MarketsStrip';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { OutcomeDot } from '@/components/OutcomeDot';
import { useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { marketLabel } from '@/constants/markets';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import type { FeedItem, UnifiedPrediction } from '@/types/api';
import { topMarkets, marketFamily } from '@/utils/cardMarkets';
import { formatEventTime } from '@/utils/dates';
import { eventStatusLabel } from '@/utils/eventStatus';
import { formatSets, isLiveEvent, liveBoard, liveMinuteLabel } from '@/utils/liveScore';
import { outcomeTone, scoreForMarket, type OutcomeTone } from '@/utils/outcome';
import { selectionLabel } from '@/utils/selectionLabel';
import { resolveTennisWinner, setPills } from '@/utils/tennisCard';

type Props = {
  item: FeedItem;
  index?: number;
  onPress?: () => void;
  /** When filtering by a single market, prefer that prediction as the first circle. */
  preferredMarket?: string;
  /** Selected calendar day (YYYY-MM-DD) for past-day status heuristics. */
  selectedDate?: string | null;
};

/** Football: three circles + likely scorers. Tennis: winner split + three circles. */
export function EventCard(props: Props) {
  return props.item.sport === 'tennis' ? <TennisCard {...props} /> : <FootballCard {...props} />;
}

function FootballCard({ item, index = 0, onPress, preferredMarket, selectedDate }: Props) {
  const styles = useThemedStyles(makeStyles);
  // Every market of the match, strongest first, scrolling on one row.
  const picks = topMarkets(item.predictions, { preferredMarket, limit: 99, byFamily: false });
  if (picks.length === 0) return null;

  const tone = outcomeTone(picks[0]);
  const score = item.event.score;
  const scoreText =
    score?.home != null && score?.away != null ? `${score.home} – ${score.away}` : null;
  const live = isLiveEvent(item.event);
  const statusText = scoreText || live ? null : cardStatusText(item, selectedDate);

  return (
    <CardShell item={item} index={index} onPress={onPress} tone={tone}>
      <CardTop item={item} tone={tone} live={live} />
      <View style={styles.nameRow}>
        <Text style={styles.name}>{item.event.name}</Text>
        {scoreText ? <Text style={styles.score}>{scoreText}</Text> : null}
      </View>
      {statusText ? <Text style={styles.muted}>{statusText}</Text> : null}
      <MarketsStrip picks={picks} cardTone={tone} />
      {/* Without the players block (competition without the market) keep the tap hint. */}
      <CardPlayers eventId={item.event.id} fallback={<MoreLine item={item} onPress={onPress} />} />
    </CardShell>
  );
}

function TennisCard({ item, index = 0, onPress, preferredMarket, selectedDate }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useSportPalette();
  const winnerPred = item.predictions.find(
    (p) => p.prediction.type === 'match_winner' || p.prediction.type === 'h2h',
  );
  const winner = winnerPred ? resolveTennisWinner(winnerPred, item.event.participants) : null;
  const picks = topMarkets(item.predictions, {
    preferredMarket,
    limit: 99,
    byFamily: false,
    exclude: winner && winnerPred ? [marketFamily(winnerPred.prediction.type)] : [],
  });
  if (!winner && picks.length === 0) return null;

  const tone = winner && winnerPred ? outcomeTone(winnerPred) : outcomeTone(picks[0]);
  const live = isLiveEvent(item.event);
  const board = live ? liveBoard(item.event) : null;
  const finishedSets = !live
    ? setPills(formatSets(item.event.live?.sets) || item.event.score?.display || '')
    : [];
  const statusText = live || finishedSets.length ? null : cardStatusText(item, selectedDate);

  return (
    <CardShell item={item} index={index} onPress={onPress} tone={tone}>
      <CardTop item={item} tone={tone} live={live} />
      {winner ? (
        <View style={styles.winner}>
          <View style={styles.winnerRow}>
            <View style={styles.winnerName}>
              <Text style={styles.player} numberOfLines={1}>
                {winner.names[0]}
              </Text>
              <OutcomeDot tone={tone} size={9} />
            </View>
            <Text style={[styles.winnerPct, { color: colors.accentText }]}>
              {Math.round(winner.probs[0] * 100)}%
            </Text>
          </View>
          <View style={styles.split}>
            <View style={[styles.splitFill, { flex: winner.probs[0] }]} />
            <View style={[styles.splitRest, { flex: Math.max(winner.probs[1], 0.0001) }]} />
          </View>
          <View style={styles.winnerRow}>
            <Text style={[styles.player, styles.playerDim]} numberOfLines={1}>
              {winner.names[1]}
            </Text>
            <Text style={[styles.winnerPct, styles.winnerPctDim]}>
              {Math.round(winner.probs[1] * 100)}%
            </Text>
          </View>
          <Text style={styles.cap}>Vincitore</Text>
        </View>
      ) : (
        <Text style={styles.name}>{item.event.name}</Text>
      )}

      {board ? (
        <LiveBoard board={board} />
      ) : live ? (
        <Text style={styles.muted}>In corso</Text>
      ) : finishedSets.length ? (
        <View style={styles.sets}>
          <Text style={styles.cap}>Set</Text>
          {finishedSets.map((s, i) => (
            <View key={`${s}-${i}`} style={styles.setPill}>
              <Text style={styles.setText}>{s}</Text>
            </View>
          ))}
        </View>
      ) : statusText ? (
        <Text style={styles.muted}>{statusText}</Text>
      ) : null}

      {picks.length ? <MarketsStrip picks={picks} cardTone={tone} /> : null}
      <MoreLine item={item} onPress={onPress} />
    </CardShell>
  );
}

function cardStatusText(item: FeedItem, selectedDate?: string | null): string {
  const label = eventStatusLabel(item.event, { selectedDate });
  if (!label || label === 'Pre-match') return 'Pre-match';
  return `Stato · ${label}`;
}

function CardShell({
  item,
  index,
  onPress,
  tone,
  children,
}: {
  item: FeedItem;
  index: number;
  onPress?: () => void;
  tone: OutcomeTone;
  children: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  const cardStyle = [
    styles.card,
    tone === 'hit' && styles.cardHit,
    tone === 'miss' && styles.cardMiss,
  ];
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={item.event.name}
        >
          {children}
        </Pressable>
      ) : (
        <View style={cardStyle}>{children}</View>
      )}
    </Animated.View>
  );
}

function CardTop({ item, tone, live }: { item: FeedItem; tone: OutcomeTone; live: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const minute = live ? liveMinuteLabel(item.event) : null;
  const timeLabel = formatEventTime(item.event.start_time, item.event.local_time);
  return (
    <View style={styles.top}>
      <Text style={styles.badge} numberOfLines={1}>
        {(item.event.competition?.name || item.sport).toUpperCase()}
      </Text>
      <View style={styles.topRight}>
        {live ? (
          <View style={styles.liveBadge} accessibilityLabel="Partita in corso">
            <Text style={styles.liveBadgeText}>{minute ? `● LIVE ${minute}` : '● LIVE'}</Text>
          </View>
        ) : null}
        <OutcomeDot tone={tone} size={10} />
        <Text style={styles.time}>{timeLabel}</Text>
      </View>
    </View>
  );
}

function MoreLine({ item, onPress }: { item: FeedItem; onPress?: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const count = new Set(item.predictions.map((p) => p.prediction.type)).size;
  return (
    <Text style={styles.more}>
      {count} {count === 1 ? 'mercato' : 'mercati'}
      {onPress ? ' · tocca per tutti' : ''}
    </Text>
  );
}

/** Compact row for a single market inside event detail (not tappable). */
export function MarketRow({ item }: { item: UnifiedPrediction }) {
  const styles = useThemedStyles(makeStyles);
  const tone = outcomeTone(item);
  const scoreLine = scoreForMarket(item.event, item.prediction.type);
  return (
    <View
      style={[
        styles.marketRow,
        tone === 'hit' && styles.cardHit,
        tone === 'miss' && styles.cardMiss,
      ]}
    >
      <View style={styles.marketTop}>
        <Text style={styles.marketName}>{marketLabel(item.prediction.type)}</Text>
        <OutcomeDot tone={tone} size={10} />
      </View>
      <Text style={styles.marketPick}>{selectionLabel(item.prediction.selection.name)}</Text>
      {scoreLine ? <Text style={styles.liveLine}>Risultato · {scoreLine}</Text> : null}
      <ConfidenceBar value={item.prediction.confidence} />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.line,
      gap: spacing.sm,
      minHeight: 44,
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    },
    cardHit: { borderColor: colors.hit, backgroundColor: colors.hitBg },
    cardMiss: { borderColor: colors.miss, backgroundColor: colors.missBg },
    pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: {
      color: colors.onAccent,
      backgroundColor: colors.accent,
      overflow: 'hidden',
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      fontFamily: fonts.bodyBold,
      fontSize: fs(10),
      letterSpacing: 0.4,
      flexShrink: 1,
    },
    time: { fontFamily: fonts.body, fontSize: fs(12), color: colors.inkMuted },
    liveBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
    },
    liveBadgeText: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(11),
      letterSpacing: 0.6,
      color: colors.onAccent,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    name: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: fs(17), color: colors.ink },
    score: { fontFamily: fonts.display, fontSize: fs(28), color: colors.ink, letterSpacing: 0.5 },
    muted: { fontFamily: fonts.body, fontSize: fs(13), color: colors.inkMuted },
    liveLine: { fontFamily: fonts.bodyMedium, fontSize: fs(14), color: colors.ink },


    winner: { gap: 6 },
    winnerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
    winnerName: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
    player: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: fs(16), color: colors.ink },
    playerDim: { fontFamily: fonts.bodyMedium, color: colors.inkMuted },
    winnerPct: { fontFamily: fonts.display, fontSize: fs(30), letterSpacing: 0.5 },
    winnerPctDim: { color: colors.inkMuted },
    split: { flexDirection: 'row', height: 6, borderRadius: 6, overflow: 'hidden', gap: 2 },
    splitFill: { backgroundColor: colors.accent, borderRadius: 6 },
    splitRest: { backgroundColor: colors.line, borderRadius: 6 },
    cap: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(10),
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.inkMuted,
    },
    sets: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    setPill: {
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.track,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    setText: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.ink },

    more: { fontFamily: fonts.bodyMedium, fontSize: fs(12), color: colors.inkMuted, marginTop: 2 },
    marketRow: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.line,
      gap: 6,
    },
    marketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    marketName: { fontFamily: fonts.bodyBold, fontSize: fs(14), color: colors.ink },
    marketPick: {
      fontFamily: fonts.display,
      fontSize: fs(24),
      color: colors.accentText,
      lineHeight: fs(26),
    },
  });
