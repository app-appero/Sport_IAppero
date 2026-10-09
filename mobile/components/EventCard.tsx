import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ConfidenceBar } from '@/components/ConfidenceBar';
import { marketLabel } from '@/constants/markets';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import type { FeedItem, UnifiedPrediction } from '@/types/api';
import { formatEventTime } from '@/utils/dates';
import { outcomeTone, pickBestPrediction, scoreForMarket } from '@/utils/outcome';

type Props = {
  item: FeedItem;
  index?: number;
  onPress: () => void;
  /** When filtering by a single market, prefer that prediction as hero. */
  preferredMarket?: string;
};

export function EventCard({ item, index = 0, onPress, preferredMarket }: Props) {
  const sportColor = item.sport === 'tennis' ? colors.tennis : colors.football;
  const best =
    (preferredMarket
      ? item.predictions.find((p) => p.prediction.type === preferredMarket)
      : null) ?? pickBestPrediction(item.predictions);

  if (!best) return null;

  const tone = outcomeTone(best);
  const scoreLine = scoreForMarket(item.event, best.prediction.type);
  const timeLabel = formatEventTime(item.event.start_time);
  const marketsCount = item.predictions.length;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          tone === 'hit' && styles.cardHit,
          tone === 'miss' && styles.cardMiss,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
      >
        <View style={styles.top}>
          <Text style={[styles.badge, { backgroundColor: sportColor }]}>
            {(item.event.competition?.name || item.sport).toUpperCase()}
          </Text>
          <View style={styles.topRight}>
            {tone ? (
              <View style={[styles.outcomeDot, tone === 'hit' ? styles.hit : styles.miss]}>
                <Text style={styles.outcomeText}>{tone === 'hit' ? 'Verde' : 'Rosso'}</Text>
              </View>
            ) : null}
            <Text style={styles.time}>{timeLabel}</Text>
          </View>
        </View>

        <Text style={styles.event}>{item.event.name}</Text>

        {scoreLine ? (
          <Text style={styles.score}>Risultato · {scoreLine}</Text>
        ) : (
          <Text style={styles.scoreMuted}>
            {item.event.status && item.event.status !== 'NS'
              ? `Stato · ${item.event.status}`
              : 'Pre-match'}
          </Text>
        )}

        <View style={styles.bestBlock}>
          <Text style={styles.pickLabel}>
            Miglior mercato · {marketLabel(best.prediction.type)}
          </Text>
          <Text style={styles.pick}>{best.prediction.selection.name}</Text>
          <ConfidenceBar value={best.prediction.confidence} />
        </View>

        <Text style={styles.more}>
          {marketsCount} {marketsCount === 1 ? 'mercato' : 'mercati'} · tocca per tutti
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Compact row for a single market inside event detail. */
export function MarketRow({
  item,
  onPress,
}: {
  item: UnifiedPrediction;
  onPress: () => void;
}) {
  const tone = outcomeTone(item);
  const scoreLine = scoreForMarket(item.event, item.prediction.type);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.marketRow,
        tone === 'hit' && styles.cardHit,
        tone === 'miss' && styles.cardMiss,
      ]}
    >
      <View style={styles.marketTop}>
        <Text style={styles.marketName}>{marketLabel(item.prediction.type)}</Text>
        {tone ? (
          <View style={[styles.outcomeDot, tone === 'hit' ? styles.hit : styles.miss]}>
            <Text style={styles.outcomeText}>{tone === 'hit' ? 'Verde' : 'Rosso'}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.marketPick}>{item.prediction.selection.name}</Text>
      {scoreLine ? <Text style={styles.score}>Score · {scoreLine}</Text> : null}
      <ConfidenceBar value={item.prediction.confidence} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    minHeight: 44,
  },
  cardHit: { borderColor: colors.hit, backgroundColor: colors.hitBg },
  cardMiss: { borderColor: colors.miss, backgroundColor: colors.missBg },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  topRight: { alignItems: 'flex-end', gap: 4 },
  badge: {
    color: colors.ink,
    overflow: 'hidden',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
    maxWidth: '60%',
  },
  time: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  outcomeDot: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hit: { backgroundColor: colors.hit },
  miss: { backgroundColor: colors.miss },
  outcomeText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  event: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.ink,
  },
  score: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  scoreMuted: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
  },
  bestBlock: { gap: 4, marginTop: 2 },
  pickLabel: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    fontSize: 12,
  },
  pick: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.accent,
    letterSpacing: 0.5,
    lineHeight: 30,
  },
  more: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  marketRow: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  marketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  marketPick: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.accent,
    lineHeight: 26,
  },
});
