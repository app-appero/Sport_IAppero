import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import { useAuth } from '@/hooks/auth';
import { adminRefreshEvent } from '@/services/api';
import { eventRefreshErrorMessage, eventRefreshSummary, isSuperAdmin } from '@/utils/admin';

type Props = { sport: string; eventId: string };

/**
 * "Aggiorna partita": super admin only (the server enforces it too). Refreshes this one match - result and
 * the predictions of every market - then reloads the lists. Each press spends provider quota: no limit by choice.
 */
export function EventRefreshButton({ sport, eventId }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);

  if (!token || !isSuperAdmin(user)) return null;

  const run = async () => {
    if (running) return;
    setRunning(true);
    setNote(null);
    try {
      const res = await adminRefreshEvent(token, sport, eventId);
      setNote({ text: eventRefreshSummary(res), error: res.state === 'partial' });
      await qc.invalidateQueries();
    } catch (err) {
      setNote({ text: eventRefreshErrorMessage(err), error: true });
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={styles.box}>
      <Pressable
        onPress={() => void run()}
        disabled={running}
        style={[styles.button, running && styles.disabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: running }}
        accessibilityLabel="Aggiorna partita: risultato e predizioni di tutti i mercati"
      >
        <Text style={styles.buttonText}>{running ? 'Aggiorno la partita…' : 'Aggiorna partita'}</Text>
      </Pressable>
      {note ? <Text style={[styles.note, note.error && styles.noteError]}>{note.text}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    box: { gap: spacing.xs, paddingTop: spacing.sm, alignItems: 'flex-start' },
    button: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    buttonText: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.accentText },
    disabled: { opacity: 0.5 },
    note: { fontFamily: fonts.body, fontSize: fs(12), color: colors.inkMuted },
    noteError: { color: colors.miss },
  });
