import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import { adminListUsers, adminRefresh, adminRefreshStatus } from '@/services/api';
import type { AuthUser } from '@/types/api';
import {
  REFRESH_POLL_MS,
  adminErrorMessage,
  hasPermission,
  refreshStateLabel,
  roleLabel,
  shouldKeepPolling,
  sportLabel,
} from '@/utils/admin';

const SPORTS = ['football', 'tennis'] as const;
type States = Record<string, string>;

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
  const [running, setRunning] = useState(false);
  const [states, setStates] = useState<States | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const alive = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const start = useCallback(async () => {
    const myRun = ++runId.current;
    const current = () => alive.current && runId.current === myRun;
    setRunning(true);
    setMessage(null);
    setStates(null);
    try {
      const res = await adminRefresh(token, [...SPORTS]);
      if (!current()) return;
      const next: States = {};
      const refs: Record<string, string> = {};
      for (const sport of SPORTS) {
        const r = res.results?.[sport];
        if (!r || r.state === 'error' || !r.ref) next[sport] = 'error';
        else {
          next[sport] = 'queued';
          refs[sport] = r.ref;
        }
      }
      setStates({ ...next });
      const startedAt = Date.now();
      let failures = 0;
      while (Object.keys(refs).length > 0 && current()) {
        const pending = Object.fromEntries(
          Object.entries(refs).filter(([sport]) => !isDone(next[sport])),
        );
        if (Object.keys(pending).length === 0) break;
        if (!shouldKeepPolling(next, startedAt, Date.now())) {
          setMessage('Controllo interrotto dopo 10 minuti: lo stato potrebbe non essere aggiornato.');
          break;
        }
        await sleep(REFRESH_POLL_MS);
        if (!current()) return;
        try {
          const status = await adminRefreshStatus(token, pending);
          if (!current()) return;
          failures = 0;
          for (const sport of Object.keys(pending)) {
            const s = status[sport as (typeof SPORTS)[number]];
            if (s?.state) next[sport] = s.state;
          }
          setStates({ ...next });
        } catch (err) {
          const status = (err as { status?: number })?.status;
          // Auth errors will not heal by retrying; a flaky network might.
          if (status === 401 || status === 403 || ++failures >= 3) {
            if (current()) setMessage(adminErrorMessage(err));
            break;
          }
        }
      }
    } catch (err) {
      if (current()) setMessage(adminErrorMessage(err));
    } finally {
      if (current()) setRunning(false);
    }
  }, [token]);

  return (
    <View style={styles.block}>
      <Pressable
        onPress={start}
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
      {states
        ? SPORTS.map((sport) => (
            <Text key={sport} style={styles.stateRow}>
              {`${sportLabel(sport)} · ${refreshStateLabel(states[sport] as never)}`}
            </Text>
          ))
        : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

function isDone(state: string | undefined): boolean {
  return state === 'success' || state === 'failed' || state === 'unknown' || state === 'error';
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
    stateRow: { fontFamily: fonts.bodyMedium, fontSize: fs(14), color: colors.ink },
    error: { fontFamily: fonts.bodyMedium, fontSize: fs(13), color: colors.miss },
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
