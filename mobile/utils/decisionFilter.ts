import type { FeedItem, UnifiedPrediction } from '../types/api.ts';

/** Day-list decision filter. `all` leaves every prediction on the card. */
export type DecisionFilter = 'all' | 'PLAY' | 'BORDERLINE' | 'NO BET';

export const DECISION_FILTERS: { label: string; value: DecisionFilter }[] = [
  { label: 'Tutti', value: 'all' },
  { label: 'Play', value: 'PLAY' },
  { label: 'Borderline', value: 'BORDERLINE' },
  { label: 'No bet', value: 'NO BET' },
];

/**
 * Said wherever a decision is explained: Play / Borderline / No bet compare the model's estimate with the
 * odds and promise nothing (no proven edge over the market yet).
 */
export const DECISION_DISCLAIMER = 'Stima del modello rispetto alla quota: non è una garanzia di vincita.';

/** Plain explanation for the open filter (model probability vs the odds), then the disclaimer. */
export function decisionHint(filter: DecisionFilter): string {
  return `${decisionStateHint(filter)} ${DECISION_DISCLAIMER}`;
}

function decisionStateHint(filter: DecisionFilter): string {
  if (filter === 'PLAY') return 'Play: il modello dà all’esito una probabilità più alta di quella indicata dalla quota.';
  if (filter === 'BORDERLINE') return 'Borderline: la probabilità del modello è solo di poco più alta di quella della quota.';
  if (filter === 'NO BET') return 'No bet: la probabilità del modello non è più alta di quella della quota.';
  return 'Play: probabilità del modello più alta di quella della quota; Borderline: di poco; No bet: non più alta.';
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
