export type TallyTone = 'good' | 'mid' | 'bad' | 'neutral';

export type Tally = { hits: number; total: number; tone: TallyTone };

/**
 * "Presi/totale" for a match card: predictions already won over all the predictions of the match
 * (open ones count in the total). Shown while the match is live, or once it is over with at least one
 * settled prediction; null otherwise (not started, or closed without a result).
 * `outcomes` has one entry per prediction: 'hit', 'miss' or null while open.
 */
export function cardTally(
  outcomes: ('hit' | 'miss' | null)[],
  state: { live: boolean; done: boolean },
): Tally | null {
  const total = outcomes.length;
  if (total === 0) return null;
  const hits = outcomes.filter((o) => o === 'hit').length;
  const settled = outcomes.filter((o) => o != null).length;
  if (!state.live && !(state.done && settled > 0)) return null;
  // Live with nothing settled yet, or still only wins so far, has no verdict to colour.
  if (state.live && settled === 0) return { hits, total, tone: 'neutral' };
  const ratio = hits / total;
  return { hits, total, tone: ratio >= 0.5 ? 'good' : ratio >= 0.25 ? 'mid' : 'bad' };
}
