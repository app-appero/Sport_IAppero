import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { DecisionFilterButton } from '@/components/DecisionFilterButton';
import { EventCardSkeleton } from '@/components/EventCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { FilterChips } from '@/components/FilterChips';
import { MarketBoard } from '@/components/MarketBoard';
import { ScorersSection } from '@/components/ScorersSection';
import { SportThemeProvider, useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { fonts, spacing, type Palette, fs } from '@/constants/theme';
import { BOOKINGS_API_READY } from '@/constants/features';
import { useEventBookings, useEventPredictions, useEventScorers } from '@/hooks/queries';
import type { EventBookingsResponse, EventScorersResponse, UnifiedPrediction } from '@/types/api';
import { parseDecisionFilter, predictionMatchesDecision, type DecisionFilter } from '@/utils/decisionFilter';
import { formatEventTime } from '@/utils/dates';
import { eventStatusLabel } from '@/utils/eventStatus';
import { formatApiError } from '@/utils/formatApiError';
import { scoreForMarket } from '@/utils/outcome';
import { isScorersUnsupported } from '@/utils/scorers';

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

type DetailSection = 'markets' | 'scorers' | 'bookings';

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
  const { id, sport, date, decision: decisionParam } = useLocalSearchParams<{
    id: string;
    sport?: string;
    date?: string;
    decision?: string;
  }>();
  const [decision, setDecision] = useState<DecisionFilter>(() => parseDecisionFilter(decisionParam));
  const [section, setSection] = useState<DetailSection>('markets');
  const colors = useSportPalette();
  const styles = useThemedStyles(makeStyles);
  const selectedDate = date ? String(date) : undefined;
  const query = useEventPredictions(String(id ?? ''), {
    sport: sport ? String(sport) : undefined,
    date: selectedDate,
  });

  const isFootball = (query.data?.items[0]?.sport ?? sport) === 'football';
  const scorers = useEventScorers(String(id ?? ''), isFootball);
  const bookings = useEventBookings(String(id ?? ''), isFootball && BOOKINGS_API_READY);

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

  const allItems = sortMarkets(query.data?.items ?? []);
  const items = allItems.filter((item) => predictionMatchesDecision(item, decision));
  const event = allItems[0]?.event;
  const title = event?.name ?? `Evento ${id}`;
  const timeLabel = formatEventTime(event?.start_time ?? null, event?.local_time);
  const scoreSample = event
    ? scoreForMarket(event, allItems[0]?.prediction.type || 'h2h')
    : null;
  const statusLabel = event
    ? eventStatusLabel(event, { selectedDate })
    : null;
  const active: DetailSection = isFootball ? section : 'markets';
  const sections: { label: string; value: DetailSection }[] = [{ label: 'Mercati', value: 'markets' }];
  if (isFootball) {
    sections.push({ label: 'Marcatori', value: 'scorers' });
    if (BOOKINGS_API_READY) sections.push({ label: 'Ammoniti', value: 'bookings' });
  }

  return (
    <View style={styles.screen}>
      {header}
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
        {sections.length > 1 ? (
          <FilterChips
            options={sections}
            value={active}
            onChange={setSection}
            accessibilityLabel="Sezioni della partita"
          />
        ) : null}
        {active === 'markets' ? (
          <Text style={styles.subtitle}>
            {items.length} mercati · il badge Consigliata è l’unica usata in statistica
          </Text>
        ) : null}
      </View>
      <View style={styles.body}>
        {active === 'markets' ? (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.content}
            data={items}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <EmptyState
                title={
                  decision === 'all'
                    ? 'Nessun mercato per questo evento'
                    : 'Nessun mercato in questo stato'
                }
                subtitle={
                  decision === 'all'
                    ? 'Prova a tornare indietro e riaprire la card, oppure cambia giorno.'
                    : 'Questo stato non ha previsioni su questa partita.'
                }
                actionLabel={decision === 'all' ? 'Riprova' : undefined}
                onAction={decision === 'all' ? () => query.refetch() : undefined}
              />
            }
            renderItem={({ item }) => <MarketBoard item={item} date={selectedDate} />}
          />
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.content}>
            <PlayersPane
              variant={active === 'bookings' ? 'bookings' : 'scorers'}
              data={active === 'bookings' ? bookings.data : scorers.data}
              isLoading={active === 'bookings' ? bookings.isLoading : scorers.isLoading}
              isError={
                active === 'bookings'
                  ? bookings.isError && !bookings.data
                  : scorers.isError && !scorers.data
              }
            />
          </ScrollView>
        )}
      </View>
      <View style={styles.fabDock} pointerEvents="box-none">
        <DecisionFilterButton docked value={decision} onChange={setDecision} />
      </View>
    </View>
  );
}

function PlayersPane({
  variant,
  data,
  isLoading,
  isError,
}: {
  variant: 'scorers' | 'bookings';
  data: EventScorersResponse | EventBookingsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  const unavailable = !isLoading && (isError || !data || isScorersUnsupported(data));
  if (unavailable) {
    return (
      <EmptyState
        title={variant === 'bookings' ? 'Ammoniti non disponibili' : 'Marcatori non disponibili'}
        subtitle="Per questa partita il provider non ha la lista."
      />
    );
  }
  return (
    <ScorersSection
      variant={variant}
      data={data}
      isLoading={isLoading}
      isError={isError}
    />
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
    screen: { flex: 1, backgroundColor: colors.surface },
    body: { flex: 1, minHeight: 0 },
    list: { flex: 1, backgroundColor: colors.surface },
    content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.lg },
    header: {
      gap: 4,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    fabDock: {
      paddingHorizontal: spacing.md,
      paddingTop: 2,
      paddingBottom: 6,
      alignItems: 'flex-end',
    },
    title: { fontFamily: fonts.bodyBold, fontSize: fs(22), color: colors.ink },
    subtitle: { fontFamily: fonts.body, fontSize: fs(14), color: colors.inkMuted },
    score: { fontFamily: fonts.bodyBold, fontSize: fs(16), color: colors.ink, marginTop: 4 },
  });
