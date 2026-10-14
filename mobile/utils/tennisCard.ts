import type { Participant, UnifiedPrediction } from '../types/api.ts';

export type TennisWinner = {
  /** Favourite first, the other player second. */
  names: [string, string];
  probs: [number, number];
  /** Index (0 = first listed participant) of the favourite, to read the real side. */
  favoriteIndex: 0 | 1;
};

const FIRST = new Set(['player_1', 'home', '1', 'first player', 'player 1']);
const SECOND = new Set(['player_2', 'away', '2', 'second player', 'player 2']);

function sideOf(pred: UnifiedPrediction, participants: Participant[]): 0 | 1 | null {
  const id = (pred.prediction.selection.id ?? '').trim().toLowerCase();
  const name = pred.prediction.selection.name.trim().toLowerCase();
  if (FIRST.has(id) || FIRST.has(name)) return 0;
  if (SECOND.has(id) || SECOND.has(name)) return 1;
  const names = participants.map((p) => p.name.trim().toLowerCase());
  const exact = names.findIndex((n) => n === name);
  if (exact === 0 || exact === 1) return exact;
  const partial = names.findIndex((n) => n.length > 0 && (n.includes(name) || name.includes(n)));
  return partial === 0 || partial === 1 ? partial : null;
}

/**
 * Two-way match winner for the tennis card: the model's pick with its probability and the
 * other player with the complement (the market is binary, `confidence` is P(pick)).
 * Null when the pick cannot be tied to one of the two players.
 */
export function resolveTennisWinner(
  pred: UnifiedPrediction,
  participants: Participant[],
): TennisWinner | null {
  const confidence = pred.prediction.confidence;
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) return null;
  if (participants.length < 2) return null;
  const side = sideOf(pred, participants);
  if (side === null) return null;
  const p = Math.max(0, Math.min(1, confidence));
  const other = (side === 0 ? 1 : 0) as 0 | 1;
  return {
    names: [participants[side].name, participants[other].name],
    probs: [p, 1 - p],
    favoriteIndex: side,
  };
}

/** "6-4 3-6" -> ["6–4", "3–6"]; a lone "2-1" -> ["2–1"]. */
export function setPills(sets: string): string[] {
  return sets
    .split(/\s+/)
    .map((s) => s.trim().replace('-', '–'))
    .filter((s) => /\d/.test(s));
}
