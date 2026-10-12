import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, radii, spacing, type Palette, fs } from '@/constants/theme';

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
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
  },
  errorWrap: {
    borderColor: colors.miss,
    backgroundColor: colors.errorBg,
  },
  degradedWrap: {
    borderColor: colors.warning,
    backgroundColor: colors.warnBg,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: fs(18), color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: fs(14), color: colors.inkMuted, lineHeight: fs(20) },
  action: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  actionText: { fontFamily: fonts.bodyBold, color: colors.onAccent, fontSize: fs(14) },
});
