import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { marketLabel } from '@/constants/markets';
import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import type { DayStats, EventDayStat, MarketTypeStat } from '@/utils/dayStats';
import { selectionLabel } from '@/utils/selectionLabel';

type Props = {
  stats: DayStats;
  /** Sport whose history the link opens. */
  sport?: string;
};

/** Daily hit summary — tap to expand market aggregates + per-event accordions. */
export function DayStatsPanel({ stats, sport }: Props) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  // Leave room for the pinned history button and the filter bar under the panel.
  const detailMaxHeight = Math.min(420, Math.round(windowHeight * 0.36));
  const [open, setOpen] = useState(false);
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  if (stats.events === 0) return null;

  const ratio = stats.settled > 0 ? `${stats.hits}/${stats.settled}` : `0/0`;
  const pct = stats.hitRate != null ? `${Math.round(stats.hitRate * 100)}%` : '—';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => {
          setOpen((v) => !v);
          if (open) setOpenEventId(null);
        }}
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

      <Text style={styles.scope}>Tutte le predizioni del giorno, non solo le ufficiali</Text>

      {open ? (
        <ScrollView
          style={[styles.detail, { maxHeight: detailMaxHeight }]}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Per mercato</Text>
          {stats.byMarket.length === 0 ? (
            <Text style={styles.emptyLine}>Nessun mercato</Text>
          ) : (
            stats.byMarket.map((m) => <MarketTypeRow key={m.marketType} market={m} />)
          )}

          <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Per evento</Text>
          {stats.byEvent.map((ev) => (
            <EventAccordion
              key={ev.eventId}
              event={ev}
              expanded={openEventId === ev.eventId}
              onToggle={() =>
                setOpenEventId((cur) => (cur === ev.eventId ? null : ev.eventId))
              }
            />
          ))}
        </ScrollView>
      ) : null}

      {open ? (
        // Outside the ScrollView: always fully visible, never clipped at the panel edge.
        <View style={styles.historyBar}>
          <Pressable
            onPress={() => router.push({ pathname: '/storico', params: { sport: sport ?? 'football' } })}
            style={({ pressed }) => [styles.historyLink, pressed && styles.historyLinkPressed]}
            accessibilityRole="link"
            accessibilityLabel="Vedi storico ufficiale"
          >
            <Text style={styles.historyLinkText}>Vedi storico ufficiale</Text>
            <Text style={styles.historyLinkText}>›</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function MarketTypeRow({ market }: { market: MarketTypeStat }) {
  const styles = useThemedStyles(makeStyles);
  const ratio = market.settled > 0 ? `${market.hits}/${market.settled}` : '0/0';
  const pct =
    market.hitRate != null ? `${Math.round(market.hitRate * 100)}%` : '—';
  return (
    <View style={styles.marketTypeRow}>
      <Text style={styles.marketTypeName} numberOfLines={1}>
        {marketLabel(market.marketType)}
      </Text>
      <Text style={styles.marketTypeRatio}>{ratio}</Text>
      <Text style={styles.marketTypePct}>{pct}</Text>
    </View>
  );
}

function EventAccordion({
  event,
  expanded,
  onToggle,
}: {
  event: EventDayStat;
  expanded: boolean;
  onToggle: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const ratio =
    event.settled > 0
      ? `${event.hits}/${event.settled}`
      : event.statusLabel
        ? event.statusLabel
        : '—';
  return (
    <View style={styles.eventBlock}>
      <Pressable
        onPress={onToggle}
        style={styles.eventHead}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${event.eventName}, ${ratio}`}
      >
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
        <View style={styles.eventHeadRight}>
          <Text
            style={[
              styles.eventRatio,
              event.settled === 0 && event.statusLabel ? styles.eventStatus : null,
            ]}
            numberOfLines={2}
          >
            {ratio}
          </Text>
          <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.marketList}>
          {event.markets.map(({ prediction, tone }) => (
            <View key={prediction.id} style={styles.marketRow}>
              <Text style={styles.marketName} numberOfLines={1}>
                {marketLabel(prediction.prediction.type)}
              </Text>
              <Text style={styles.marketPick} numberOfLines={1}>
                {selectionLabel(prediction.prediction.selection.name)}
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
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  summaryLeft: { flex: 1, gap: 2 },
  summaryRight: { alignItems: 'flex-end', gap: 2 },
  kicker: {
    fontFamily: fonts.bodyMedium,
    fontSize: fs(11),
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  ratio: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(18),
    color: colors.ink,
  },
  ratioAccent: { color: colors.accentText },
  pct: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(16),
    color: colors.accentText,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: fs(11),
    color: colors.inkMuted,
  },
  scope: {
    fontFamily: fonts.body,
    fontSize: fs(11),
    color: colors.inkMuted,
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  historyBar: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  // Solid accent so it reads as the panel's main action, not a faint row.
  historyLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  historyLinkPressed: { opacity: 0.85 },
  historyLinkText: { fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.onAccent },
  chevron: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(12),
    color: colors.inkMuted,
    marginTop: 2,
  },
  detail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingVertical: spacing.sm,
    maxHeight: 420,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(12),
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  sectionSpaced: { marginTop: spacing.md },
  emptyLine: {
    fontFamily: fonts.body,
    fontSize: fs(13),
    color: colors.inkMuted,
    paddingHorizontal: spacing.md,
  },
  marketTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  marketTypeName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: fs(13),
    color: colors.ink,
  },
  marketTypeRatio: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(14),
    color: colors.accentText,
    minWidth: 52,
    textAlign: 'right',
  },
  marketTypePct: {
    fontFamily: fonts.body,
    fontSize: fs(12),
    color: colors.inkMuted,
    minWidth: 36,
    textAlign: 'right',
  },
  eventBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  eventHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  eventTitles: { flex: 1, gap: 2 },
  eventComp: {
    fontFamily: fonts.bodyMedium,
    fontSize: fs(10),
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  eventName: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(14),
    color: colors.ink,
  },
  eventHeadRight: { alignItems: 'flex-end', gap: 2 },
  eventRatio: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(14),
    color: colors.accentText,
  },
  eventStatus: {
    fontFamily: fonts.bodyMedium,
    fontSize: fs(12),
    color: colors.inkMuted,
    maxWidth: 110,
    textAlign: 'right',
  },
  marketList: {
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marketName: {
    flex: 1.1,
    fontFamily: fonts.bodyMedium,
    fontSize: fs(12),
    color: colors.inkMuted,
  },
  marketPick: {
    flex: 1.2,
    fontFamily: fonts.body,
    fontSize: fs(12),
    color: colors.ink,
    textAlign: 'right',
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeHit: { backgroundColor: colors.hitBadge },
  badgeMiss: { backgroundColor: colors.missBadge },
  badgePending: { backgroundColor: colors.line },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: fs(11),
    color: colors.inkMuted,
  },
  badgeTextHit: { color: '#fff' },
  badgeTextMiss: { color: '#fff' },
});
