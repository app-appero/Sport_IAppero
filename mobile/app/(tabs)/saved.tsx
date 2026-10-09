import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { PredictionCard } from '@/components/PredictionCard';
import { APP_NAME } from '@/constants/brand';
import { colors, fonts, gradients, radii, spacing } from '@/constants/theme';
import { useFavorites, useRemoveFavorite } from '@/hooks/favorites';
import type { UnifiedPrediction } from '@/types/api';

export default function SavedTab() {
  const router = useRouter();
  const favorites = useFavorites();
  const remove = useRemoveFavorite();

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...gradients.screen]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Pressable
              onPress={() => router.replace('/')}
              style={styles.backBtn}
              accessibilityRole="button"
            >
              <Text style={styles.backBtnText}>Partite</Text>
            </Pressable>
          </View>
          <Text style={styles.eyebrow}>Solo su questo dispositivo</Text>
          <Text style={styles.title}>Preferiti</Text>
          <Text style={styles.body}>
            Nessun account: i preferiti restano in locale (AsyncStorage).
          </Text>
        </View>

        {favorites.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={favorites.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={favorites.isRefetching}
                onRefresh={() => favorites.refetch()}
                tintColor={colors.accent}
              />
            }
            ListEmptyComponent={
              <EmptyState
                title="Nessun preferito"
                subtitle="Apri una predizione e tocca Salva per aggiungerla qui."
              />
            }
            renderItem={({ item, index }) => {
              const asPrediction = item as unknown as UnifiedPrediction;
              return (
                <View style={styles.row}>
                  <PredictionCard
                    item={asPrediction}
                    index={index}
                    onPress={() =>
                      router.push({
                        pathname: '/prediction/[id]',
                        params: { id: item.id },
                      })
                    }
                  />
                  <Pressable
                    style={styles.remove}
                    onPress={() => remove.mutate(item.id)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.removeText}>Rimuovi</Text>
                  </Pressable>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.accent,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  backBtnText: { fontFamily: fonts.bodyBold, color: colors.ink, fontSize: 13 },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: 4,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.ink },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { gap: spacing.sm },
  remove: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  removeText: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13 },
});
