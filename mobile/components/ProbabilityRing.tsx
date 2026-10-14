import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { fonts, fs } from '@/constants/theme';

type Props = {
  /** 0..1; null draws an empty ring with a dash. */
  value: number | null;
  /** Arc colour (accent, or the hit/miss colour once settled). */
  color: string;
  trackColor: string;
  textColor: string;
  size?: number;
  stroke?: number;
};

/** Circular percentage: an arc over a track, the number in the middle. */
export function ProbabilityRing({
  value,
  color,
  trackColor,
  textColor,
  size = 52,
  stroke = 5,
}: Props) {
  const ratio = value == null || !Number.isFinite(value) ? 0 : Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={value == null ? 'Probabilità non disponibile' : `${Math.round(ratio * 100)} percento`}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        {ratio > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - ratio)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.text, { color: textColor }]} allowFontScaling={false}>
          {value == null ? '—' : `${Math.round(ratio * 100)}%`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.bodyBold, fontSize: fs(13) },
});
