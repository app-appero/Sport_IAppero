import type { FeedItem, UnifiedPrediction } from '@/types/api';
import { outcomeTone, type OutcomeTone } from '@/utils/outcome';

export type MarketStat = {
  prediction: UnifiedPrediction;
  tone: OutcomeTone;
};

export type EventDayStat = {
  eventId: string;
  eventName: string;
  competition: string | null;
  hits: number;
  misses: number;
  pending: number;
  settled: number;
  markets: MarketStat[];
};

export type DayStats = {
  events: number;
  hits: number;
  misses: number;
  pending: number;
  settled: number;
  /** hits / settled, null if nothing settled yet */
  hitRate: number | null;
  byEvent: EventDayStat[];
};

export function buildDayStats(dayEvents: FeedItem[]): DayStats {
  const byEvent: EventDayStat[] = [];
  let hits = 0;
  let misses = 0;
  let pending = 0;

  for (const item of dayEvents) {
    const markets: MarketStat[] = item.predictions.map((prediction) => ({
      prediction,
      tone: outcomeTone(prediction),
    }));
    let eh = 0;
    let em = 0;
    let ep = 0;
    for (const m of markets) {
      if (m.tone === 'hit') eh += 1;
      else if (m.tone === 'miss') em += 1;
      else ep += 1;
    }
    hits += eh;
    misses += em;
    pending += ep;
    byEvent.push({
      eventId: item.event.id,
      eventName: item.event.name,
      competition: item.event.competition?.name ?? null,
      hits: eh,
      misses: em,
      pending: ep,
      settled: eh + em,
      markets,
    });
  }

  // Show settled events first, then by hit rate, then name.
  byEvent.sort((a, b) => {
    if (b.settled !== a.settled) return b.settled - a.settled;
    const ra = a.settled ? a.hits / a.settled : -1;
    const rb = b.settled ? b.hits / b.settled : -1;
    if (rb !== ra) return rb - ra;
    return a.eventName.localeCompare(b.eventName, 'it');
  });

  const settled = hits + misses;
  return {
    events: dayEvents.length,
    hits,
    misses,
    pending,
    settled,
    hitRate: settled > 0 ? hits / settled : null,
    byEvent,
  };
}
