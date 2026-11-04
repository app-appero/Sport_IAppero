import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import { REFRESH_SPORTS } from '@/utils/refreshRun';
import { useRefreshRun } from '@/hooks/refreshRun';
import { adminListUsers } from '@/services/api';
import type { AuthUser } from '@/types/api';
import {
  hasPermission,
  overallProgress,
  refreshStateLabel,
  roleLabel,
  sportProgress,
  sportLabel,
} from '@/utils/admin';

const SPORTS = REFRESH_SPORTS;

/** Admin tools in the profile. Hidden by the caller for plain users; the server enforces it. */
export function AdminSection({ user, token }: { user: AuthUser; token: string }) {
  const styles = useThemedStyles(makeStyles);
  const canRefresh = hasPermission(user, 'refresh_data');
  const canViewUsers = hasPermission(user, 'view_users');

  return (
    <View style={styles.box}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Amministrazione</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{roleLabel(user.role)}</Text>
        </View>
      </View>
      {canRefresh ? <RefreshBlock token={token} /> : null}
      {canViewUsers ? <UsersLink token={token} /> : null}
      {!canRefresh && !canViewUsers ? (
        <Text style={styles.hint}>Nessuna funzione abilitata per il tuo account.</Text>
      ) : null}
    </View>
  );
}

function UsersLink({ token }: { token: string }) {
  const styles = useThemedStyles(makeStyles);
  const count = useQuery({
    queryKey: ['admin', 'users-count', token.slice(-8)],
    queryFn: () => adminListUsers(token, { limit: 1, offset: 0 }),
    staleTime: 30_000,
    retry: false,
  });
  const label =
    count.data != null ? `Utenti registrati · ${count.data.total}` : 'Utenti registrati';
  return (
    <Pressable
      onPress={() => router.push('/admin/users')}
      style={styles.linkRow}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.linkText}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function RefreshBlock({ token }: { token: string }) {
  const styles = useThemedStyles(makeStyles);
  const { view, start } = useRefreshRun();
  const { running, states, progress, reasons, message } = view;

  const overall = states ? overallProgress(states, progress) : null;

  return (
    <View style={styles.block}>
      <Pressable
        onPress={() => void start(token)}
        disabled={running}
        style={[styles.primary, running && styles.disabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: running }}
        accessibilityLabel="Aggiorna tutto (Calcio + Tennis)"
      >
        <Text style={styles.primaryText}>
          {running ? 'Aggiornamento in corso…' : 'Aggiorna tutto (Calcio + Tennis)'}
        </Text>
      </Pressable>
      <View style={styles.splitRow}>
        {SPORTS.map((sport) => (
          <Pressable
            key={sport}
            onPress={() => void start(token, [sport])}
            disabled={running}
            style={[styles.secondary, styles.splitButton, running && styles.disabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: running }}
            accessibilityLabel={`Aggiorna solo ${sportLabel(sport)}`}
          >
            <Text style={styles.secondaryText}>{`Solo ${sportLabel(sport)}`}</Text>
          </Pressable>
        ))}
      </View>
      {states && overall != null ? (
        <View>
          <Text style={styles.stateRow}>{`Avanzamento totale · ${overall}%`}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${overall}%` }]} />
          </View>
        </View>
      ) : null}
      {states
        ? SPORTS.filter((sport) => states[sport] != null).map((sport) => (
            <View key={sport}>
              <Text style={styles.stateRow}>
                {`${sportLabel(sport)} · ${refreshStateLabel(states[sport] as never)} · ${sportProgress(states[sport], progress[sport])}%`}
              </Text>
              {reasons[sport] ? <Text style={styles.reason}>{reasons[sport]}</Text> : null}
            </View>
          ))
        : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    box: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: fonts.bodyBold, fontSize: fs(16), color: colors.ink },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.pill,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: fs(12), color: colors.accentText },
    hint: { fontFamily: fonts.body, fontSize: fs(13), color: colors.inkMuted },
    block: { gap: spacing.sm },
    primary: {
      minHeight: 48,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    primaryText: { fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.onAccent },
    disabled: { opacity: 0.5 },
    barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden', marginTop: 4 },
    barFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
    stateRow: { fontFamily: fonts.bodyMedium, fontSize: fs(14), color: colors.ink },
    error: { fontFamily: fonts.bodyMedium, fontSize: fs(13), color: colors.miss },
    reason: { fontFamily: fonts.body, fontSize: fs(12), color: colors.inkMuted },
    secondary: {
      minHeight: 44,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    splitRow: { flexDirection: 'row', gap: spacing.sm },
    splitButton: { flex: 1 },
    secondaryText: { fontFamily: fonts.bodyBold, fontSize: fs(14), color: colors.accentText },
    linkRow: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    linkText: { fontFamily: fonts.bodyMedium, fontSize: fs(15), color: colors.ink },
    chevron: { fontFamily: fonts.bodyBold, fontSize: fs(22), color: colors.inkMuted },
  });
