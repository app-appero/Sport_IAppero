import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { marketLabel } from '@/constants/markets';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import type { UnifiedPrediction } from '@/types/api';
import { outcomeTone, scoreForMarket } from '@/utils/outcome';
import { selectionLabel } from '@/utils/selectionLabel';

type Props = {
  item: UnifiedPrediction;
  /** Optional date for prediction detail deep-link. */
  date?: string;
};

/** Market card: all outcomes + Consigliata badge; tap opens EV/detail page. */
export function MarketBoard({ item, date }: Props) {
  const router = useRouter();
  const colors = useSportPalette();
  const styles = useThemedStyles(makeStyles);
  const tone = outcomeTone(item);
  const scoreLine = scoreForMarket(item.event, item.prediction.type);
  const recommendedKey = (item.prediction.selection.id || '').toLowerCase();
  const outcomes =
    item.probabilities.length > 0
      ? item.probabilities
      : [
          {
            key: item.prediction.selection.id || 'sel',
            label: item.prediction.selection.name,
            value: item.prediction.confidence ?? 0,
          },
        ];

  const openDetail = () => {
    router.push({
      pathname: '/prediction/[id]',
      params: {
        id: item.id,
        sport: String(item.sport),
        ...(date ? { date } : {}),
      },
    });
  };

  return (
    <Pressable
      onPress={openDetail}
      style={({ pressed }) => [
        styles.card,
        tone === 'hit' && styles.cardHit,
        tone === 'miss' && styles.cardMiss,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${marketLabel(item.prediction.type)}, apri dettaglio`}
    >
      <View style={styles.top}>
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

      {scoreLine ? <Text style={styles.score}>Risultato · {scoreLine}</Text> : null}

      <View style={styles.outcomes}>
        {outcomes.map((prob) => {
          const isRecommended =
            (prob.key || '').toLowerCase() === recommendedKey ||
            selectionLabel(prob.label).toLowerCase() ===
              selectionLabel(item.prediction.selection.name).toLowerCase();
          const pct = Math.round(Math.max(0, Math.min(1, prob.value)) * 100);
          return (
            <View
              key={`${prob.key}-${prob.label}`}
              style={[styles.outcomeRow, isRecommended && styles.outcomeRecommended]}
            >
              <View style={styles.outcomeLeft}>
                <Text
                  style={[styles.outcomeLabel, isRecommended && styles.outcomeLabelHot]}
                  numberOfLines={1}
                >
                  {selectionLabel(prob.label)}
                </Text>
                {isRecommended ? (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.badgeText}>Consigliata</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.outcomePct, isRecommended && styles.outcomeLabelHot]}>
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.hint}>Tocca per quote, EV e dettaglio</Text>
    </Pressable>
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
    },
    cardHit: { borderColor: colors.hit, backgroundColor: colors.hitBg },
    cardMiss: { borderColor: colors.miss, backgroundColor: colors.missBg },
    pressed: { opacity: 0.9 },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    marketName: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(15),
      color: colors.ink,
      flex: 1,
    },
    outcomeDot: {
      width: 24,
      height: 24,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hit: { backgroundColor: colors.hit },
    miss: { backgroundColor: colors.miss },
    outcomeText: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(12),
      color: '#fff',
    },
    score: {
      fontFamily: fonts.body,
      fontSize: fs(13),
      color: colors.inkMuted,
    },
    outcomes: { gap: 6 },
    outcomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radii.sm,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
    },
    outcomeRecommended: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceElevated,
    },
    outcomeLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    outcomeLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(14),
      color: colors.ink,
    },
    outcomeLabelHot: { color: colors.accentDeep },
    outcomePct: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(15),
      color: colors.ink,
      minWidth: 44,
      textAlign: 'right',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    badgeText: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(10),
      color: colors.onAccent,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: fs(11),
      color: colors.inkMuted,
      marginTop: 2,
    },
    hintMuted: {
      fontFamily: fonts.body,
      fontSize: fs(11),
      color: colors.warning,
      marginTop: 2,
    },
  });
