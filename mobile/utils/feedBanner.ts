import type { FeedMeta } from '../types/api.ts';

/** Machine warning the BFF adds when a stale snapshot is served; shown as a sentence, not raw. */
export const STALE_WARNING = 'served_from_stale_cache';

export function staleLine(meta: Pick<FeedMeta, 'is_stale' | 'snapshot_age_seconds'>): string | null {
  if (!meta.is_stale) return null;
  const age = meta.snapshot_age_seconds;
  return typeof age === 'number' && Number.isFinite(age) && age > 0
    ? `Dati in cache (non aggiornati ora; età circa ${Math.round(age)}s).`
    : 'Dati in cache: i motori non hanno risposto, mostrati gli ultimi disponibili.';
}
