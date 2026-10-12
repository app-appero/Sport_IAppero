import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ConfidenceBar } from '@/components/ConfidenceBar';
import { marketLabel, predictionMatchesMarket } from '@/constants/markets';
import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette } from '@/constants/theme';
import type { FeedItem, UnifiedPrediction } from '@/types/api';
import { formatEventTime } from '@/utils/dates';
import { eventStatusLabel } from '@/utils/eventStatus';
import { outcomeTone, pickBestPrediction, scoreForMarket } from '@/utils/outcome';
import { selectionLabel } from '@/utils/selectionLabel';

type Props = {
  item: FeedItem;
  index?: number;
  onPress?: () => void;
  /** When filtering by a single market, prefer that prediction as hero. */
  preferredMarket?: string;
  /** Selected calendar day (YYYY-MM-DD) for past-day status heuristics. */
  selectedDate?: string | null;
};

export function EventCard({
  item,
  index = 0,
  onPress,
  preferredMarket,
  selectedDate,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const preferred =
    preferredMarket
      ? item.predictions.filter((p) => predictionMatchesMarket(p.prediction.type, preferredMarket))
      : [];
  const best =
    (preferred.length ? pickBestPrediction(preferred) : null) ??
    pickBestPrediction(item.predictions);

  if (!best) return null;

  const tone = outcomeTone(best);
  const scoreLine = scoreForMarket(item.event, best.prediction.type);
  const timeLabel = formatEventTime(item.event.start_time);
  const marketsCount = new Set(item.predictions.map((p) => p.prediction.type)).size;
  const cardStyle = [
    styles.card,
    tone === 'hit' && styles.cardHit,
    tone === 'miss' && styles.cardMiss,
  ];

  const body = (
    <>
      <View style={styles.top}>
        <Text style={styles.badge}>
          {(item.event.competition?.name || item.sport).toUpperCase()}
        </Text>
        <View style={styles.topRight}>
          {tone ? (
            <View
              style={[styles.outcomeDot, tone === 'hit' ? styles.hit : styles.miss]}
              accessibilityLabel={tone === 'hit' ? 'Esito positivo' : 'Esito negativo'}
            >
              <Text style={styles.outcomeText}>{tone === 'hit' ? 'V' : 'X'}</Text>
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
          {(() => {
            const label = eventStatusLabel(item.event, { selectedDate });
            if (!label || label === 'Pre-match') return 'Pre-match';
            return `Stato · ${label}`;
          })()}
        </Text>
      )}

      <View style={styles.bestBlock}>
        <Text style={styles.pickLabel}>
          Miglior mercato · {marketLabel(best.prediction.type)}
        </Text>
        <Text style={styles.pick}>{selectionLabel(best.prediction.selection.name)}</Text>
        <ConfidenceBar value={best.prediction.confidence} />
      </View>

      <Text style={styles.more}>
        {marketsCount} {marketsCount === 1 ? 'mercato' : 'mercati'}
        {onPress ? ' · tocca per tutti' : ''}
      </Text>
    </>
  );

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          {body}
        </Pressable>
      ) : (
        <View style={cardStyle}>{body}</View>
      )}
    </Animated.View>
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
        {tone ? (
          <View
            style={[styles.outcomeDot, tone === 'hit' ? styles.hit : styles.miss]}
            accessibilityLabel={tone === 'hit' ? 'Esito positivo' : 'Esito negativo'}
          >
            <Text style={styles.outcomeText}>{tone === 'hit' ? 'V' : 'X'}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.marketPick}>{selectionLabel(item.prediction.selection.name)}</Text>
      {scoreLine ? <Text style={styles.score}>Risultato · {scoreLine}</Text> : null}
      <ConfidenceBar value={item.prediction.confidence} />
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
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
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  topRight: { alignItems: 'flex-end', gap: 4 },
  badge: {
    color: colors.onAccent,
    backgroundColor: colors.accent,
    alignSelf: 'flex-start',
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
    minWidth: 22,
    minHeight: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hit: { backgroundColor: colors.hitBadge },
  miss: { backgroundColor: colors.missBadge },
  outcomeText: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 16,
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
    color: colors.accentText,
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
    color: colors.accentText,
    lineHeight: 26,
  },
});
