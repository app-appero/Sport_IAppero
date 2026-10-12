import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { APP_NAME } from '@/constants/brand';
import { fonts, fs, spacing, type Palette } from '@/constants/theme';

type Props = {
  size?: 'sm' | 'md';
};

/**
 * Text wordmark, top-left, in the sport palette's ink with a brand-blue "IA"
 * (the PNG wordmark has dark letters, made for light backgrounds).
 */
export function BrandHeader({ size = 'md' }: Props) {
  const styles = useThemedStyles(makeStyles);
  const fontSize = fs(size === 'sm' ? 22 : 28);
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={APP_NAME}>
      <Text style={[styles.word, { fontSize, lineHeight: fontSize + 4 }]} maxFontSizeMultiplier={1.2}>
        Sport<Text style={styles.ia}>IA</Text>pperò
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      flexShrink: 1,
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    word: {
      fontFamily: fonts.bodyBold,
      color: colors.ink,
      letterSpacing: -0.5,
    },
    ia: { color: '#2A9BFF' },
  });
