import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useSportPalette, useThemedStyles } from '@/components/SportTheme';
import { fonts, fs, type Palette } from '@/constants/theme';

/** "Affidabilità ridotta": one filled signal bar out of three, amber. */
export function LowReliabilityBadge() {
  const colors = useSportPalette();
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={styles.pill}
      accessible
      accessibilityLabel="Affidabilità ridotta: previsione da usare con cautela"
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden>
        <Rect x={3} y={15} width={4} height={6} rx={1} fill={colors.warning} />
        <Rect x={10} y={10} width={4} height={11} rx={1} fill={colors.warning} fillOpacity={0.3} />
        <Rect x={17} y={4} width={4} height={17} rx={1} fill={colors.warning} fillOpacity={0.3} />
      </Svg>
      <Text style={styles.text}>Affidabilità ridotta</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingLeft: 10,
      paddingRight: 14,
      borderRadius: 999,
      backgroundColor: colors.warnBg,
    },
    text: { fontFamily: fonts.bodyBold, fontSize: fs(13), color: colors.warning },
  });
