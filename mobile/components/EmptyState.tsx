import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'empty' | 'error' | 'degraded';
};

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  tone = 'empty',
}: Props) {
  return (
    <View
      style={[
        styles.wrap,
        tone === 'error' && styles.errorWrap,
        tone === 'degraded' && styles.degradedWrap,
      ]}
      accessibilityRole="text"
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
  },
  errorWrap: {
    borderColor: '#F5C2C0',
    backgroundColor: '#FFF5F5',
  },
  degradedWrap: {
    borderColor: '#E6C200',
    backgroundColor: '#FFF4CE',
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkMuted, lineHeight: 20 },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: colors.brand,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: { fontFamily: fonts.bodyBold, color: colors.accent, fontSize: 14 },
});
