import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { EmptyState } from '@/components/EmptyState';
import { MarketRow } from '@/components/EventCard';
import { SportThemeProvider, useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { fonts, spacing, type Palette } from '@/constants/theme';
import { useEventPredictions } from '@/hooks/queries';
import { formatEventTime } from '@/utils/dates';
import { eventStatusLabel } from '@/utils/eventStatus';
import { formatApiError } from '@/utils/formatApiError';
import { scoreForMarket } from '@/utils/outcome';

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
        <ActivityIndicator color={colors.accentDeep} />
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
        />
      </View>
    );
  }

  const items = query.data?.items ?? [];
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
            <Text style={styles.subtitle}>{items.length} mercati predetti</Text>
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
        renderItem={({ item }) => <MarketRow item={item} />}
      />
    </>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    errorWrap: { flex: 1, backgroundColor: colors.surface },
    list: { flex: 1, backgroundColor: colors.surface },
    content: { padding: spacing.lg, gap: spacing.md },
    header: { gap: 4, marginBottom: spacing.sm },
    title: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.ink },
    subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted },
    score: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, marginTop: 4 },
  });
