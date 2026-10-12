/** Time windows for the Storico. Dates are kickoff days (YYYY-MM-DD). */
export type PeriodId = 'all' | 'd30' | 'd7';

export const PERIOD_OPTIONS: { label: string; value: PeriodId }[] = [
  { label: 'Sempre', value: 'all' },
  { label: 'Ultimi 30 giorni', value: 'd30' },
  { label: 'Ultimi 7 giorni', value: 'd7' },
];

const DAYS: Record<PeriodId, number | null> = { all: null, d30: 30, d7: 7 };

/** Today in Europe/Rome as YYYY-MM-DD (en-CA formats as ISO). */
export function romeToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** First day (inclusive) of the window ending today, or undefined for "Sempre". */
export function periodFrom(period: PeriodId, today: string): string | undefined {
  const days = DAYS[period];
  if (days == null) return undefined;
  const [y, m, d] = today.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - (days - 1)));
  return start.toISOString().slice(0, 10);
}

export function periodLabel(period: PeriodId): string {
  return PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? 'Sempre';
}
