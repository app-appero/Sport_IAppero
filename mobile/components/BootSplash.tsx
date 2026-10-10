import { Image, StyleSheet, View } from 'react-native';

import { APP_NAME, BRAND_SPLASH } from '@/constants/brand';
import { colors } from '@/constants/theme';

/** Full-screen boot / loading frame matching the native splash art. */
export function BootSplash() {
  return (
    <View style={styles.root} accessibilityLabel={`Caricamento ${APP_NAME}`}>
      <Image source={BRAND_SPLASH} style={styles.image} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  image: {
    width: '92%',
    maxWidth: 420,
    aspectRatio: 1,
  },
});
