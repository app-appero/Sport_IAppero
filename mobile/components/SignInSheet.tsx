import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LockIcon } from '@/components/LockIcon';
import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import { useAuth } from '@/hooks/auth';
import { authErrorMessage } from '@/utils/profile';

const PERKS = [
  'Tutti i mercati, scorrevoli',
  'Marcatori e gialli probabili',
  'Dettaglio partita e statistica di giornata',
];

/** Bottom sheet inviting a guest to sign in with Google. */
export function SignInSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
      onClose();
    } catch (err) {
      // Dismissing the Google sheet gives an empty message: stay on the invite quietly.
      setError(authErrorMessage(err) || null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Chiudi" />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <View style={styles.lockBig}>
          <LockIcon size={26} color={styles.lockColor.color} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title} accessibilityRole="header">
            Accedi per vedere la partita
          </Text>
          <Text style={styles.body}>
            Sblocca tutto per oggi e per i prossimi giorni. I giorni passati restano aperti a tutti.
          </Text>
        </View>
        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p} style={styles.perk}>
              <View style={styles.tick}>
                <Text style={styles.tickText}>✓</Text>
              </View>
              <Text style={styles.perkText}>{p}</Text>
            </View>
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={go}
          disabled={busy}
          style={[styles.cta, busy && styles.ctaBusy]}
          accessibilityRole="button"
          accessibilityLabel="Continua con Google"
        >
          <Text style={styles.ctaText}>{busy ? 'Un momento…' : 'Continua con Google'}</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
          <Text style={styles.later}>Non ora</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
      backgroundColor: colors.surfaceElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line },
    lockBig: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    lockColor: { color: colors.accentText },
    texts: { gap: 6 },
    title: { fontFamily: fonts.bodyBold, fontSize: fs(21), color: colors.ink },
    body: { fontFamily: fonts.body, fontSize: fs(13), lineHeight: fs(19), color: colors.inkMuted },
    perks: { gap: 9 },
    perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tick: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    tickText: { fontFamily: fonts.bodyBold, fontSize: fs(11), color: colors.accentText },
    perkText: { fontFamily: fonts.bodyMedium, fontSize: fs(13), color: colors.ink },
    cta: {
      minHeight: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    ctaBusy: { opacity: 0.6 },
    ctaText: { fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.onAccent },
    error: { fontFamily: fonts.body, fontSize: fs(12), lineHeight: fs(17), color: colors.miss },
    later: { textAlign: 'center', fontFamily: fonts.body, fontSize: fs(12), color: colors.inkMuted },
  });
