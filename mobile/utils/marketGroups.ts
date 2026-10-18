/** One chip on the event screen: every line of the same kind (Under/Over 1.5, 2.5, …). */
export type MarketGroup = {
  id: string;
  label: string;
  order: number;
};

const GROUPS: { id: string; label: string; order: number; match: (type: string) => boolean }[] = [
  { id: 'h2h', label: '1X2', order: 10, match: (type) => type === 'h2h' },
  { id: 'dc', label: 'Doppia chance', order: 20, match: (type) => type === 'dc' },
  { id: 'under_over', label: 'Under/Over gol', order: 30, match: (type) => type.startsWith('under_over_') },
  { id: 'goal_no_goal', label: 'Gol/No Gol', order: 40, match: (type) => type === 'goal_no_goal' },
  { id: 'cards', label: 'Cartellini', order: 50, match: (type) => type.startsWith('cards_line') },
  { id: 'corners', label: 'Calci d’angolo', order: 60, match: (type) => type.startsWith('corners_line') },
  { id: 'match_winner', label: 'Match winner', order: 10, match: (type) => type === 'match_winner' },
  { id: 'first_set', label: 'Primo set', order: 20, match: (type) => type === 'first_set_winner' },
  {
    id: 'games',
    label: 'Game',
    order: 30,
    match: (type) => type === 'over_under_games' || type === 'total_games',
  },
];

export function marketGroup(type: string): MarketGroup {
  const found = GROUPS.find((group) => group.match(type));
  if (found) return { id: found.id, label: found.label, order: found.order };
  return { id: type, label: type.replace(/_/g, ' '), order: 80 };
}

/** 1.5 before 2.5 before 3.5, for line markets that share a group. */
export function lineSortKey(type: string): number {
  const match = type.match(/(\d+)_(\d+)$/);
  if (!match) return 0;
  return Number(match[1]) + Number(match[2]) / 10;
}

export function compareMarketTypes(a: string, b: string): number {
  const ga = marketGroup(a);
  const gb = marketGroup(b);
  if (ga.order !== gb.order) return ga.order - gb.order;
  const la = lineSortKey(a);
  const lb = lineSortKey(b);
  if (la !== lb) return la - lb;
  return a.localeCompare(b);
}

/** Groups that actually have a prediction, in display order, without duplicates. */
export function groupsFromTypes(types: string[]): MarketGroup[] {
  const byId = new Map<string, MarketGroup>();
  for (const type of types) {
    const group = marketGroup(type);
    if (!byId.has(group.id)) byId.set(group.id, group);
  }
  return [...byId.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}
