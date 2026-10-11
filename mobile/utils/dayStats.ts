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

export type MarketTypeStat = {
  marketType: string;
  hits: number;
  misses: number;
  pending: number;
  settled: number;
  hitRate: number | null;
};

export type DayStats = {
  events: number;
  hits: number;
  misses: number;
  pending: number;
  settled: number;
  /** hits / settled, null if nothing settled yet */
  hitRate: number | null;
  byMarket: MarketTypeStat[];
  byEvent: EventDayStat[];
};

function marketGroupKey(type: string): string {
  // Aggregate all cards lines under one chip-style bucket.
  if (type.startsWith('cards_line_')) return 'cards_line';
  return type;
}

export function buildDayStats(dayEvents: FeedItem[]): DayStats {
  const byEvent: EventDayStat[] = [];
  const marketMap = new Map<string, MarketTypeStat>();
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

      const key = marketGroupKey(m.prediction.prediction.type);
      let bucket = marketMap.get(key);
      if (!bucket) {
        bucket = {
          marketType: key,
          hits: 0,
          misses: 0,
          pending: 0,
          settled: 0,
          hitRate: null,
        };
        marketMap.set(key, bucket);
      }
      if (m.tone === 'hit') bucket.hits += 1;
      else if (m.tone === 'miss') bucket.misses += 1;
      else bucket.pending += 1;
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

  const byMarket = Array.from(marketMap.values()).map((m) => {
    const settled = m.hits + m.misses;
    return {
      ...m,
      settled,
      hitRate: settled > 0 ? m.hits / settled : null,
    };
  });
  // Best markets first: more hits, then hit rate, then volume.
  byMarket.sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits;
    const ra = a.hitRate ?? -1;
    const rb = b.hitRate ?? -1;
    if (rb !== ra) return rb - ra;
    if (b.settled !== a.settled) return b.settled - a.settled;
    return a.marketType.localeCompare(b.marketType);
  });

  // Events with most correct picks first.
  byEvent.sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits;
    if (b.settled !== a.settled) return b.settled - a.settled;
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
    byMarket,
    byEvent,
  };
}
