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
 * family, strongest first, at most `limit`. `preferredMarket` (the active market chip)
 * goes first; `exclude` drops families already shown elsewhere (tennis winner block).
 */
export function topMarkets(
  predictions: UnifiedPrediction[],
  opts: { limit?: number; preferredMarket?: string; exclude?: string[] } = {},
): UnifiedPrediction[] {
  const { limit = 3, preferredMarket, exclude = [] } = opts;
  const best = new Map<string, UnifiedPrediction>();
  for (const p of predictions) {
    const family = marketFamily(p.prediction.type);
    if (exclude.includes(family)) continue;
    const current = best.get(family);
    if (!current || confidenceOf(p) > confidenceOf(current)) best.set(family, p);
  }
  const ranked = [...best.entries()].sort((a, b) => confidenceOf(b[1]) - confidenceOf(a[1]));
  if (preferredMarket) {
    const key = marketFamily(preferredMarket);
    const i = ranked.findIndex(([family]) => family === key);
    if (i > 0) ranked.unshift(...ranked.splice(i, 1));
  }
  return ranked.slice(0, limit).map(([, p]) => p);
}
