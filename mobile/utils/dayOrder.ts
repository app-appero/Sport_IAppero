import type { Event, FeedItem } from '../types/api';
import { isLiveEvent } from './liveScore.ts';

/** Day-list status filter. `all` is the list as it is today. */
export type ListPhase = 'all' | 'live' | 'upcoming' | 'done';

function norm(status: string | null | undefined): string {
  return (status ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

const FINISHED = new Set(['ft', 'aet', 'pen', 'finished', 'complete', 'completed', 'ended', 'played', 'final']);
const VOID = ['postpon', 'cancel', 'abandon', 'walk over', 'walkover', 'void', 'deleted', 'retir'];
const VOID_CODES = new Set(['pst', 'canc', 'abd', 'awd', 'wo']);
const PRE_MATCH = new Set(['', 'ns', 'scheduled', 'upcoming', 'not started', 'tbd', 'time to be defined']);

/**
 * True when the match is over for the day list: a final result, or closed without one
 * (postponed, cancelled, abandoned, or stuck in pre-match on a past day).
 * Live matches are NOT done: they stay in the main part of the list.
 */
export function isEventDone(event: Pick<Event, 'status' | 'calendar_date'>, today: string): boolean {
  const s = norm(event.status);
  if (FINISHED.has(s) || s.includes('finish')) return true;
  if (VOID_CODES.has(s) || VOID.some((v) => s.includes(v))) return true;
  const day = event.calendar_date;
  return Boolean(day && day < today && PRE_MATCH.has(s));
}

/**
 * Keeps a match for the day-list status chips.
 * `done` is the group already under "Finite". `live` is a match that already
 * shows the LIVE badge. `upcoming` is a match that has not started yet.
 */
export function eventMatchesPhase(
  event: Pick<Event, 'status' | 'calendar_date' | 'live'>,
  phase: ListPhase,
  today: string,
): boolean {
  if (phase === 'all') return true;
  const done = isEventDone(event, today);
  if (phase === 'done') return done;
  const live = isLiveEvent(event);
  if (phase === 'live') return live && !done;
  return !live && !done;
}

/** Kickoff instant when the provider gives one; else calendar day + provider clock (tennis), good for ordering only. */
function startMs(event: Pick<Event, 'start_time' | 'calendar_date' | 'local_time'>): number {
  const t = event.start_time ? Date.parse(event.start_time) : NaN;
  if (!Number.isNaN(t)) return t;
  if (event.calendar_date && event.local_time) {
    const naive = Date.parse(`${event.calendar_date}T${event.local_time}:00Z`);
    if (!Number.isNaN(naive)) return naive;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Day list order: open and live matches by start time (earliest first), then the finished
 * ones, also by start time. Matches without a start time go last in their group. Stable.
 */
export function sortDayEvents<T extends { event: Pick<Event, 'status' | 'calendar_date' | 'start_time' | 'local_time'> }>(
  items: T[],
  today: string,
): { open: T[]; done: T[] } {
  const keyed = items.map((item, index) => ({ item, index, ms: startMs(item.event) }));
  const byTime = (a: (typeof keyed)[number], b: (typeof keyed)[number]) =>
    a.ms === b.ms ? a.index - b.index : a.ms < b.ms ? -1 : 1;
  const open = keyed.filter((k) => !isEventDone(k.item.event, today)).sort(byTime);
  const done = keyed.filter((k) => isEventDone(k.item.event, today)).sort(byTime);
  return { open: open.map((k) => k.item), done: done.map((k) => k.item) };
}

export type DayRow = { kind: 'event'; item: FeedItem } | { kind: 'divider'; count: number };

/** Flat rows for the list: open matches, a "Finite" divider, then the finished ones. */
export function buildDayRows(items: FeedItem[], today: string): DayRow[] {
  const { open, done } = sortDayEvents(items, today);
  const rows: DayRow[] = open.map((item) => ({ kind: 'event', item }));
  if (done.length > 0) {
    rows.push({ kind: 'divider', count: done.length });
    for (const item of done) rows.push({ kind: 'event', item });
  }
  return rows;
}
