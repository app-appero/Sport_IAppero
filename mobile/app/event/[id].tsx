import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { PredictionCard } from '@/components/PredictionCard';
import { colors, fonts, spacing } from '@/constants/theme';
import { useEventPredictions } from '@/hooks/queries';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useEventPredictions(String(id ?? ''));

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
        title="Unable to load event markets"
        subtitle={query.error instanceof Error ? query.error.message : undefined}
      />
    );
  }

  const items = query.data?.items ?? [];
  const title = items[0]?.event.name ?? `Event ${id}`;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.brand}>ORACLE SPORTS</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{items.length} markets / predictions</Text>
        </View>
      }
      ListEmptyComponent={<EmptyState title="No markets for this event" />}
      renderItem={({ item, index }) => (
        <PredictionCard
          item={item}
          index={index}
          onPress={() =>
            router.push({
              pathname: '/prediction/[id]',
              params: { id: item.id },
            })
          }
        />
      )}
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
    color: colors.brand,
    letterSpacing: 1,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted },
});
