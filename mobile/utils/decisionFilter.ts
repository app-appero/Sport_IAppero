import type { FeedItem, UnifiedPrediction } from '../types/api.ts';

/** Day-list decision filter. `all` leaves every prediction on the card. */
export type DecisionFilter = 'all' | 'PLAY' | 'BORDERLINE' | 'NO BET';

export const DECISION_FILTERS: { label: string; value: DecisionFilter }[] = [
  { label: 'Tutti', value: 'all' },
  { label: 'Play', value: 'PLAY' },
  { label: 'Borderline', value: 'BORDERLINE' },
  { label: 'No bet', value: 'NO BET' },
];

/** One plain sentence for the open filter, told only through the odds. */
export function decisionHint(filter: DecisionFilter): string {
  if (filter === 'PLAY') return 'Play: la quota paga più di quanto vale la giocata.';
  if (filter === 'BORDERLINE') return 'Borderline: la quota paga poco di più, il vantaggio è piccolo.';
  if (filter === 'NO BET') return 'No bet: la quota paga meno di quanto vale la giocata.';
  return 'Play paga di più, Borderline appena di più, No bet paga meno.';
}

/** Canonical PLAY / BORDERLINE / NO BET, or null when the provider sent something else. */
export function decisionCode(code: string | null | undefined): Exclude<DecisionFilter, 'all'> | null {
  if (!code) return null;
  const key = code.trim().toUpperCase().replace(/[_-]+/g, ' ');
  if (key === 'PLAY') return 'PLAY';
  if (key === 'BORDERLINE') return 'BORDERLINE';
  if (key === 'NO BET' || key === 'NOBET') return 'NO BET';
  return null;
}

export function parseDecisionFilter(value: string | null | undefined): DecisionFilter {
  if (value === 'PLAY' || value === 'BORDERLINE' || value === 'NO BET') return value;
  return 'all';
}

export function predictionMatchesDecision(
  prediction: Pick<UnifiedPrediction, 'decision'>,
  filter: DecisionFilter,
): boolean {
  if (filter === 'all') return true;
  return decisionCode(prediction.decision?.code) === filter;
}

/**
 * Drops predictions outside the chosen state and drops a match that has none left.
 * `all` returns the same list, predictions included.
 */
export function applyDecisionFilter(items: FeedItem[], filter: DecisionFilter): FeedItem[] {
  if (filter === 'all') return items;
  const out: FeedItem[] = [];
  for (const item of items) {
    const predictions = item.predictions.filter((prediction) =>
      predictionMatchesDecision(prediction, filter),
    );
    if (predictions.length === 0) continue;
    out.push({ ...item, predictions });
  }
  return out;
}
