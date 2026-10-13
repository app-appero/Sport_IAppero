import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { EventCardSkeleton } from '@/components/EventCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { MarketBoard } from '@/components/MarketBoard';
import { ScorersSection } from '@/components/ScorersSection';
import { SportThemeProvider, useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { fonts, spacing, type Palette, fs } from '@/constants/theme';
import { useEventPredictions, useEventScorers } from '@/hooks/queries';
import type { UnifiedPrediction } from '@/types/api';
import { formatEventTime } from '@/utils/dates';
import { eventStatusLabel } from '@/utils/eventStatus';
import { formatApiError } from '@/utils/formatApiError';
import { scoreForMarket } from '@/utils/outcome';

const MARKET_ORDER = [
  'h2h',
  'dc',
  'under_over_1_5',
  'under_over_2_5',
  'under_over_3_5',
  'goal_no_goal',
  'cards_line_3_5',
  'cards_line_4_5',
  'cards_line_5_5',
  'cards_line_6_5',
  'match_winner',
  'first_set_winner',
  'over_under_games',
  'total_games',
];

function sortMarkets(items: UnifiedPrediction[]): UnifiedPrediction[] {
  return [...items].sort((a, b) => {
    const ia = MARKET_ORDER.indexOf(a.prediction.type);
    const ib = MARKET_ORDER.indexOf(b.prediction.type);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    if (ra !== rb) return ra - rb;
    return a.prediction.type.localeCompare(b.prediction.type);
  });
}

export default function EventDetailScreen() {
  const { sport } = useLocalSearchParams<{ sport?: string }>();
  return (
    <SportThemeProvider sport={sport ? String(sport) : undefined}>
      <EventDetail />
    </SportThemeProvider>
  );
}

function EventDetail() {
  const { id, sport, date } = useLocalSearchParams<{
    id: string;
    sport?: string;
    date?: string;
  }>();
  const colors = useSportPalette();
  const styles = useThemedStyles(makeStyles);
  const selectedDate = date ? String(date) : undefined;
  const query = useEventPredictions(String(id ?? ''), {
    sport: sport ? String(sport) : undefined,
    date: selectedDate,
  });

  const isFootball = (query.data?.items[0]?.sport ?? sport) === 'football';
  const scorers = useEventScorers(String(id ?? ''), isFootball);

  const header = (
    <Stack.Screen
      options={{
        title: 'Evento',
        headerBackTitle: 'Indietro',
        headerStyle: { backgroundColor: colors.surfaceElevated },
        headerTintColor: colors.ink,
        headerTitleStyle: { color: colors.ink },
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        {header}
        <EventCardSkeleton count={3} />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={styles.errorWrap}>
        {header}
        <EmptyState
          title="Impossibile caricare i mercati"
          subtitle={formatApiError(query.error)}
          actionLabel="Riprova"
          onAction={() => query.refetch()}
          tone="error"
        />
      </View>
    );
  }

  const items = sortMarkets(query.data?.items ?? []);
  const event = items[0]?.event;
  const title = event?.name ?? `Evento ${id}`;
  const timeLabel = formatEventTime(event?.start_time ?? null);
  const scoreSample = event
    ? scoreForMarket(event, items[0]?.prediction.type || 'h2h')
    : null;
  const statusLabel = event
    ? eventStatusLabel(event, { selectedDate })
    : null;

  return (
    <>
      {header}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <BrandHeader size="sm" />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {event?.competition?.name ?? 'Competizione'} · {timeLabel}
            </Text>
            {scoreSample ? (
              <Text style={styles.score}>Risultato · {scoreSample}</Text>
            ) : statusLabel ? (
              <Text style={styles.score}>Stato · {statusLabel}</Text>
            ) : null}
            <Text style={styles.subtitle}>
              {items.length} mercati · il badge Consigliata è l’unica usata in statistica
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nessun mercato per questo evento"
            subtitle="Prova a tornare indietro e riaprire la card, oppure cambia giorno."
            actionLabel="Riprova"
            onAction={() => query.refetch()}
          />
        }
        renderItem={({ item }) => <MarketBoard item={item} date={selectedDate} />}
        ListFooterComponent={
          isFootball && items.length > 0 ? (
            <ScorersSection
              data={scorers.data}
              isLoading={scorers.isLoading}
              isError={scorers.isError && !scorers.data}
            />
          ) : null
        }
      />
    </>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    errorWrap: {
      flex: 1,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    list: { flex: 1, backgroundColor: colors.surface },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
    header: { gap: 4, marginBottom: spacing.sm },
    title: { fontFamily: fonts.bodyBold, fontSize: fs(22), color: colors.ink },
    subtitle: { fontFamily: fonts.body, fontSize: fs(14), color: colors.inkMuted },
    score: { fontFamily: fonts.bodyBold, fontSize: fs(16), color: colors.ink, marginTop: 4 },
  });
