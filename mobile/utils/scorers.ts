import type { ScorerPlayer } from '../types/api.ts';

/** Smallest bar width (share of the track) so a tiny probability stays visible. */
export const MIN_BAR_RATIO = 0.06;

/** 0.31 -> "31%" (rounded to the integer, clamped to 0..100). */
export function formatScorerPct(probability: number): string {
  if (!Number.isFinite(probability)) return '—';
  return `${Math.round(Math.max(0, Math.min(1, probability)) * 100)}%`;
}

/** Short role pill: F -> ATT, M -> CEN, D -> DIF. */
export function positionShort(position: string | null | undefined): string {
  switch ((position ?? '').toUpperCase()) {
    case 'F':
      return 'ATT';
    case 'M':
      return 'CEN';
    case 'D':
      return 'DIF';
    case 'G':
      return 'POR';
    default:
      return '—';
  }
}

/** Spoken role for accessibility labels. */
export function positionLong(position: string | null | undefined): string {
  switch ((position ?? '').toUpperCase()) {
    case 'F':
      return 'attaccante';
    case 'M':
      return 'centrocampista';
    case 'D':
      return 'difensore';
    case 'G':
      return 'portiere';
    default:
      return 'ruolo non disponibile';
  }
}

/** Bar width as a 0..1 ratio of the track: probability / max shown, never below the minimum. */
export function scorerBarRatio(probability: number, maxProbability: number): number {
  if (!(maxProbability > 0) || !Number.isFinite(probability)) return MIN_BAR_RATIO;
  const ratio = Math.min(1, Math.max(0, probability) / maxProbability);
  return Math.max(MIN_BAR_RATIO, ratio);
}

export function maxProbability(players: Pick<ScorerPlayer, 'probability'>[]): number {
  return players.reduce((m, p) => (p.probability > m ? p.probability : m), 0);
}

export function scorerA11yLabel(player: ScorerPlayer, variant: 'scorers' | 'cards' = 'scorers'): string {
  const pct = Math.round(Math.max(0, Math.min(1, player.probability)) * 100);
  const hit =
    variant === 'cards'
      ? player.booked === true
        ? ', ammonito'
        : ''
      : player.scored === true
        ? ', ha segnato'
        : '';
  return `${player.name}, ${positionLong(player.position)}, ${pct} percento${hit}`;
}

/** La sezione sparisce per le competizioni fuori dal mercato (es. Champions League). */
export function isScorersUnsupported(data: { status?: string } | undefined): boolean {
  return data?.status === 'unsupported';
}

/** Si rinfresca solo mentre si aspetta la formazione ufficiale. */
export function shouldPollScorers(data: { available: boolean; status?: string } | undefined): boolean {
  return Boolean(data) && !data!.available && data!.status !== 'unsupported';
}

/** "A. Ferrero" -> "AF", "Lautaro Martinez" -> "LM", "Pelé" -> "P". */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

type ScorersLike = {
  available: boolean;
  status?: string;
  lineup_type?: string | null;
  teams: { top: ScorerPlayer[]; players: ScorerPlayer[] }[];
};

/**
 * The few players a match card shows: the best of each team, then the next most
 * likely overall, at most `limit`, strongest first. Empty unless the data is ready.
 */
export function pickCardScorers(data: ScorersLike | undefined, limit = 2): ScorerPlayer[] {
  if (!data || !data.available || data.status === 'unsupported') return [];
  const byProb = (a: ScorerPlayer, b: ScorerPlayer) => b.probability - a.probability;
  const pool = data.teams.map((t) => [...(t.top.length ? t.top : t.players)].sort(byProb));
  const chosen: ScorerPlayer[] = [];
  for (const team of pool) {
    if (team[0] && chosen.length < limit) chosen.push(team[0]);
  }
  const rest = pool.flatMap((team) => team.slice(1)).sort(byProb);
  for (const player of rest) {
    if (chosen.length >= limit) break;
    chosen.push(player);
  }
  return chosen.sort(byProb);
}

/** Players not shown on the card, for the "+ altri N" line. */
export function otherScorersCount(data: ScorersLike | undefined, shown: number): number {
  if (!data) return 0;
  const total = data.teams.reduce((n, t) => n + (t.players.length || t.top.length), 0);
  return Math.max(0, total - shown);
}

export type LineupChip = { kind: 'official' | 'estimate' | 'waiting'; label: string };

/** State chip next to the scorers title; null when the block must not be shown at all. */
export function lineupChip(data: ScorersLike | undefined): LineupChip | null {
  if (!data || data.status === 'unsupported') return null;
  if (!data.available || data.teams.length === 0) return { kind: 'waiting', label: 'In attesa' };
  const type = (data.lineup_type ?? 'official').toLowerCase();
  return type === 'official'
    ? { kind: 'official', label: 'Ufficiali' }
    : { kind: 'estimate', label: 'Stima' };
}
