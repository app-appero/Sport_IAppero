import { decisionCode } from './decisionFilter.ts';

export type DecisionKey = 'PLAY' | 'BORDERLINE' | 'NO BET';

export const DECISION_ORDER: DecisionKey[] = ['PLAY', 'BORDERLINE', 'NO BET'];

export const DECISION_SHORT_LABEL: Record<DecisionKey, string> = {
  PLAY: 'Play',
  BORDERLINE: 'Borderline',
  'NO BET': 'No bet',
};

export type DecisionTotal = {
  decision: DecisionKey;
  hits: number;
  misses: number;
  pending: number;
  settled: number;
  /** hits / settled, null if nothing settled yet */
  hitRate: number | null;
};

export type DecisionTotals = Record<DecisionKey, { hits: number; misses: number; pending: number }>;

export function newDecisionTotals(): DecisionTotals {
  return {
    PLAY: { hits: 0, misses: 0, pending: 0 },
    BORDERLINE: { hits: 0, misses: 0, pending: 0 },
    'NO BET': { hits: 0, misses: 0, pending: 0 },
  };
}

/**
 * Same counting as the day total: a hit is a hit, a miss is a miss, anything else is open - unless the match
 * closed without a result (postponed, no result), which is not counted at all. A prediction whose decision the
 * provider did not send (or sent as something else) belongs to none of the three states.
 */
export function tallyDecision(
  totals: DecisionTotals,
  code: string | null | undefined,
  tone: string,
  closedWithoutResult: boolean,
): void {
  const key = decisionCode(code);
  if (!key) return;
  if (tone === 'hit') totals[key].hits += 1;
  else if (tone === 'miss') totals[key].misses += 1;
  else if (!closedWithoutResult) totals[key].pending += 1;
}

export function decisionTotalsList(totals: DecisionTotals): DecisionTotal[] {
  return DECISION_ORDER.map((decision) => {
    const { hits, misses, pending } = totals[decision];
    const settled = hits + misses;
    return { decision, hits, misses, pending, settled, hitRate: settled > 0 ? hits / settled : null };
  });
}

/** "3/4": taken / decided, the same ratio as the day total ("0/0" when nothing is decided). */
export function decisionRatio(t: Pick<DecisionTotal, 'hits' | 'settled'>): string {
  return `${t.hits}/${t.settled}`;
}
