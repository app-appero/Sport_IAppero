import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { defaultPalette, paletteFor, type Palette } from '@/constants/theme';

const SportThemeContext = createContext<Palette>(defaultPalette);

/** Gives every descendant the colour palette of `sport` (brand cyan if unknown). */
export function SportThemeProvider({
  sport,
  children,
}: {
  sport?: string | null;
  children: ReactNode;
}) {
  const palette = useMemo(() => paletteFor(sport), [sport]);
  return <SportThemeContext.Provider value={palette}>{children}</SportThemeContext.Provider>;
}

export function useSportPalette(): Palette {
  return useContext(SportThemeContext);
}

/** Build a StyleSheet from the current sport palette. Pass a module-level factory. */
export function useThemedStyles<T>(factory: (palette: Palette) => T): T {
  const palette = useContext(SportThemeContext);
  return useMemo(() => factory(palette), [factory, palette]);
}
