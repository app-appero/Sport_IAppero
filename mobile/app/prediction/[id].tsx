import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandHeader } from '@/components/BrandHeader';
import { EmptyState } from '@/components/EmptyState';
import { SportThemeProvider, useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { marketLabel } from '@/constants/markets';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';
import { usePredictionDetail } from '@/hooks/queries';
import { formatApiError } from '@/utils/formatApiError';
import { outcomeTone, scoreForMarket } from '@/utils/outcome';
import { selectionLabel } from '@/utils/selectionLabel';

function fmtPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function fmtEv(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const pct = value * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function fmtOdd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(2);
}

export default function PredictionDetailScreen() {
  const { sport } = useLocalSearchParams<{ sport?: string }>();
  return (
    <SportThemeProvider sport={sport ? String(sport) : undefined}>
      <PredictionDetail />
    </SportThemeProvider>
  );
}

function PredictionDetail() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const colors = useSportPalette();
  const styles = useThemedStyles(makeStyles);
  const selectedDate = date ? String(date) : undefined;
  const query = usePredictionDetail(String(id ?? ''), { date: selectedDate });

  const header = (
    <Stack.Screen
      options={{
        title: 'Predizione',
        headerBackTitle: 'Indietro',
        headerStyle: { backgroundColor: colors.surfaceElevated },
        headerTintColor: colors.ink,
        headerTitleStyle: { color: colors.ink },
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );

  if (query.isLoading && !query.data) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={colors.accentDeep} />
      </View>
    );
  }

  if ((query.isError && !query.data) || !query.data) {
    return (
      <View style={styles.errorWrap}>
        {header}
        <EmptyState
          title="Impossibile caricare la predizione"
          subtitle={formatApiError(query.error)}
          actionLabel="Riprova"
          onAction={() => query.refetch()}
          tone="error"
        />
      </View>
    );
  }

  const item = query.data;
  const tone = outcomeTone(item);
  const scoreLine = scoreForMarket(item.event, item.prediction.type);
  const recommendedKey = (item.prediction.selection.id || '').toLowerCase();
  const outcomes =
    item.probabilities.length > 0
      ? item.probabilities
      : [
          {
            key: item.prediction.selection.id || 'sel',
            label: item.prediction.selection.name,
            value: item.prediction.confidence ?? 0,
          },
        ];
  const pricing = item.pricing;
  const decision = item.decision;
  const hasExtras =
    pricing?.expected_value != null ||
    pricing?.odds_decimal != null ||
    pricing?.probability_edge != null ||
    decision?.code != null;

  return (
    <>
      {header}
      <ScrollView style={styles.list} contentContainerStyle={styles.content}>
        <BrandHeader size="sm" />
        <Text style={styles.kicker}>{marketLabel(item.prediction.type)}</Text>
        <Text style={styles.title}>{item.event.name}</Text>
        <Text style={styles.subtitle}>
          {item.event.competition?.name ?? 'Competizione'}
        </Text>
        {scoreLine ? (
          <Text style={styles.score}>Risultato · {scoreLine}</Text>
        ) : null}
        {tone ? (
          <Text style={styles.tone}>
            Esito consiglio · {tone === 'hit' ? 'Preso (V)' : 'Non preso (X)'}
          </Text>
        ) : null}

        <Text style={styles.section}>Esiti</Text>
        <View style={styles.board}>
          {outcomes.map((prob) => {
            const isRecommended =
              (prob.key || '').toLowerCase() === recommendedKey ||
              selectionLabel(prob.label).toLowerCase() ===
                selectionLabel(item.prediction.selection.name).toLowerCase();
            return (
              <View
                key={`${prob.key}-${prob.label}`}
                style={[styles.row, isRecommended && styles.rowHot]}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowLabel}>{selectionLabel(prob.label)}</Text>
                  {isRecommended ? (
                    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                      <Text style={styles.badgeText}>Consigliata</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.rowPct}>{fmtPct(prob.value)}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>Valore e quote</Text>
        {hasExtras ? (
          <View style={styles.board}>
            <InfoRow styles={styles} label="Decisione" value={decision?.code ?? '—'} />
            <InfoRow
              styles={styles}
              label="EV"
              value={fmtEv(pricing?.expected_value ?? null)}
            />
            <InfoRow
              styles={styles}
              label="Edge probabilità"
              value={fmtPct(pricing?.probability_edge ?? null)}
            />
            <InfoRow
              styles={styles}
              label="Quota"
              value={fmtOdd(pricing?.odds_decimal ?? null)}
            />
            <InfoRow
              styles={styles}
              label="Quota fair"
              value={fmtOdd(pricing?.fair_odds ?? null)}
            />
            {decision?.reason ? (
              <Text style={styles.reason}>{decision.reason}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.muted}>
            Per questo mercato il provider non ha inviato EV o quote. Restano le
            probabilità degli esiti sopra.
          </Text>
        )}
      </ScrollView>
    </>
  );
}

function InfoRow({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    errorWrap: {
      flex: 1,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    list: { flex: 1, backgroundColor: colors.surface },
    content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
    kicker: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(12),
      color: colors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: spacing.sm,
    },
    title: { fontFamily: fonts.bodyBold, fontSize: fs(22), color: colors.ink },
    subtitle: { fontFamily: fonts.body, fontSize: fs(14), color: colors.inkMuted },
    score: { fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.ink },
    tone: { fontFamily: fonts.bodyMedium, fontSize: fs(13), color: colors.accentText },
    section: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(13),
      color: colors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: spacing.md,
    },
    board: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      gap: spacing.sm,
    },
    rowHot: { backgroundColor: colors.accentSoft },
    rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    rowLabel: { fontFamily: fonts.bodyMedium, fontSize: fs(15), color: colors.ink },
    rowPct: { fontFamily: fonts.bodyBold, fontSize: fs(16), color: colors.ink },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    badgeText: {
      fontFamily: fonts.bodyBold,
      fontSize: fs(10),
      color: colors.onAccent,
      textTransform: 'uppercase',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    infoLabel: { fontFamily: fonts.body, fontSize: fs(14), color: colors.inkMuted },
    infoValue: { fontFamily: fonts.bodyBold, fontSize: fs(15), color: colors.ink },
    reason: {
      fontFamily: fonts.body,
      fontSize: fs(13),
      color: colors.inkMuted,
      padding: spacing.md,
    },
    muted: { fontFamily: fonts.body, fontSize: fs(14), color: colors.inkMuted },
  });
