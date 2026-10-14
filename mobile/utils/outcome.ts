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
    s === 'completed' ||
    s === 'played'
  );
}

function parseTennisSetScore(display: string | null | undefined): { home: number; away: number } | null {
  if (!display) return null;
  const parts = display.replace('–', '-').split('-').map((p) => p.trim());
  if (parts.length !== 2) return null;
  const home = Number(parts[0]);
  const away = Number(parts[1]);
  if (Number.isNaN(home) || Number.isNaN(away)) return null;
  return { home, away };
}

function tennisTotals(event: Event): Record<string, unknown> | null {
  const t = event.actual_totals;
  return t && typeof t === 'object' ? (t as Record<string, unknown>) : null;
}

function parseOuLine(name: string): { side: 'over' | 'under'; line: number } | null {
  const lower = name.trim().toLowerCase();
  if (lower.startsWith('over')) {
    const line = Number(lower.slice(4).trim());
    return Number.isNaN(line) ? null : { side: 'over', line };
  }
  if (lower.startsWith('under')) {
    const line = Number(lower.slice(5).trim());
    return Number.isNaN(line) ? null : { side: 'under', line };
  }
  return null;
}

function selectionIsPlayer1(sel: string, name: string): boolean {
  return (
    sel === 'player_1' ||
    sel === 'home' ||
    sel === '1' ||
    name === 'first player' ||
    name === 'player 1'
  );
}

function selectionIsPlayer2(sel: string, name: string): boolean {
  return (
    sel === 'player_2' ||
    sel === 'away' ||
    sel === '2' ||
    name === 'second player' ||
    name === 'player 2'
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
  // A match in progress has partial scores: no hit/miss until it is over.
  if (event.live?.is_live || (event.status ?? '').trim().toLowerCase() === 'live') return null;
  if (!isFinished(event.status) && !event.score && !event.actual_totals) return null;

  const market = pred.prediction.type;
  const sel = (pred.prediction.selection.id || '').toLowerCase();
  const score = event.score;
  const totals = event.actual_totals;

  if (market === 'h2h' || market === 'match_winner') {
    let h = score?.home != null ? Number(score.home) : null;
    let a = score?.away != null ? Number(score.away) : null;
    if (h == null || a == null) {
      const parsed = parseTennisSetScore(score?.display ?? null);
      if (parsed) {
        h = parsed.home;
        a = parsed.away;
      }
    }
    if (h == null || a == null) {
      const totals = tennisTotals(event);
      const s1 = totals?.sets_won_player_1;
      const s2 = totals?.sets_won_player_2;
      if (typeof s1 === 'number' && typeof s2 === 'number') {
        h = s1;
        a = s2;
      }
    }
    if (h == null || a == null) return null;
    const name = pred.prediction.selection.name.toLowerCase();
    if (selectionIsPlayer1(sel, name)) return h > a;
    if (selectionIsPlayer2(sel, name)) return a > h;
    if (
      sel === 'draw' ||
      sel === 'x' ||
      name === 'draw' ||
      name === 'pareggio' ||
      name === 'x'
    ) {
      return h === a;
    }
    return null;
  }

  if (market === 'first_set_winner') {
    const totals = tennisTotals(event);
    const actual = totals?.first_set_winner;
    if (typeof actual !== 'string') return null;
    const name = pred.prediction.selection.name.toLowerCase();
    if (selectionIsPlayer1(sel, name)) return actual === 'player_1';
    if (selectionIsPlayer2(sel, name)) return actual === 'player_2';
    return null;
  }

  if (market === 'over_under_games' || market === 'total_games') {
    const totals = tennisTotals(event);
    const totalGames = totals?.total_games;
    if (typeof totalGames !== 'number') return null;
    const ou = parseOuLine(pred.prediction.selection.name);
    if (!ou) return null;
    if (ou.side === 'over') return totalGames > ou.line;
    if (ou.side === 'under') return totalGames < ou.line;
    return null;
  }

  if (market === 'dc') {
    if (score?.home == null || score?.away == null) return null;
    const h = Number(score.home);
    const a = Number(score.away);
    const label = (pred.prediction.selection.name || sel || '').trim().toUpperCase();
    if (label === '1X') return h >= a;
    if (label === 'X2') return a >= h;
    if (label === '12') return h !== a;
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
  // Prefer score-based settlement: upstream `correct` flags from Soccer Oracle
  // are frequently wrong (X2 miss on 2-2, DRAW hit on 1-2, etc.).
  const derived = deriveCorrect(pred);
  if (derived === true) return 'hit';
  if (derived === false) return 'miss';
  if (pred.correct === true) return 'hit';
  if (pred.correct === false) return 'miss';
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
