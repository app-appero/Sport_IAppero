import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { APP_NAME, BRAND_SPLASH } from '@/constants/brand';
import { fonts, fs, paletteFor, sportPalettes, splashBackground } from '@/constants/theme';

const MARK_SIZE = 280; // keep in sync with expo-splash-screen imageWidth (app.config.ts)
const ink = paletteFor('football').ink;
const inkMuted = paletteFor('football').inkMuted;
// One dot per sport colour — the loader previews the app's palette.
const DOTS = [sportPalettes.football.accent, sportPalettes.tennis.accent, sportPalettes.basketball.accent];

function Dot({ color, delay }: { color: string; delay: number }) {
  const o = useSharedValue(0.25);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 380 }), withTiming(0.25, { duration: 380 })), -1),
    );
  }, [o, delay]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.8 + o.value * 0.3 }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/** Full-screen boot / loading frame: same light background and mark as the native splash. */
export function BootSplash() {
  return (
    <Animated.View
      exiting={FadeOut.duration(220)}
      style={styles.root}
      accessibilityLabel={`Caricamento ${APP_NAME}`}
    >
      <LinearGradient
        colors={[splashBackground, '#E9F6EE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image source={BRAND_SPLASH} style={styles.mark} resizeMode="contain" />
      <View style={styles.footer}>
        <Text style={styles.word} maxFontSizeMultiplier={1.1}>
          Sport<Text style={styles.ia}>IA</Text>pperò
        </Text>
        <Text style={styles.tag}>Predizioni sportive</Text>
        <View style={styles.dots}>
          {DOTS.map((c, i) => (
            <Dot key={c} color={c} delay={i * 160} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: splashBackground,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  // Centred exactly like the native splash image, so nothing jumps on hand-off.
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  footer: {
    position: 'absolute',
    bottom: '9%',
    alignItems: 'center',
    gap: 6,
  },
  word: { fontFamily: fonts.bodyBold, fontSize: fs(30), color: ink, letterSpacing: -0.5 },
  ia: { color: '#0A8CFF' },
  tag: { fontFamily: fonts.body, fontSize: fs(13), color: inkMuted },
  dots: { flexDirection: 'row', gap: 8, marginTop: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
