import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { marketLabel } from '@/constants/markets';
import { colors, fonts, radii, spacing } from '@/constants/theme';
import type { DayStats, EventDayStat } from '@/utils/dayStats';

type Props = {
  stats: DayStats;
};

/** Daily hit summary — tap to expand per-event / per-market breakdown. */
export function DayStatsPanel({ stats }: Props) {
  const [open, setOpen] = useState(false);

  if (stats.events === 0) return null;

  const ratio =
    stats.settled > 0 ? `${stats.hits}/${stats.settled}` : `0/0`;
  const pct =
    stats.hitRate != null ? `${Math.round(stats.hitRate * 100)}%` : '—';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={styles.summary}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Statistica giornata: presi ${ratio}`}
      >
        <View style={styles.summaryLeft}>
          <Text style={styles.kicker}>Statistica giornata</Text>
          <Text style={styles.ratio}>
            Presi <Text style={styles.ratioAccent}>{ratio}</Text>
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.pct}>{pct}</Text>
          <Text style={styles.meta}>
            {stats.events} eventi
            {stats.pending > 0 ? ` · ${stats.pending} aperti` : ''}
          </Text>
          <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
        </View>
      </Pressable>

      {open ? (
        <ScrollView
          style={styles.detail}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {stats.byEvent.map((ev) => (
            <EventStatBlock key={ev.eventId} event={ev} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function EventStatBlock({ event }: { event: EventDayStat }) {
  const ratio =
    event.settled > 0 ? `${event.hits}/${event.settled}` : '—';
  return (
    <View style={styles.eventBlock}>
      <View style={styles.eventHead}>
        <View style={styles.eventTitles}>
          {event.competition ? (
            <Text style={styles.eventComp} numberOfLines={1}>
              {event.competition}
            </Text>
          ) : null}
          <Text style={styles.eventName} numberOfLines={2}>
            {event.eventName}
          </Text>
        </View>
        <Text style={styles.eventRatio}>{ratio}</Text>
      </View>
      <View style={styles.marketList}>
        {event.markets.map(({ prediction, tone }) => (
          <View key={prediction.id} style={styles.marketRow}>
            <Text style={styles.marketName} numberOfLines={1}>
              {marketLabel(prediction.prediction.type)}
            </Text>
            <Text style={styles.marketPick} numberOfLines={1}>
              {prediction.prediction.selection.name}
            </Text>
            <View
              style={[
                styles.badge,
                tone === 'hit' && styles.badgeHit,
                tone === 'miss' && styles.badgeMiss,
                !tone && styles.badgePending,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  tone === 'hit' && styles.badgeTextHit,
                  tone === 'miss' && styles.badgeTextMiss,
                ]}
              >
                {tone === 'hit' ? 'V' : tone === 'miss' ? 'X' : '·'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  summaryLeft: { flex: 1, gap: 2 },
  summaryRight: { alignItems: 'flex-end', gap: 2 },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ratio: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.ink,
  },
  ratioAccent: { color: colors.accent },
  pct: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.accent,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkMuted,
  },
  chevron: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  detail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingVertical: spacing.sm,
    maxHeight: 360,
  },
  eventBlock: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 8,
  },
  eventHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eventTitles: { flex: 1, gap: 2 },
  eventComp: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  eventName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  eventRatio: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.accent,
  },
  marketList: { gap: 6 },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marketName: {
    flex: 1.1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
  },
  marketPick: {
    flex: 1.2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
    textAlign: 'right',
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeHit: { backgroundColor: colors.hit },
  badgeMiss: { backgroundColor: colors.miss },
  badgePending: { backgroundColor: colors.line },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  badgeTextHit: { color: '#fff' },
  badgeTextMiss: { color: '#fff' },
});
