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

export function scorerA11yLabel(player: ScorerPlayer): string {
  const pct = Math.round(Math.max(0, Math.min(1, player.probability)) * 100);
  const scored = player.scored === true ? ', ha segnato' : '';
  return `${player.name}, ${positionLong(player.position)}, ${pct} percento${scored}`;
}

/** La sezione sparisce per le competizioni fuori dal mercato (es. Champions League). */
export function isScorersUnsupported(data: { status?: string } | undefined): boolean {
  return data?.status === 'unsupported';
}

/** Si rinfresca solo mentre si aspetta la formazione ufficiale. */
export function shouldPollScorers(data: { available: boolean; status?: string } | undefined): boolean {
  return Boolean(data) && !data!.available && data!.status !== 'unsupported';
}
