import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { APP_NAME } from '@/constants/brand';
import { colors, fonts, radii, spacing } from '@/constants/theme';

const SPORTS = [
  {
    id: 'football',
    label: 'Calcio',
    subtitle: 'Campionati, mercati e predizioni',
    href: '/football' as const,
    color: colors.football,
  },
  {
    id: 'tennis',
    label: 'Tennis',
    subtitle: 'Tornei, match winner e mercati extra',
    href: '/tennis' as const,
    color: colors.tennis,
  },
];

/** Landing: ogni sport ha la sua sezione — nessun feed “Tutti”. */
export function SportsHubScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#E7F2E4', colors.surface, '#F7F3E8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          <Text style={styles.eyebrow}>Scegli lo sport</Text>
          <Text style={styles.title}>Le tue sezioni</Text>
          <Text style={styles.body}>
            Ogni sport ha il proprio spazio. Nuovi sport arriveranno qui, separati.
          </Text>
        </View>

        <View style={styles.list}>
          {SPORTS.map((sport, index) => (
            <Animated.View
              key={sport.id}
              entering={FadeInDown.delay(index * 60).springify()}
            >
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => router.push(sport.href)}
                accessibilityRole="button"
                accessibilityLabel={sport.label}
              >
                <View style={[styles.stripe, { backgroundColor: sport.color }]} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{sport.label}</Text>
                  <Text style={styles.cardSub}>{sport.subtitle}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
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
    paddingBottom: spacing.md,
    gap: 4,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: colors.brand,
    letterSpacing: 1,
    lineHeight: 44,
  },
  eyebrow: {
    fontFamily: fonts.bodyMedium,
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: 4,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 20,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    minHeight: 88,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  stripe: { width: 8, alignSelf: 'stretch' },
  cardBody: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: 4 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.ink },
  cardSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
  chevron: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.brand,
    paddingRight: spacing.md,
    lineHeight: 40,
  },
});
