import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import { useAuth } from '@/hooks/auth';
import { adminListPermissions, adminListUsers, adminSetRole } from '@/services/api';
import type { AdminPermission, AdminUser } from '@/types/api';
import {
  adminErrorMessage,
  canEditUser,
  formatItalianDate,
  formatItalianDateTime,
  hasPermission,
  isSuperAdmin,
  permissionLabel,
  roleLabel,
} from '@/utils/admin';

const PAGE = 50;

/** Registered users (admins with view_users); super admins can also edit roles. */
export function AdminUsersScreen() {
  const styles = useThemedStyles(makeStyles);
  const { user, token } = useAuth();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [patched, setPatched] = useState<Record<string, AdminUser>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 400);
    return () => clearTimeout(id);
  }, [text]);

  const allowed = hasPermission(user, 'view_users') && !!token;
  const list = useInfiniteQuery({
    queryKey: ['admin', 'users', q],
    enabled: allowed,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      adminListUsers(token as string, { limit: PAGE, offset: pageParam, q: q || undefined }),
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return last.items.length > 0 && next < last.total ? next : undefined;
    },
    retry: false,
    staleTime: 0,
  });
  const rows = useMemo(
    () => (list.data?.pages.flatMap((p) => p.items) ?? []).map((u) => patched[u.id] ?? u),
    [list.data, patched],
  );
  const total = list.data?.pages[0]?.total ?? 0;
  const superAdmin = isSuperAdmin(user);

  if (!user || !allowed) {
    return (
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <View style={styles.pad}>
          <EmptyState
            title="Non disponibile"
            subtitle="Questa sezione è riservata agli amministratori con il permesso per vedere gli utenti."
          />
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <View style={styles.header}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Cerca per nome o email"
        placeholderTextColor="#9B9B9B"
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Cerca utenti"
      />
      {list.data ? (
        <Text style={styles.count}>
          {total} {total === 1 ? 'utente' : 'utenti'}
          {q ? ' trovati' : ' registrati'}
        </Text>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {!superAdmin ? <Text style={styles.count}>Elenco in sola lettura.</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
        }}
        ListEmptyComponent={
          list.isLoading ? (
            <ActivityIndicator style={styles.loader} />
          ) : list.isError ? (
            <EmptyState
              tone="error"
              title="Elenco non disponibile"
              subtitle={adminErrorMessage(list.error)}
              actionLabel="Riprova"
              onAction={() => list.refetch()}
            />
          ) : (
            <EmptyState
              title={q ? 'Nessun utente trovato' : 'Nessun utente'}
              subtitle={q ? 'Prova con un altro nome o email.' : undefined}
            />
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <ActivityIndicator style={styles.loader} />
          ) : list.hasNextPage ? (
            <Pressable
              onPress={() => list.fetchNextPage()}
              style={styles.more}
              accessibilityRole="button"
              accessibilityLabel="Carica altri"
            >
              <Text style={styles.moreText}>Carica altri</Text>
            </Pressable>
          ) : undefined
        }
        renderItem={({ item }) => {
          const editable = canEditUser(user, item);
          return (
            <Pressable
              disabled={!editable}
              onPress={() => {
                setNotice(null);
                setEditing(item);
              }}
              style={styles.row}
              accessibilityRole={editable ? 'button' : undefined}
              accessibilityLabel={`${item.display_name || item.email || 'Utente'}, ${roleLabel(item.role)}`}
            >
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.display_name || item.email || 'Senza nome'}
                </Text>
                <View style={[styles.badge, item.role === 'user' && styles.badgeMuted]}>
                  <Text style={[styles.badgeText, item.role === 'user' && styles.badgeTextMuted]}>
                    {roleLabel(item.role)}
                  </Text>
                </View>
              </View>
              {item.email && item.display_name ? (
                <Text style={styles.email} numberOfLines={1}>
                  {item.email}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {`Registrato il ${formatItalianDate(item.created_at)} · Ultimo accesso: ${formatItalianDateTime(item.last_login_at)}`}
              </Text>
              {editable ? <Text style={styles.edit}>Modifica ruolo ›</Text> : null}
            </Pressable>
          );
        }}
      />
      {editing && token ? (
        <RoleEditor
          target={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPatched((p) => ({ ...p, [updated.id]: updated }));
            setNotice(`Ruolo di ${updated.display_name || updated.email || 'utente'} aggiornato: ${roleLabel(updated.role)}.`);
            setEditing(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function RoleEditor({
  target,
  token,
  onClose,
  onSaved,
}: {
  target: AdminUser;
  token: string;
  onClose: () => void;
  onSaved: (user: AdminUser) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const [isAdmin, setIsAdmin] = useState(target.role === 'admin');
  const [perms, setPerms] = useState<string[]>(target.permissions ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: () => adminListPermissions(token),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const toggle = (key: string) =>
    setPerms((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await adminSetRole(token, target.id, {
        role: isAdmin ? 'admin' : 'user',
        permissions: isAdmin ? perms : [],
      });
      onSaved(updated);
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.sheetBody}>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {target.display_name || target.email || 'Utente'}
            </Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Admin</Text>
              <Switch
                value={isAdmin}
                onValueChange={setIsAdmin}
                disabled={saving}
                accessibilityLabel="Admin"
              />
            </View>
            {isAdmin ? (
              <View style={styles.permList}>
                {available.isLoading ? <ActivityIndicator /> : null}
                {available.isError ? (
                  <Text style={styles.error}>{adminErrorMessage(available.error)}</Text>
                ) : null}
                {available.data?.permissions.map((p) => {
                  const on = perms.includes(p.key);
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => toggle(p.key)}
                      disabled={saving}
                      style={styles.permRow}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={permissionLabel(p.key, p.label)}
                    >
                      <View style={[styles.box, on && styles.boxOn]}>
                        {on ? <Text style={styles.tick}>✓</Text> : null}
                      </View>
                      <Text style={styles.permText}>{permissionLabel(p.key as AdminPermission, p.label)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                onPress={save}
                disabled={saving}
                style={[styles.primary, saving && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Salva"
              >
                <Text style={styles.primaryText}>{saving ? 'Salvo…' : 'Salva'}</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                disabled={saving}
                style={styles.secondary}
                accessibilityRole="button"
                accessibilityLabel="Annulla"
              >
                <Text style={styles.secondaryText}>Annulla</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    pad: { padding: spacing.lg },
    content: { padding: spacing.lg, gap: spacing.sm },
    header: { gap: spacing.sm, marginBottom: spacing.sm },
    search: {
      minHeight: 44,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: spacing.md,
      fontFamily: fonts.body,
      fontSize: fs(15),
      color: colors.ink,
    },
    count: { fontFamily: fonts.body, fontSize: fs(12), color: colors.inkMuted },
    notice: { fontFamily: fonts.bodyMedium, fontSize: fs(13), color: colors.hit },
    loader: { marginVertical: spacing.lg },
    row: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: 3,
    },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    name: { flex: 1, fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.ink },
    email: { fontFamily: fonts.body, fontSize: fs(13), color: colors.inkMuted },
    meta: { fontFamily: fonts.body, fontSize: fs(12), color: colors.inkMuted },
    edit: { fontFamily: fonts.bodyMedium, fontSize: fs(12), color: colors.accentText },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.pill,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    badgeMuted: { backgroundColor: colors.track, borderColor: colors.line },
    badgeText: { fontFamily: fonts.bodyBold, fontSize: fs(11), color: colors.accentText },
    badgeTextMuted: { color: colors.inkMuted },
    more: {
      minHeight: 44,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    moreText: { fontFamily: fonts.bodyBold, fontSize: fs(14), color: colors.ink },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    sheet: {
      maxHeight: '85%',
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceElevated,
    },
    sheetBody: { padding: spacing.lg, gap: spacing.md },
    sheetTitle: { fontFamily: fonts.bodyBold, fontSize: fs(18), color: colors.ink },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    switchLabel: { fontFamily: fonts.bodyMedium, fontSize: fs(15), color: colors.ink },
    permList: { gap: spacing.xs },
    permRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    box: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.inkMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    tick: { fontFamily: fonts.bodyBold, fontSize: fs(14), color: colors.onAccent },
    permText: { flex: 1, fontFamily: fonts.body, fontSize: fs(14), color: colors.ink },
    error: { fontFamily: fonts.bodyMedium, fontSize: fs(13), color: colors.miss },
    actions: { gap: spacing.sm },
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
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryText: { fontFamily: fonts.bodyBold, fontSize: fs(14), color: colors.ink },
    disabled: { opacity: 0.5 },
  });
