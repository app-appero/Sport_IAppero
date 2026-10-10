import { Image, StyleSheet, View } from 'react-native';

import { APP_NAME, BRAND_LOGO } from '@/constants/brand';
import { spacing } from '@/constants/theme';

type Props = {
  /** Compact header mark vs larger splash-style mark. */
  size?: 'sm' | 'md';
};

/** In-app logo (soccer + tennis art with Sport IApperò wordmark). */
export function BrandHeader({ size = 'md' }: Props) {
  const height = size === 'sm' ? 52 : 72;
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={APP_NAME}>
      <Image source={BRAND_LOGO} style={[styles.logo, { height }]} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logo: {
    width: '100%',
    maxWidth: 280,
  },
});
