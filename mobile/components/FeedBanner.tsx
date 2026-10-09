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
    lines.push('Modalità compatibilità: /feed non ancora sul BFF deployato.');
  }
  if (meta.status === 'degraded') {
    lines.push('Feed parziale: un provider non è disponibile.');
  } else if (meta.status === 'empty') {
    lines.push('Nessun evento per i filtri selezionati.');
  }
  for (const w of meta.warnings ?? []) {
    if (!lines.includes(w)) lines.push(w);
  }
  if (lines.length === 0) return null;

  const tone = meta.status === 'degraded' || source === 'fallback' ? 'warn' : 'info';
  return (
    <View style={[styles.wrap, tone === 'warn' ? styles.warn : styles.info]}>
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
    backgroundColor: '#FFF4CE',
    borderColor: '#E6C200',
  },
  info: {
    backgroundColor: '#E7F2E4',
    borderColor: colors.line,
  },
  text: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 13 },
});
