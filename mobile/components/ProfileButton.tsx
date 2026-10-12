import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, spacing, type Palette, fs } from '@/constants/theme';
import { useAuth } from '@/hooks/auth';
import { initials } from '@/utils/profile';

/** "Accedi" pill when signed out, avatar initials when signed in. Hidden if sign-in is off. */
export function ProfileButton() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { available, status, user } = useAuth();
  if (!available || status === 'loading') return null;
  return (
    <Pressable
      onPress={() => router.push('/profilo')}
      hitSlop={6}
      style={user ? styles.avatar : styles.pill}
      accessibilityRole="button"
      accessibilityLabel={user ? 'Apri profilo' : 'Accedi'}
    >
      <Text style={user ? styles.avatarText : styles.pillText}>
        {user ? initials(user) : 'Accedi'}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pill: {
      minHeight: 36,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    pillText: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.ink },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    avatarText: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.accentText },
  });
