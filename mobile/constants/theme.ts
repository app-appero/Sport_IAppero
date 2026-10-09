import { Platform } from 'react-native';

/** Dark theme — charcoal / forest with lime accent (Sport IApperò). */
export const colors = {
  brand: '#C8F135',
  brandSoft: '#9BC41A',
  accent: '#C8F135',
  accentDeep: '#A8D000',
  ink: '#F2F5F0',
  inkMuted: '#9AA89F',
  surface: '#0E1411',
  surfaceElevated: '#1A221D',
  line: '#2C3831',
  danger: '#F87171',
  football: '#3D7A5C',
  tennis: '#3B7EA6',
  warning: '#E6B84D',
  hit: '#2F9E44',
  miss: '#C92A2A',
  hitBg: '#14261A',
  missBg: '#2A1515',
  warnBg: '#2A2414',
  errorBg: '#2A1515',
  infoBg: '#15241C',
  /** Text on lime / brand fills */
  onAccent: '#0E1411',
};

export const gradients = {
  screen: ['#0E1411', '#121A16', '#0B1A14'] as const,
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
