import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/constants/theme';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm },
  title: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 20 },
});
