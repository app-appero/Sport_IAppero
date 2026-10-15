import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { OutcomeDot } from '@/components/OutcomeDot';
import { ProbabilityRing } from '@/components/ProbabilityRing';
import { useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { marketLabel } from '@/constants/markets';
import { fonts, spacing, type Palette, fs } from '@/constants/theme';
import type { UnifiedPrediction } from '@/types/api';
import { outcomeTone, type OutcomeTone } from '@/utils/outcome';
import { selectionLabel } from '@/utils/selectionLabel';

const ITEM_WIDTH = 84;
const FADE_WIDTH = 30;

type Props = {
  /** Every prediction of the match, strongest first. */
  picks: UnifiedPrediction[];
  /** Tone of the card, so the right-edge fade matches its background. */
  cardTone: OutcomeTone;
};

/**
 * All the markets of a match as circles on one horizontal row (strongest first):
 * "Mercati · N" + "scorri ›" above, a fade on the right edge while there is more, a thin
 * position bar below. With three markets or fewer there is nothing to scroll.
 */
export function MarketsStrip({ picks, cardTone }: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useSportPalette();
  const [viewW, setViewW] = useState(0);
  const [contentW, setContentW] = useState(0);
  const [x, setX] = useState(0);

  const scrollable = contentW > viewW + 1 && viewW > 0;
  const maxX = Math.max(0, contentW - viewW);
  const atEnd = x >= maxX - 2;
  const thumb = scrollable ? Math.max(0.18, viewW / contentW) : 1;
  const thumbLeft = scrollable && maxX > 0 ? (x / maxX) * (1 - thumb) : 0;
  const bg =
    cardTone === 'hit' ? colors.hitBg : cardTone === 'miss' ? colors.missBg : colors.surfaceElevated;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setX(e.nativeEvent.contentOffset.x);
  const onLayout = (e: LayoutChangeEvent) => setViewW(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.cap}>Mercati · {picks.length}</Text>
        {scrollable ? <Text style={styles.hint}>scorri ›</Text> : null}
      </View>

      <View style={styles.stripWrap} onLayout={onLayout}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          scrollEventThrottle={16}
          onScroll={onScroll}
          onContentSizeChange={(w) => setContentW(w)}
          contentContainerStyle={styles.row}
          accessibilityLabel={`Tutti i mercati, ${picks.length}`}
        >
          {picks.map((pred) => (
            <RingItem key={pred.id} pred={pred} />
          ))}
        </ScrollView>
        {scrollable && !atEnd ? (
          <LinearGradient
            pointerEvents="none"
            colors={[`${bg}00`, bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fade}
          />
        ) : null}
      </View>

      {scrollable ? (
        <View style={styles.indicator} pointerEvents="none">
          <View style={[styles.thumb, { width: `${thumb * 100}%`, left: `${thumbLeft * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

function RingItem({ pred }: { pred: UnifiedPrediction }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useSportPalette();
  const tone = outcomeTone(pred);
  const arc = tone === 'hit' ? colors.hit : tone === 'miss' ? colors.missBadge : colors.accent;
  return (
    <View style={styles.item}>
      <ProbabilityRing
        value={pred.prediction.confidence}
        color={arc}
        trackColor={colors.line}
        textColor={colors.ink}
      />
      <Text style={styles.market} numberOfLines={1}>
        {marketLabel(pred.prediction.type)}
      </Text>
      <View style={styles.pickRow}>
        <Text style={styles.pick} numberOfLines={1}>
          {selectionLabel(pred.prediction.selection.name)}
        </Text>
        <OutcomeDot tone={tone} size={8} />
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { gap: 8 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cap: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(10),
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.inkMuted,
    },
    hint: { fontFamily: fonts.body, fontSize: fs(10), color: colors.inkMuted },
    // The row bleeds into the card padding so the next circle visibly peeks in from the edge.
    stripWrap: { marginRight: -spacing.md },
    row: { gap: 4, paddingRight: spacing.md },
    fade: { position: 'absolute', top: 0, bottom: 0, right: 0, width: FADE_WIDTH },
    item: { width: ITEM_WIDTH, alignItems: 'center', gap: 5 },
    market: { fontFamily: fonts.body, fontSize: fs(10), color: colors.inkMuted, textAlign: 'center' },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
    pick: {
      flexShrink: 1,
      fontFamily: fonts.bodyBold,
      fontSize: fs(12),
      color: colors.ink,
      textAlign: 'center',
    },
    indicator: { height: 3, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
    thumb: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3, backgroundColor: colors.inkMuted },
  });
