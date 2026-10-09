import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { MarketRow } from '@/components/EventCard';
import { APP_NAME } from '@/constants/brand';
import { colors, fonts, spacing } from '@/constants/theme';
import { useEventPredictions } from '@/hooks/queries';
import { formatEventTime } from '@/utils/dates';
import { scoreForMarket } from '@/utils/outcome';

export default function EventDetailScreen() {
  const { id, sport, date } = useLocalSearchParams<{
    id: string;
    sport?: string;
    date?: string;
  }>();
  const query = useEventPredictions(String(id ?? ''), {
    sport: sport ? String(sport) : undefined,
    date: date ? String(date) : undefined,
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        title="Impossibile caricare i mercati"
        subtitle={query.error instanceof Error ? query.error.message : undefined}
        actionLabel="Riprova"
        onAction={() => query.refetch()}
      />
    );
  }

  const items = query.data?.items ?? [];
  const event = items[0]?.event;
  const title = event?.name ?? `Evento ${id}`;
  const timeLabel = formatEventTime(event?.start_time ?? null);
  const scoreSample = event
    ? scoreForMarket(event, items[0]?.prediction.type || 'h2h')
    : null;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {event?.competition?.name ?? 'Competizione'} · {timeLabel}
          </Text>
          {scoreSample ? <Text style={styles.score}>Risultato · {scoreSample}</Text> : null}
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
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, gap: spacing.md },
  header: { gap: 4, marginBottom: spacing.sm },
  brand: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted },
  score: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, marginTop: 4 },
});
