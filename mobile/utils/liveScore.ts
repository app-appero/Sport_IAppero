import type { Event } from '../types/api';

/** True while the provider reports the match as in progress. */
export function isLiveEvent(event: Pick<Event, 'status' | 'live'>): boolean {
  return Boolean(event.live?.is_live) || (event.status ?? '').trim().toLowerCase() === 'live';
}

/** "6-4 3-2" — games per set, home first. Empty string when there are no sets yet. */
export function formatSets(sets: number[][] | undefined | null): string {
  return (sets ?? [])
    .filter((s) => Array.isArray(s) && s.length === 2)
    .map(([home, away]) => `${home}-${away}`)
    .join(' ');
}

/** "30-15" from the provider's "30 - 15"; null for placeholders. */
export function formatGame(game: string | null | undefined): string | null {
  const text = (game ?? '').replace(/\s*-\s*/, '-').trim();
  return !text || text === '-' || text === '0-0' ? null : text;
}

export type LiveLine = { sets: string; game: string | null; server: string | null };

/** What the card shows under the match name while it is live; null when nothing useful is known. */
export function liveLine(
  event: Pick<Event, 'live' | 'participants'>,
): LiveLine | null {
  const live = event.live;
  if (!live) return null;
  const sets = formatSets(live.sets);
  const game = formatGame(live.current_game);
  const idx = live.server === 'home' ? 0 : live.server === 'away' ? 1 : -1;
  const server = idx >= 0 ? event.participants?.[idx]?.name ?? null : null;
  if (!sets && !game && !server) return null;
  return { sets, game, server };
}

/** Football: "63'" while live; falls back to a short provider detail ("Intervallo"). */
export function liveMinuteLabel(event: Pick<Event, 'live'>): string | null {
  const live = event.live;
  if (!live) return null;
  if (typeof live.minute === 'number' && Number.isFinite(live.minute) && live.minute > 0) {
    return `${Math.round(live.minute)}'`;
  }
  const detail = (live.status_detail ?? '').trim();
  return detail && detail.length <= 14 ? detail : null;
}

export type LiveBoardRow = {
  name: string;
  /** Games won in each set, in play order. */
  games: number[];
  /** Current game points ("30", "Ad"); null between games / unknown. */
  point: string | null;
  serving: boolean;
};

export type LiveBoardData = { rows: [LiveBoardRow, LiveBoardRow]; currentSet: number };

/**
 * Tennis live scoreboard: one row per player with games per set, current game and the
 * serving mark. Null when the feed has no sets, game or server yet.
 */
export function liveBoard(event: Pick<Event, 'live' | 'participants'>): LiveBoardData | null {
  const live = event.live;
  if (!live) return null;
  const sets = (live.sets ?? []).filter((s) => Array.isArray(s) && s.length === 2);
  const game = formatGame(live.current_game);
  if (sets.length === 0 && !game && !live.server) return null;
  const points = game ? game.split('-') : [null, null];
  const names = [event.participants?.[0]?.name ?? 'Giocatore 1', event.participants?.[1]?.name ?? 'Giocatore 2'];
  const row = (i: 0 | 1): LiveBoardRow => ({
    name: names[i],
    games: sets.map((s) => Number(s[i])),
    point: game ? (points[i] ?? null) : null,
    serving: live.server === (i === 0 ? 'home' : 'away'),
  });
  return { rows: [row(0), row(1)], currentSet: Math.max(0, sets.length - 1) };
}
