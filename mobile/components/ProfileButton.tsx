import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, spacing, type Palette, fs } from '@/constants/theme';
import { useAuth } from '@/hooks/auth';
import { initials } from '@/utils/profile';

/**
 * Round profile button: a person glyph when signed out, initials when signed in. Round on purpose:
 * next to the wordmark and "Storico" a text pill left no breathing room on 360 px screens.
 * Hidden if sign-in is off.
 */
export function ProfileButton() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { available, status, user } = useAuth();
  if (!available || status === 'loading') return null;
  return (
    <Pressable
      onPress={() => router.push('/profilo')}
      hitSlop={6}
      style={[styles.circle, user && styles.circleIn]}
      accessibilityRole="button"
      accessibilityLabel={user ? 'Apri profilo' : 'Accedi'}
    >
      {user ? (
        <Text style={styles.initials} maxFontSizeMultiplier={1.2}>
          {initials(user)}
        </Text>
      ) : (
        <View style={styles.person}>
          <View style={styles.head} />
          <View style={styles.shoulders} />
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    circle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    circleIn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    initials: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.accentText },
    person: { alignItems: 'center', gap: 2 },
    head: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink },
    shoulders: {
      width: 16,
      height: 8,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      backgroundColor: colors.ink,
    },
  });
