import type { UnifiedPrediction } from '../types/api.ts';
import { decisionCode } from './decisionFilter.ts';

/** "cards_line_4_5" and "cards_line_5_5" are lines of one market family. */
export function marketFamily(type: string): string {
  return type.startsWith('cards_line_') ? 'cards_line' : type;
}

/** Play first, then Borderline, then No bet; anything else (no decision from the provider) last. */
export function decisionRank(p: Pick<UnifiedPrediction, 'decision'>): number {
  const code = decisionCode(p.decision?.code);
  return code === 'PLAY' ? 0 : code === 'BORDERLINE' ? 1 : code === 'NO BET' ? 2 : 3;
}

function confidenceOf(p: UnifiedPrediction): number {
  const c = p.prediction.confidence;
  return typeof c === 'number' && Number.isFinite(c) ? c : -1;
}

/**
 * The predictions a match card shows as circles: the most confident one per market
 * family (or per market type with `byFamily: false`), strongest first (or by decision state with `byDecision`), at most `limit`. `preferredMarket` (the active market chip)
 * goes first; `exclude` drops families already shown elsewhere (tennis winner block).
 */
export function topMarkets(
  predictions: UnifiedPrediction[],
  opts: { limit?: number; preferredMarket?: string; exclude?: string[]; byFamily?: boolean; byDecision?: boolean } = {},
): UnifiedPrediction[] {
  const { limit = 3, preferredMarket, exclude = [], byFamily = true, byDecision = false } = opts;
  const best = new Map<string, UnifiedPrediction>();
  for (const p of predictions) {
    const family = marketFamily(p.prediction.type);
    if (exclude.includes(family)) continue;
    // byFamily=false keeps every market type (each cards line separately); one best per type.
    const key = byFamily ? family : p.prediction.type;
    const current = best.get(key);
    if (!current || confidenceOf(p) > confidenceOf(current)) best.set(key, p);
  }
  // byDecision: Play before Borderline before No bet, strongest first inside each state.
  const ranked = [...best.entries()].sort((a, b) => {
    if (byDecision) {
      const d = decisionRank(a[1]) - decisionRank(b[1]);
      if (d !== 0) return d;
    }
    return confidenceOf(b[1]) - confidenceOf(a[1]);
  });
  if (preferredMarket) {
    const key = byFamily ? marketFamily(preferredMarket) : preferredMarket;
    const i = ranked.findIndex(([k]) => k === key || (!byFamily && marketFamily(k) === marketFamily(preferredMarket)));
    if (i > 0) ranked.unshift(...ranked.splice(i, 1));
  }
  return ranked.slice(0, limit).map(([, p]) => p);
}
