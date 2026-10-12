import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import { useAuth } from '@/hooks/auth';
import { authErrorMessage, initials } from '@/utils/profile';

/** Optional account: the app works the same without it. */
export function ProfileScreen() {
  const styles = useThemedStyles(makeStyles);
  const { available, status, user, signIn, signOut, deleteAccount } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      const message = authErrorMessage(err);
      setError(message || null);
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  if (!available) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <View style={styles.pad}>
          <Text style={styles.title}>Accesso non disponibile</Text>
          <Text style={styles.body}>
            In questa versione dell’app l’accesso con Google non è attivo. Tutto il resto funziona
            come sempre.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'loading') {
    return <SafeAreaView style={styles.root} edges={['bottom']} />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.title}>Accedi, se vuoi</Text>
          <Text style={styles.body}>
            Non serve un account per usare l’app: partite, predizioni e storico restano accessibili a
            tutti. Con l’accesso Google avrai un profilo, che in futuro ospiterà le tue preferenze.
          </Text>
          <Pressable
            onPress={() => run(signIn)}
            disabled={busy}
            style={[styles.primary, busy && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Accedi con Google"
          >
            <Text style={styles.primaryText}>{busy ? 'Un momento…' : 'Accedi con Google'}</Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.fine}>
            Salviamo solo nome, email e foto del tuo account Google. Puoi cancellare l’account in
            qualsiasi momento da questa schermata.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user)}</Text>
          </View>
          <View style={styles.headText}>
            <Text style={styles.name} numberOfLines={1}>
              {user.display_name || 'Il tuo profilo'}
            </Text>
            {user.email ? (
              <Text style={styles.email} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={() => run(signOut)}
          disabled={busy}
          style={[styles.secondary, busy && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Esci"
        >
          <Text style={styles.secondaryText}>Esci</Text>
        </Pressable>

        {confirmDelete ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmTitle}>Eliminare l’account?</Text>
            <Text style={styles.body}>
              Il profilo viene cancellato per sempre. Potrai accedere di nuovo, ma ripartirai da zero.
            </Text>
            <View style={styles.row}>
              <Pressable
                onPress={() => run(deleteAccount)}
                disabled={busy}
                style={[styles.danger, busy && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Elimina definitivamente"
              >
                <Text style={styles.dangerText}>{busy ? 'Un momento…' : 'Elimina definitivamente'}</Text>
              </Pressable>
              <Pressable
                onPress={() => setConfirmDelete(false)}
                disabled={busy}
                style={styles.secondary}
                accessibilityRole="button"
                accessibilityLabel="Annulla"
              >
                <Text style={styles.secondaryText}>Annulla</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirmDelete(true)}
            style={styles.linkDanger}
            accessibilityRole="button"
            accessibilityLabel="Elimina account"
          >
            <Text style={styles.linkDangerText}>Elimina account</Text>
          </Pressable>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    pad: { padding: spacing.lg, gap: spacing.md },
    title: { fontFamily: fonts.display, fontSize: fs(30), color: colors.ink },
    body: { fontFamily: fonts.body, fontSize: fs(14), color: colors.inkMuted, lineHeight: fs(21) },
    fine: { fontFamily: fonts.body, fontSize: fs(12), color: colors.inkMuted },
    error: { fontFamily: fonts.bodyMedium, fontSize: fs(13), color: colors.miss },
    primary: {
      minHeight: 48,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryText: { fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.onAccent },
    secondary: {
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryText: { fontFamily: fonts.bodyBold, fontSize: fs(14), color: colors.ink },
    disabled: { opacity: 0.5 },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    headText: { flex: 1, gap: 2 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontFamily: fonts.bodyBold, fontSize: fs(20), color: colors.accentText },
    name: { fontFamily: fonts.bodyBold, fontSize: fs(18), color: colors.ink },
    email: { fontFamily: fonts.body, fontSize: fs(13), color: colors.inkMuted },
    linkDanger: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
    linkDangerText: { fontFamily: fonts.bodyMedium, fontSize: fs(14), color: colors.miss },
    confirm: {
      borderWidth: 1,
      borderColor: colors.miss,
      backgroundColor: colors.missBg,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    confirmTitle: { fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.ink },
    row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
    danger: {
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.pill,
      backgroundColor: colors.missBadge,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dangerText: { fontFamily: fonts.bodyBold, fontSize: fs(14), color: '#FFFFFF' },
  });
