import { Image, StyleSheet, View } from 'react-native';

import { APP_NAME, BRAND_WORDMARK } from '@/constants/brand';
import { spacing } from '@/constants/theme';

type Props = {
  size?: 'sm' | 'md';
};

/** Horizontal wordmark, top-left (not the square splash mark). */
export function BrandHeader({ size = 'md' }: Props) {
  const height = size === 'sm' ? 28 : 34;
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={APP_NAME}>
      <Image
        source={BRAND_WORDMARK}
        style={[styles.logo, { height, width: height * 3.0 }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  logo: {
    // Wordmark asset is ~3:1 — keep left-aligned in the header.
  },
});
