export type MarketOption = { label: string; value: string | undefined };

/** Chip labels — keep short but complete (chips size to content). */
export const FOOTBALL_MARKETS: MarketOption[] = [
  { label: 'Tutti', value: undefined },
  { label: '1X2', value: 'h2h' },
  { label: 'O/U 2.5', value: 'under_over_2_5' },
  { label: 'Gol/No Gol', value: 'goal_no_goal' },
  { label: 'Doppia chance', value: 'dc' },
  { label: 'Cartellini', value: 'cards_line' },
  { label: 'O/U 1.5', value: 'under_over_1_5' },
  { label: 'O/U 3.5', value: 'under_over_3_5' },
];

export function predictionMatchesMarket(
  predictionType: string,
  market: string | undefined,
): boolean {
  if (!market) return true;
  if (predictionType === market) return true;
  if (market === 'cards_line' && predictionType.startsWith('cards_line_')) return true;
  return false;
}

export const TENNIS_MARKETS: MarketOption[] = [
  { label: 'Tutti', value: undefined },
  { label: 'Match winner', value: 'match_winner' },
  { label: 'Primo set', value: 'first_set_winner' },
  { label: 'Totale game', value: 'total_games' },
  { label: 'O/U game', value: 'over_under_games' },
];

export function marketsForSport(sport: 'football' | 'tennis'): MarketOption[] {
  return sport === 'tennis' ? TENNIS_MARKETS : FOOTBALL_MARKETS;
}

export function marketLabel(key: string): string {
  const display: Record<string, string> = {
    h2h: '1X2',
    under_over_2_5: 'Over/Under 2.5',
    under_over_1_5: 'Over/Under 1.5',
    under_over_3_5: 'Over/Under 3.5',
    goal_no_goal: 'Gol/No Gol',
    dc: 'Doppia chance',
    cards_line: 'Cartellini',
    cards: 'Cartellini',
    match_winner: 'Match winner',
    first_set_winner: 'Primo set',
    total_games: 'Totale game',
    over_under_games: 'Over/Under game',
  };
  if (display[key]) return display[key];
  if (key.startsWith('cards_line_')) {
    const line = key.replace('cards_line_', '').replace('_', '.');
    return `Cartellini ${line}`;
  }
  const all = [...FOOTBALL_MARKETS, ...TENNIS_MARKETS];
  return all.find((m) => m.value === key)?.label ?? key.replace(/_/g, ' ');
}
