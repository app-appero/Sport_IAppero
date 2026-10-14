import { StyleSheet, View } from 'react-native';

import { useSportPalette } from '@/components/SportTheme';
import type { OutcomeTone } from '@/utils/outcome';

type Props = {
  tone: OutcomeTone;
  size?: number;
};

/**
 * Settled outcome as colour only (green hit, red miss) — no V/X letters.
 * Renders nothing before the match is settled.
 */
export function OutcomeDot({ tone, size = 10 }: Props) {
  const colors = useSportPalette();
  if (!tone) return null;
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone === 'hit' ? colors.hit : colors.missBadge,
        },
      ]}
      accessible
      accessibilityLabel={tone === 'hit' ? 'Esito positivo' : 'Esito negativo'}
    />
  );
}

const styles = StyleSheet.create({
  dot: { flexShrink: 0 },
});
