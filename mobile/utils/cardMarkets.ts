import type { UnifiedPrediction } from '../types/api.ts';

/** "cards_line_4_5" and "cards_line_5_5" are lines of one market family. */
export function marketFamily(type: string): string {
  return type.startsWith('cards_line_') ? 'cards_line' : type;
}

function confidenceOf(p: UnifiedPrediction): number {
  const c = p.prediction.confidence;
  return typeof c === 'number' && Number.isFinite(c) ? c : -1;
}

/**
 * The predictions a match card shows as circles: the most confident one per market
 * family (or per market type with `byFamily: false`), strongest first, at most `limit`. `preferredMarket` (the active market chip)
 * goes first; `exclude` drops families already shown elsewhere (tennis winner block).
 */
export function topMarkets(
  predictions: UnifiedPrediction[],
  opts: { limit?: number; preferredMarket?: string; exclude?: string[]; byFamily?: boolean } = {},
): UnifiedPrediction[] {
  const { limit = 3, preferredMarket, exclude = [], byFamily = true } = opts;
  const best = new Map<string, UnifiedPrediction>();
  for (const p of predictions) {
    const family = marketFamily(p.prediction.type);
    if (exclude.includes(family)) continue;
    // byFamily=false keeps every market type (each cards line separately); one best per type.
    const key = byFamily ? family : p.prediction.type;
    const current = best.get(key);
    if (!current || confidenceOf(p) > confidenceOf(current)) best.set(key, p);
  }
  const ranked = [...best.entries()].sort((a, b) => confidenceOf(b[1]) - confidenceOf(a[1]));
  if (preferredMarket) {
    const key = byFamily ? marketFamily(preferredMarket) : preferredMarket;
    const i = ranked.findIndex(([k]) => k === key || (!byFamily && marketFamily(k) === marketFamily(preferredMarket)));
    if (i > 0) ranked.unshift(...ranked.splice(i, 1));
  }
  return ranked.slice(0, limit).map(([, p]) => p);
}
