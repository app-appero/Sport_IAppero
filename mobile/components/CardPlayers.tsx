import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LockIcon } from '@/components/LockIcon';
import { useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { BOOKINGS_API_READY } from '@/constants/features';
import { fonts, radii, spacing, yellowCard, type Palette, fs } from '@/constants/theme';
import { useEventBookings, useEventScorers } from '@/hooks/queries';
import {
  formatScorerPct,
  initials,
  lineupChip,
  otherScorersCount,
  pickCardScorers,
  type LineupChip,
} from '@/utils/scorers';

type Row = {
  id: string;
  name: string;
  sub: string;
  probability: number;
  done: boolean;
  initials: string;
};

type ColumnState =
  | { kind: 'loading' }
  | { kind: 'rows'; rows: Row[]; chip: LineupChip }
  | { kind: 'waiting'; text: string }
  | { kind: 'hidden' };

/**
 * Football card, bottom block: scorers on the left, yellow cards on the right,
 * two rows each. Without the market for the competition (or on errors) the whole block
 * disappears. With the bookings route switched off, the yellow column is omitted.
 */
export function CardPlayers({
  eventId,
  fallback = null,
  locked = false,
}: {
  eventId: string;
  fallback?: ReactNode;
  /** Guest view: same block, but placeholders instead of players and percentages. */
  locked?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const scorers = useEventScorers(eventId, true, { poll: false });
  const bookings = useEventBookings(eventId, BOOKINGS_API_READY, { poll: false });

  let left: ColumnState;
  const sData = scorers.data;
  if (scorers.isError && !sData) left = { kind: 'hidden' };
  else if (scorers.isLoading && !sData) left = { kind: 'loading' };
  else {
    const chip = lineupChip(sData);
    if (!chip) left = { kind: 'hidden' };
    else if (chip.kind === 'waiting') left = { kind: 'waiting', text: 'Escono con le formazioni.' };
    else {
      const shown = pickCardScorers(sData, 2);
      left = {
        kind: 'rows',
        chip,
        rows: shown.map((p) => ({
          id: String(p.player_id),
          name: p.name,
          sub: p.scored === true ? `${p.team} · ha segnato` : p.team,
          probability: p.probability,
          done: p.scored === true,
          initials: initials(p.name),
        })),
      };
    }
  }

  // Competition without scorers (e.g. Champions League): nothing to add here either.
  if (left.kind === 'hidden') return <>{fallback}</>;
  if (locked) return <LockedPlayers />;

  let right: ColumnState;
  const bData = bookings.data;
  if (!BOOKINGS_API_READY) right = { kind: 'hidden' };
  else if (bookings.isError && !bData) right = { kind: 'waiting', text: 'Non disponibili al momento.' };
  else if (bookings.isLoading && !bData) right = { kind: 'loading' };
  else {
    const chip = lineupChip(bData);
    if (!chip) right = { kind: 'hidden' };
    else if (chip.kind === 'waiting') right = { kind: 'waiting', text: 'Escono con le formazioni.' };
    else {
      const shown = pickCardScorers(bData, 2);
      right = {
        kind: 'rows',
        chip,
        rows: shown.map((p) => ({
          id: String(p.player_id),
          name: p.name,
          sub: p.booked === true ? `${p.team} · ammonito` : p.team,
          probability: p.probability,
          done: p.booked === true,
          initials: initials(p.name),
        })),
      };
    }
  }

  const others =
    otherScorersCount(sData, left.kind === 'rows' ? left.rows.length : 0) +
    otherScorersCount(bData, right.kind === 'rows' ? right.rows.length : 0);

  return (
    <View style={styles.block}>
      <View style={styles.cols}>
        <View style={styles.col}>
          <View style={styles.head}>
            <Text style={styles.cap}>Marcatori</Text>
            {left.kind === 'rows' ? <Chip chip={left.chip} /> : null}
          </View>
          <Body state={left} kind="goal" />
        </View>
        {right.kind === 'hidden' ? null : (
          <View style={[styles.col, styles.colRight]}>
            <View style={styles.head}>
              <Text style={styles.cap}>Gialli</Text>
            </View>
            <Body state={right} kind="yellow" />
          </View>
        )}
      </View>
      {others > 0 ? <Text style={styles.more}>+ altri giocatori · tocca per tutti</Text> : null}
    </View>
  );
}

function LockedPlayers() {
  const styles = useThemedStyles(makeStyles);
  const colors = useSportPalette();
  return (
    <View style={styles.block}>
      <View style={styles.cols}>
        {['Marcatori', 'Gialli'].map((cap, i) => (
          <View key={cap} style={[styles.col, i === 1 && styles.colRight]}>
            <View style={styles.head}>
              <Text style={styles.cap}>{cap}</Text>
            </View>
            {[0, 1].map((r) => (
              <View key={r} style={styles.row}>
                <View style={styles.mini} />
                <View style={styles.who}>
                  <View style={styles.ghostName} />
                  <View style={styles.ghostSub} />
                </View>
                <View style={styles.ghostPct} />
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.lockLine}>
        <LockIcon size={12} color={colors.accentText} />
        <Text style={styles.lockLineText}>Accedi per vedere marcatori e gialli</Text>
      </View>
    </View>
  );
}

function Chip({ chip }: { chip: LineupChip }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.chip, chip.kind === 'estimate' ? styles.chipEst : styles.chipOk]}>
      <Text style={[styles.chipText, chip.kind === 'estimate' ? styles.chipTextEst : styles.chipTextOk]}>
        {chip.label}
      </Text>
    </View>
  );
}

function Body({ state, kind }: { state: ColumnState; kind: 'goal' | 'yellow' }) {
  const styles = useThemedStyles(makeStyles);
  if (state.kind === 'loading') return <View style={styles.placeholder} accessibilityLabel="Caricamento" />;
  if (state.kind === 'waiting') return <Text style={styles.wait}>{state.text}</Text>;
  if (state.kind !== 'rows') return null;
  return (
    <View style={styles.rows}>
      {state.rows.map((r) => (
        <View
          key={r.id}
          style={[styles.row, r.done && (kind === 'goal' ? styles.rowGoal : styles.rowYellow)]}
          accessible
          accessibilityLabel={`${r.name}, ${Math.round(r.probability * 100)} percento${
            kind === 'goal' ? ' di segnare' : ' di essere ammonito'
          }${r.done ? (kind === 'goal' ? ', ha segnato' : ', ammonito') : ''}`}
        >
          {kind === 'goal' ? (
            <View style={[styles.mini, r.done && styles.miniGoal]}>
              <Text style={[styles.miniText, r.done && styles.miniTextGoal]}>{r.initials}</Text>
            </View>
          ) : (
            <View style={styles.cardWrap}>
              <View style={styles.card} />
            </View>
          )}
          <View style={styles.who}>
            <Text
              style={[styles.name, r.done && (kind === 'goal' ? styles.nameGoal : styles.nameYellow)]}
              numberOfLines={1}
            >
              {r.name}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {r.sub}
            </Text>
          </View>
          <Text style={[styles.pct, kind === 'yellow' && styles.pctYellow]}>
            {formatScorerPct(r.probability)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: {
      gap: spacing.xs,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    cols: { flexDirection: 'row' },
    col: { flex: 1, minWidth: 0, gap: 6, paddingRight: 10 },
    colRight: {
      paddingRight: 0,
      paddingLeft: 10,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.line,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 },
    cap: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(10),
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.inkMuted,
    },
    chip: { borderRadius: radii.pill, paddingHorizontal: 7, paddingVertical: 1 },
    chipOk: { backgroundColor: colors.accentSoft },
    chipEst: { backgroundColor: 'rgba(230,184,77,0.16)' },
    chipText: { fontFamily: fonts.bodyBold, fontSize: fs(9) },
    chipTextOk: { color: colors.accentText },
    chipTextEst: { color: colors.warning },
    placeholder: { height: 40, borderRadius: radii.sm, backgroundColor: colors.track, opacity: 0.6 },
    wait: { fontFamily: fonts.body, fontSize: fs(11), lineHeight: fs(15), color: colors.inkMuted },
    rows: { gap: 2 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      minWidth: 0,
      paddingVertical: 4,
      borderRadius: radii.sm,
    },
    rowGoal: { backgroundColor: colors.accentSoft },
    rowYellow: { backgroundColor: yellowCard.bg },
    mini: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.track,
    },
    miniGoal: { backgroundColor: colors.hitBadge },
    miniText: { fontFamily: fonts.bodyBold, fontSize: fs(9), color: colors.ink },
    miniTextGoal: { color: '#fff' },
    cardWrap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
    card: {
      width: 11,
      height: 15,
      borderRadius: 2,
      backgroundColor: yellowCard.fill,
      transform: [{ rotate: '8deg' }],
    },
    who: { flex: 1, minWidth: 0 },
    name: { fontFamily: fonts.bodyMedium, fontSize: fs(12), color: colors.ink },
    nameGoal: { color: colors.accentText },
    nameYellow: { color: yellowCard.fill },
    sub: { fontFamily: fonts.body, fontSize: fs(10), color: colors.inkMuted },
    pct: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.accentText },
    pctYellow: { color: yellowCard.fill },
    ghostName: { width: '70%', height: 9, borderRadius: 4, backgroundColor: colors.track },
    ghostSub: { width: '40%', height: 7, borderRadius: 4, backgroundColor: colors.track, marginTop: 4, opacity: 0.6 },
    ghostPct: { width: 24, height: 10, borderRadius: 4, backgroundColor: colors.track },
    lockLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    lockLineText: { fontFamily: fonts.bodyBold, fontSize: fs(11), color: colors.accentText },
    more: { fontFamily: fonts.body, fontSize: fs(11), color: colors.inkMuted },
  });
