/** Pure helpers for the offline / stale-data banner and foreground polling. */

export const POLL_INTERVAL_MS = 60_000;

/** "HH:MM" in Europe/Rome for the last successful update, or null if unknown. */
export function formatUpdatedAt(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  }).format(new Date(timestamp));
}

/** Banner text when the device is offline but a cached snapshot is shown. */
export function offlineBannerText(
  online: boolean,
  hasData: boolean,
  dataUpdatedAt: number | undefined,
): string | null {
  if (online || !hasData) return null;
  const at = formatUpdatedAt(dataUpdatedAt);
  return at
    ? `Offline · dati delle ${at}, potrebbero non essere aggiornati`
    : 'Offline · dati salvati, potrebbero non essere aggiornati';
}

/** Only the current day changes; past/future days are not polled. */
export function pollIntervalFor(date: string | undefined, today: string): number | false {
  return date && date === today ? POLL_INTERVAL_MS : false;
}
