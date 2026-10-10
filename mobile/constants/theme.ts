import { Platform } from 'react-native';

/**
 * Brand theme aligned with Sport IApperò splash/logo art:
 * deep navy void + electric cyan (IA) + lime tennis accent.
 */
export const colors = {
  brand: '#00E5FF',
  brandSoft: '#33EBFF',
  accent: '#00E5FF',
  accentDeep: '#00B8D4',
  /** Secondary accent from tennis ball in logo art */
  lime: '#C8F135',
  ink: '#F4F8FF',
  inkMuted: '#8FA3B8',
  surface: '#050A14',
  surfaceElevated: '#0C1524',
  line: '#1A2A3D',
  danger: '#F87171',
  football: '#1B6B8A',
  tennis: '#A8D000',
  warning: '#E6B84D',
  hit: '#2F9E44',
  miss: '#C92A2A',
  hitBg: '#0F2418',
  missBg: '#2A1515',
  warnBg: '#2A2414',
  errorBg: '#2A1515',
  infoBg: '#0A1C2A',
  /** Text on cyan / brand fills */
  onAccent: '#050A14',
};

export const gradients = {
  screen: ['#050A14', '#0A1422', '#061820'] as const,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
};

const webFonts = {
  display: 'BebasNeue_400Regular, Impact, Haettenschweiler, Arial Black, sans-serif',
  body: 'DMSans_400Regular, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  bodyMedium: 'DMSans_500Medium, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  bodyBold: 'DMSans_700Bold, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
};

const nativeFonts = {
  display: 'BebasNeue_400Regular',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export const fonts = Platform.OS === 'web' ? webFonts : nativeFonts;
