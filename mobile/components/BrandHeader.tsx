import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { APP_NAME } from '@/constants/brand';
import { fonts, fs, spacing, type Palette } from '@/constants/theme';

type Props = {
  size?: 'sm' | 'md';
};

/**
 * Text wordmark, top-left. The PNG wordmark has near-white letters (made for the
 * old dark theme) and disappears on light backgrounds, so the light theme draws
 * it as text with the brand-blue "IA".
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
      width: '100%',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    word: {
      fontFamily: fonts.bodyBold,
      color: colors.ink,
      letterSpacing: -0.5,
    },
    ia: { color: '#0A8CFF' },
  });
