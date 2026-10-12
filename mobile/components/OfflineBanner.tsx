import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';

export function OfflineBanner({ text }: { text: string | null }) {
  const styles = useThemedStyles(makeStyles);
  if (!text) return null;
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={styles.dot} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.sm,
      padding: spacing.sm,
      backgroundColor: colors.warnBg,
      borderColor: colors.warning,
    },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warning },
    text: { flex: 1, fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: fs(13) },
  });
