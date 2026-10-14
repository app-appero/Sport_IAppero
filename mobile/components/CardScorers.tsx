import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import { useEventScorers } from '@/hooks/queries';
import {
  initials,
  lineupChip,
  otherScorersCount,
  pickCardScorers,
  formatScorerPct,
  positionShort,
  scorerA11yLabel,
} from '@/utils/scorers';

/**
 * "Marcatori probabili" block of a football match card: state chip, the two most
 * likely players, "+ altri N". Competitions without the market show nothing; errors
 * hide the block rather than the card.
 */
export function CardScorers({ eventId }: { eventId: string }) {
  const styles = useThemedStyles(makeStyles);
  const query = useEventScorers(eventId, true, { poll: false });
  const data = query.data;

  if (query.isError && !data) return null;
  if (query.isLoading && !data) {
    return (
      <View style={styles.block} accessibilityLabel="Caricamento marcatori">
        <View style={styles.placeholder} />
      </View>
    );
  }
  const chip = lineupChip(data);
  if (!chip) return null;

  const shown = chip.kind === 'waiting' ? [] : pickCardScorers(data, 2);
  const others = otherScorersCount(data, shown.length);

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <Text style={styles.cap}>Marcatori probabili</Text>
        <View style={[styles.chip, chip.kind === 'official' ? styles.chipOk : chip.kind === 'estimate' ? styles.chipEst : styles.chipWait]}>
          <Text style={[styles.chipText, chip.kind === 'official' ? styles.chipTextOk : chip.kind === 'estimate' ? styles.chipTextEst : styles.chipTextWait]}>
            {chip.label}
          </Text>
        </View>
      </View>

      {chip.kind === 'waiting' ? (
        <Text style={styles.wait}>Disponibili quando escono le formazioni.</Text>
      ) : (
        <>
          <View style={styles.row}>
            {shown.map((p) => (
              <View
                key={String(p.player_id)}
                style={[styles.player, p.scored === true && styles.playerScored, chip.kind === 'estimate' && styles.playerEstimate]}
                accessible
                accessibilityLabel={scorerA11yLabel(p)}
              >
                <View style={[styles.avatar, p.scored === true && styles.avatarScored]}>
                  <Text style={[styles.avatarText, p.scored === true && styles.avatarTextScored]}>{initials(p.name)}</Text>
                </View>
                <View style={styles.who}>
                  <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {p.team} · {positionShort(p.position)}
                  </Text>
                </View>
                <Text style={[styles.pct, chip.kind === 'estimate' && styles.pctEstimate]}>{formatScorerPct(p.probability)}</Text>
              </View>
            ))}
          </View>
          {others > 0 ? <Text style={styles.more}>+ altri {others} · tocca per tutti</Text> : null}
        </>
      )}
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
    placeholder: { height: 40, borderRadius: radii.sm, backgroundColor: colors.track, opacity: 0.6 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cap: {
      fontFamily: fonts.bodyMedium,
      fontSize: fs(10),
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.inkMuted,
    },
    chip: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 2 },
    chipOk: { backgroundColor: colors.accentSoft },
    chipEst: { backgroundColor: 'rgba(230,184,77,0.16)' },
    chipWait: { backgroundColor: colors.track },
    chipText: { fontFamily: fonts.bodyBold, fontSize: fs(10) },
    chipTextOk: { color: colors.accentText },
    chipTextEst: { color: colors.warning },
    chipTextWait: { color: colors.inkMuted },
    wait: { fontFamily: fonts.body, fontSize: fs(11), color: colors.inkMuted },
    row: { flexDirection: 'row', gap: spacing.sm },
    player: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.track,
      padding: 8,
    },
    playerScored: { borderColor: colors.hit, backgroundColor: colors.hitBg },
    playerEstimate: { borderStyle: 'dashed' },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.line,
    },
    avatarScored: { backgroundColor: colors.hitBadge },
    avatarText: { fontFamily: fonts.bodyBold, fontSize: fs(10), color: colors.ink },
    avatarTextScored: { color: '#fff' },
    who: { flex: 1, minWidth: 0 },
    name: { fontFamily: fonts.bodyMedium, fontSize: fs(12), color: colors.ink },
    meta: { fontFamily: fonts.body, fontSize: fs(10), color: colors.inkMuted },
    pct: { fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.accentText },
    pctEstimate: { color: colors.warning },
    more: { fontFamily: fonts.body, fontSize: fs(11), color: colors.inkMuted },
  });
