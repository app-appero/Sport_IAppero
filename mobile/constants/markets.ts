export type MarketOption = { label: string; value: string | undefined };

/** Known market chips for football (soccer-oracle keys). */
export const FOOTBALL_MARKETS: MarketOption[] = [
  { label: 'Tutti', value: undefined },
  { label: '1X2', value: 'h2h' },
  { label: 'Over/Under 2.5', value: 'under_over_2_5' },
  { label: 'Gol/No Gol', value: 'goal_no_goal' },
  { label: 'Doppia chance', value: 'dc' },
  { label: 'Over/Under 1.5', value: 'under_over_1_5' },
  { label: 'Over/Under 3.5', value: 'under_over_3_5' },
];

/** Known market chips for tennis. */
export const TENNIS_MARKETS: MarketOption[] = [
  { label: 'Tutti', value: undefined },
  { label: 'Match winner', value: 'match_winner' },
  { label: 'Primo set', value: 'first_set_winner' },
  { label: 'Totale game', value: 'total_games' },
  { label: 'Over/Under game', value: 'over_under_games' },
];

export function marketsForSport(sport: 'all' | 'football' | 'tennis'): MarketOption[] {
  if (sport === 'football') return FOOTBALL_MARKETS;
  if (sport === 'tennis') return TENNIS_MARKETS;
  const seen = new Set<string | undefined>();
  const merged: MarketOption[] = [];
  for (const opt of [...FOOTBALL_MARKETS, ...TENNIS_MARKETS]) {
    if (seen.has(opt.value)) continue;
    seen.add(opt.value);
    merged.push(opt);
  }
  return merged;
}

export function marketLabel(key: string): string {
  const all = [...FOOTBALL_MARKETS, ...TENNIS_MARKETS];
  return all.find((m) => m.value === key)?.label ?? key.replace(/_/g, ' ');
}
