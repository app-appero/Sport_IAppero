import type { Probability, UnifiedPrediction } from '../types/api.ts';

/**
 * Outcome rows of a market. When the engine sent no per-outcome probabilities the
 * single pick is shown with its confidence; with no confidence either there is
 * nothing to show (never a made-up 0%).
 */
export function outcomesFor(
  prediction: Pick<UnifiedPrediction, 'probabilities' | 'prediction'>,
): Probability[] {
  const list = prediction.probabilities ?? [];
  if (list.length > 0) return list;
  const c = prediction.prediction.confidence;
  if (typeof c !== 'number' || !Number.isFinite(c)) return [];
  return [
    {
      key: prediction.prediction.selection.id || 'sel',
      label: prediction.prediction.selection.name,
      value: c,
    },
  ];
}

/** "55%" for a 0..1 probability, "—" when it is missing or not finite. */
export function formatProbability(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
