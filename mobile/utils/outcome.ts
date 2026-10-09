import type { Event, UnifiedPrediction } from '@/types/api';

export type OutcomeTone = 'hit' | 'miss' | null;

function isFinished(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s === 'ft' ||
    s === 'finished' ||
    s === 'aet' ||
    s === 'pen' ||
    s.includes('finish') ||
    s.includes('ended') ||
    s === 'complete' ||
    s === 'completed'
  );
}

/** Score line relevant to the market (match result vs cards total, etc.). */
export function scoreForMarket(event: Event, marketType: string): string | null {
  const score = event.score;
  const totals = event.actual_totals;

  if (marketType.startsWith('cards_line_')) {
    const cards = totals?.cards ?? totals?.yellow_cards;
    if (cards != null) return `${cards} cartellini`;
    return null;
  }
  if (marketType.startsWith('under_over_') || marketType === 'goal_no_goal') {
    if (score?.home != null && score?.away != null) {
      const goals = Number(score.home) + Number(score.away);
      return `${score.home}-${score.away} (${goals} gol)`;
    }
  }
  if (score?.display) return score.display;
  if (score?.home != null && score?.away != null) return `${score.home}-${score.away}`;
  return null;
}

function deriveCorrect(pred: UnifiedPrediction): boolean | null {
  const event = pred.event;
  if (!isFinished(event.status) && !event.score && !event.actual_totals) return null;

  const market = pred.prediction.type;
  const sel = (pred.prediction.selection.id || '').toLowerCase();
  const score = event.score;
  const totals = event.actual_totals;

  if (market === 'h2h' || market === 'match_winner') {
    if (score?.home == null || score?.away == null) return null;
    const h = Number(score.home);
    const a = Number(score.away);
    if (sel === 'home' || sel === 'player_1') return h > a;
    if (sel === 'away' || sel === 'player_2') return a > h;
    if (sel === 'draw') return h === a;
    return null;
  }

  if (market === 'dc') {
    if (score?.home == null || score?.away == null) return null;
    const h = Number(score.home);
    const a = Number(score.away);
    const name = pred.prediction.selection.name;
    if (name === '1X') return h >= a;
    if (name === 'X2') return a >= h;
    if (name === '12') return h !== a;
    return null;
  }

  if (market.startsWith('under_over_')) {
    if (score?.home == null || score?.away == null) return null;
    const line = Number(market.replace('under_over_', '').replace('_', '.'));
    if (Number.isNaN(line)) return null;
    const goals = Number(score.home) + Number(score.away);
    if (sel === 'over') return goals > line;
    if (sel === 'under') return goals < line;
    return null;
  }

  if (market === 'goal_no_goal') {
    if (score?.home == null || score?.away == null) return null;
    const both = Number(score.home) > 0 && Number(score.away) > 0;
    if (sel === 'goal') return both;
    if (sel === 'no_goal') return !both;
    return null;
  }

  if (market.startsWith('cards_line_')) {
    const cards = totals?.cards;
    if (cards == null) return null;
    const line = Number(market.replace('cards_line_', '').replace('_', '.'));
    if (Number.isNaN(line)) return null;
    if (sel === 'over') return Number(cards) > line;
    if (sel === 'under') return Number(cards) < line;
    return null;
  }

  return null;
}

export function outcomeTone(pred: UnifiedPrediction): OutcomeTone {
  if (pred.correct === true) return 'hit';
  if (pred.correct === false) return 'miss';
  const derived = deriveCorrect(pred);
  if (derived === true) return 'hit';
  if (derived === false) return 'miss';
  return null;
}

export function pickBestPrediction(preds: UnifiedPrediction[]): UnifiedPrediction | null {
  if (!preds.length) return null;
  return [...preds].sort((a, b) => {
    const ca = a.prediction.confidence ?? -1;
    const cb = b.prediction.confidence ?? -1;
    return cb - ca;
  })[0];
}

export function isPastEvent(event: Event, selectedDate?: string | null): boolean {
  if (isFinished(event.status)) return true;
  if (selectedDate) {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return selectedDate < key;
  }
  return false;
}
