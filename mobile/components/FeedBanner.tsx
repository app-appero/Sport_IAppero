import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';
import type { FeedMeta } from '@/types/api';

export function FeedBanner({
  meta,
  source,
}: {
  meta?: FeedMeta;
  source?: 'feed' | 'fallback';
}) {
  if (!meta) return null;
  const lines: string[] = [];

  if (source === 'fallback') {
    lines.push('Modalità compatibilità: feed ricostruito dagli endpoint per sport.');
  }

  if (meta.status === 'unavailable') {
    lines.push('Feed non disponibile: entrambi i provider sono offline.');
  } else if (meta.status === 'degraded') {
    const down = (meta.providers ?? [])
      .filter((p) => p.status !== 'ok' && p.status !== 'empty')
      .map((p) => p.provider);
    lines.push(
      down.length
        ? `Feed parziale: ${down.join(', ')} non disponibile.`
        : 'Feed parziale: un provider non è disponibile.',
    );
  } else if (meta.status === 'empty') {
    lines.push('Nessun evento per i filtri selezionati.');
  }

  for (const w of meta.warnings ?? []) {
    if (!lines.includes(w)) lines.push(w);
  }
  if (lines.length === 0) return null;

  const tone =
    meta.status === 'unavailable'
      ? 'error'
      : meta.status === 'degraded' || source === 'fallback'
        ? 'warn'
        : 'info';

  return (
    <View
      style={[
        styles.wrap,
        tone === 'warn' ? styles.warn : tone === 'error' ? styles.error : styles.info,
      ]}
      accessibilityRole="text"
    >
      {lines.map((line) => (
        <Text key={line} style={styles.text}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: 4,
    marginBottom: spacing.sm,
  },
  warn: {
    backgroundColor: colors.warnBg,
    borderColor: colors.warning,
  },
  error: {
    backgroundColor: colors.errorBg,
    borderColor: colors.miss,
  },
  info: {
    backgroundColor: colors.infoBg,
    borderColor: colors.line,
  },
  text: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13 },
});
