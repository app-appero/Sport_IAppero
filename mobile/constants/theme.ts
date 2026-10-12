import { Platform } from 'react-native';

/**
 * Dark theme (pure black background) with one accent palette per sport: the
 * screen takes the colour of the sport being browsed (football green, tennis
 * yellow, ...). Brand cyan is kept for sport-less screens (`defaultPalette`).
 * The previous light theme lives in git history (commit 47dac3d).
 *
 * Adding a sport = adding a palette below (accent + on-accent colour).
 */
export type Palette = {
  /** Sport colour: fills (active pills, badges, bars) and accent text on black. */
  accent: string;
  accentDeep: string;
  /** Accent used for text. Same as `accent` on black; kept separate for a light theme. */
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

const base = {
  surface: '#000000',
  surfaceElevated: '#0F0F0F',
  line: '#262626',
  track: '#1B1B1B',
  gradient: ['#000000', '#000000'] as const,
  ink: '#F4F4F4',
  inkMuted: '#9B9B9B',
  infoBg: '#0F0F0F',
  hit: '#2F9E44',
  hitBg: '#08170E',
  hitBadge: '#1F8A4C',
  miss: '#C23B3B',
  missBg: '#1E0B0B',
  missBadge: '#C92A2A',
  warning: '#E6B84D',
  warnBg: '#2A2414',
  errorBg: '#1E0B0B',
};

/** Brand cyan — used outside a sport (not-found, fallbacks). */
export const defaultPalette: Palette = {
  ...base,
  accent: '#00E5FF',
  accentDeep: '#00B8D4',
  accentText: '#00E5FF',
  accentSoft: 'rgba(0,229,255,0.14)',
  onAccent: '#04202A',
  dot: '#00E5FF',
};

export const sportPalettes: Record<string, Palette> = {
  football: {
    ...base,
    accent: '#1FDC7C',
    accentDeep: '#12B862',
    accentText: '#1FDC7C',
    accentSoft: 'rgba(31,220,124,0.14)',
    onAccent: '#04210F',
    dot: '#1FDC7C',
  },
  tennis: {
    ...base,
    accent: '#FFD60A',
    accentDeep: '#E8B800',
    accentText: '#FFD60A',
    accentSoft: 'rgba(255,214,10,0.14)',
    onAccent: '#2A2000',
    dot: '#FFD60A',
  },
  basketball: {
    ...base,
    accent: '#FF8A3D',
    accentDeep: '#E8691A',
    accentText: '#FF8A3D',
    accentSoft: 'rgba(255,138,61,0.14)',
    onAccent: '#2A1202',
    dot: '#FF8A3D',
  },
};

export function paletteFor(sport?: string | null): Palette {
  return (sport && sportPalettes[sport]) || defaultPalette;
}

/** Native splash background; BootSplash must match it so the hand-off is seamless. */
export const splashBackground = '#000000';

/**
 * One knob for the whole app's type size: every fontSize/lineHeight goes through
 * `fs()`. 1 = the original sizes; lower it to shrink all text, raise it to grow it.
 */
export const TEXT_SCALE = 0.88;
export const fs = (size: number) => Math.round(size * TEXT_SCALE);

export const spacing = {
  xs: 5,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
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
