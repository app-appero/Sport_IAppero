import type {
  HistoryBreakdownEntity,
  HistoryBreakdownMarket,
  HistoryCounts,
  HistoryGroup,
  SettlementStatus,
} from '@/types/api';

export const STATUS_LABEL: Record<SettlementStatus, string> = {
  won: 'Presa',
  lost: 'Persa',
  void: 'Annullata',
  pending: 'In attesa',
  not_placed: 'Non piazzata',
  unknown: 'Da verificare',
};

const COUNT_KEYS = ['won', 'lost', 'void', 'pending', 'not_placed', 'unknown'] as const;

/** One card per market. Model name and version stay out of the screen. */
export function groupsByMarket(groups: HistoryGroup[]): HistoryGroup[] {
  const order: string[] = [];
  const merged = new Map<string, HistoryGroup>();
  for (const group of groups) {
    const current = merged.get(group.market);
    if (!current) {
      order.push(group.market);
      merged.set(group.market, { ...group, model_name: null, model_version: null });
      continue;
    }
    for (const key of COUNT_KEYS) current[key] += group[key];
    current.total += group.total;
    current.decided = current.won + current.lost;
    current.win_rate = current.decided > 0 ? current.won / current.decided : null;
  }
  return order.map((market) => merged.get(market)!);
}

/** "55%" or "n.d." when nothing is decided yet. */
export function formatRate(rate: number | null): string {
  return rate == null ? 'n.d.' : `${Math.round(rate * 100)}%`;
}

/** "6 prese su 11 decise" — the denominator is always spelled out. */
export function decidedLine(c: HistoryCounts): string {
  if (c.decided === 0) return 'Nessuna predizione ancora decisa';
  return `${c.won} ${c.won === 1 ? 'presa' : 'prese'} su ${c.decided} ${c.decided === 1 ? 'decisa' : 'decise'}`;
}

/** Other statuses, reported next to the rate but never counted as losses. */
export function othersLine(c: HistoryCounts): string {
  const parts: string[] = [];
  if (c.void) parts.push(`${c.void} ${c.void === 1 ? 'annullata' : 'annullate'}`);
  if (c.pending) parts.push(`${c.pending} in attesa`);
  if (c.not_placed) parts.push(`${c.not_placed} non ${c.not_placed === 1 ? 'piazzata' : 'piazzate'}`);
  if (c.unknown) parts.push(`${c.unknown} da verificare`);
  return parts.join(' · ');
}

/** Widths (0..1) for the stacked bar; empty when there is no data. */
export function barShares(c: HistoryCounts): { status: SettlementStatus; share: number }[] {
  if (c.total <= 0) return [];
  const order: SettlementStatus[] = ['won', 'lost', 'void', 'pending', 'not_placed', 'unknown'];
  return order
    .filter((s) => c[s] > 0)
    .map((s) => ({ status: s, share: c[s] / c.total }));
}

export function excludedNote(n: number): string | null {
  if (n <= 0) return null;
  return `${n} ${n === 1 ? 'predizione esclusa' : 'predizioni escluse'}: non verificabile come pubblicata prima dell'inizio della partita.`;
}

/** "03 ott" in Europe/Rome, or "—" when the kickoff is unknown. */
export function formatKickoffDay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Europe/Rome',
  })
    .format(d)
    .replace('.', '');
}

export const ENTITIES_PREVIEW = 5;

/** Teams/players of a competition: the first few, or all of them when expanded. Order comes from the server. */
export function visibleEntities<T>(entities: T[], expanded: boolean, limit = ENTITIES_PREVIEW): T[] {
  return expanded ? entities : entities.slice(0, limit);
}

/** "6 prese su 11 decise · 55%" for a team or a player. */
export function entityLine(e: Pick<HistoryBreakdownEntity, 'won' | 'decided' | 'win_rate'>): string {
  const base = decidedLine({ won: e.won, decided: e.decided } as HistoryCounts);
  return e.decided > 0 ? `${base} · ${formatRate(e.win_rate)}` : base;
}

/** Market types of one team/player in the server's order (best rate first): "Over/Under 2.5 67% · 1X2 50%". */
export function marketsLine(
  markets: HistoryBreakdownMarket[],
  label: (market: string) => string,
): string {
  return markets
    .filter((m) => m.decided > 0)
    .map((m) => `${label(m.market)} ${formatRate(m.win_rate)} (${m.won}/${m.decided})`)
    .join(' · ');
}
