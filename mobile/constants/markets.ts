export type MarketOption = { label: string; value: string | undefined };

/** Known market chips for football (soccer-oracle keys). */
export const FOOTBALL_MARKETS: MarketOption[] = [
  { label: 'Tutti i mercati', value: undefined },
  { label: '1X2', value: 'h2h' },
  { label: 'Over/Under 2.5', value: 'under_over_2_5' },
  { label: 'Gol/No Gol', value: 'goal_no_goal' },
  { label: 'Doppia chance', value: 'dc' },
  { label: 'Cartellini', value: 'cards_line' },
  { label: 'Over/Under 1.5', value: 'under_over_1_5' },
  { label: 'Over/Under 3.5', value: 'under_over_3_5' },
];

/** One chip for all cards lines (3.5 / 4.5 / 5.5 / 6.5). */
export function predictionMatchesMarket(
  predictionType: string,
  market: string | undefined,
): boolean {
  if (!market) return true;
  if (predictionType === market) return true;
  if (market === 'cards_line' && predictionType.startsWith('cards_line_')) return true;
  return false;
}

/** Known market chips for tennis. */
export const TENNIS_MARKETS: MarketOption[] = [
  { label: 'Tutti i mercati', value: undefined },
  { label: 'Match winner', value: 'match_winner' },
  { label: 'Primo set', value: 'first_set_winner' },
  { label: 'Totale game', value: 'total_games' },
  { label: 'Over/Under game', value: 'over_under_games' },
];

export function marketsForSport(sport: 'football' | 'tennis'): MarketOption[] {
  return sport === 'tennis' ? TENNIS_MARKETS : FOOTBALL_MARKETS;
}

export function marketLabel(key: string): string {
  const all = [...FOOTBALL_MARKETS, ...TENNIS_MARKETS];
  const known = all.find((m) => m.value === key)?.label;
  if (known) return known;
  if (key.startsWith('cards_line_')) {
    const line = key.replace('cards_line_', '').replace('_', '.');
    return `Cartellini ${line}`;
  }
  return key.replace(/_/g, ' ');
}
