import { Platform } from 'react-native';

/**
 * Light theme with one palette per sport: the screen takes the colour of the
 * sport being browsed (football green, tennis yellow, ...). Brand cyan is kept
 * for sport-less screens (`defaultPalette`).
 *
 * Adding a sport = adding a palette below (accent, soft backgrounds, ink).
 */
export type Palette = {
  /** Fill colour for active pills, badges, bars (never for small text on white). */
  accent: string;
  accentDeep: string;
  /** Darker accent that reads as text on white / tinted surfaces (>= 4.5:1). */
  accentText: string;
  accentSoft: string;
  /** Text on accent fills. */
  onAccent: string;
  ink: string;
  inkMuted: string;
  /** Page background (first stop of `gradient`). */
  surface: string;
  /** Cards and controls. */
  surfaceElevated: string;
  line: string;
  /** Bar tracks, inactive/past chips. */
  track: string;
  gradient: readonly [string, string];
  /** Colour of the sport's dot in the sport rail. */
  dot: string;
  hit: string;
  hitBg: string;
  hitBadge: string;
  miss: string;
  missBg: string;
  missBadge: string;
  warning: string;
  warnBg: string;
  errorBg: string;
  infoBg: string;
};

const status = {
  hit: '#2F9E44',
  hitBg: '#E3F7EA',
  hitBadge: '#1F8A4C',
  miss: '#D64545',
  missBg: '#FDE8E8',
  missBadge: '#C92A2A',
  warning: '#8A5A00',
  warnBg: '#FFF4D6',
  errorBg: '#FDE8E8',
};

/** Brand cyan — used outside a sport (not-found, fallbacks). */
export const defaultPalette: Palette = {
  accent: '#00E5FF',
  accentDeep: '#00B8D4',
  accentText: '#006E85',
  accentSoft: 'rgba(0,229,255,0.16)',
  onAccent: '#04202A',
  ink: '#0A1A2A',
  inkMuted: '#4A6070',
  surface: '#F4FAFD',
  surfaceElevated: '#FFFFFF',
  line: '#CFE3EC',
  track: '#E2EEF3',
  gradient: ['#F4FAFD', '#E5F3F9'],
  dot: '#0A8CFF',
  infoBg: '#E2EEF3',
  ...status,
};

export const sportPalettes: Record<string, Palette> = {
  football: {
    accent: '#1FDC7C',
    accentDeep: '#12B862',
    accentText: '#0B7A43',
    accentSoft: 'rgba(31,220,124,0.16)',
    onAccent: '#04210F',
    ink: '#0F2A1E',
    inkMuted: '#4A6A5B',
    surface: '#F3FBF6',
    surfaceElevated: '#FFFFFF',
    line: '#CFE5D8',
    track: '#E1EEE6',
    gradient: ['#F3FBF6', '#E6F5EC'],
    dot: '#0E9F57',
    infoBg: '#E1EEE6',
    ...status,
  },
  tennis: {
    accent: '#FFD60A',
    accentDeep: '#E8B800',
    accentText: '#7A5F00',
    accentSoft: 'rgba(255,214,10,0.22)',
    onAccent: '#2A2000',
    ink: '#2A2000',
    inkMuted: '#695A1E',
    surface: '#FFFBEA',
    surfaceElevated: '#FFFFFF',
    line: '#EADFA9',
    track: '#F5EDC8',
    gradient: ['#FFFBEA', '#FFF3C4'],
    dot: '#C9A100',
    infoBg: '#F5EDC8',
    ...status,
  },
  basketball: {
    accent: '#FF8A3D',
    accentDeep: '#E8691A',
    accentText: '#B04508',
    accentSoft: 'rgba(255,138,61,0.16)',
    onAccent: '#2A1202',
    ink: '#2A1405',
    inkMuted: '#7A4B2C',
    surface: '#FFF7F0',
    surfaceElevated: '#FFFFFF',
    line: '#F0D3BE',
    track: '#FBE4D3',
    gradient: ['#FFF7F0', '#FFEBDC'],
    dot: '#E8691A',
    infoBg: '#FBE4D3',
    ...status,
  },
};

export function paletteFor(sport?: string | null): Palette {
  return (sport && sportPalettes[sport]) || defaultPalette;
}

/** Dark navy of the native splash art (BootSplash must match it). */
export const splashBackground = '#050A14';

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
  pill: 999,
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
