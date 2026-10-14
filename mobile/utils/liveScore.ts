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
