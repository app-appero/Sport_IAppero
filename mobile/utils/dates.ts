/** Calendar helpers in local timezone (device / Europe/Rome for IT users). */

export type DayOption = {
  key: string;
  value: string;
  label: string;
  weekday: string;
  isToday: boolean;
  isPast: boolean;
};

const WEEKDAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'] as const;
const MONTHS_IT = [
  'gen',
  'feb',
  'mar',
  'apr',
  'mag',
  'giu',
  'lug',
  'ago',
  'set',
  'ott',
  'nov',
  'dic',
] as const;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function todayKey(now = new Date()): string {
  // Optional anchor for demos/fixtures (YYYY-MM-DD); ignored in production builds without env.
  const anchor = process.env.EXPO_PUBLIC_ANCHOR_DATE;
  if (anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor)) return anchor;
  return toDateKey(now);
}

/** Compact IT labels — avoid Intl short forms that vary / overflow on native APK. */
function formatWeekday(d: Date): string {
  return WEEKDAYS_IT[d.getDay()];
}

function formatDayLabel(d: Date, isToday: boolean): string {
  if (isToday) return 'Oggi';
  return `${d.getDate()} ${MONTHS_IT[d.getMonth()]}`;
}

/** 7 days back … today … 7 days forward (15 chips). */
export function buildDayWindow(now = new Date()): DayOption[] {
  const today = todayKey(now);
  const base = parseDateKey(today);
  const out: DayOption[] = [];
  for (let offset = -7; offset <= 7; offset++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    const value = toDateKey(d);
    const isToday = value === today;
    out.push({
      key: value,
      value,
      label: formatDayLabel(d, isToday),
      weekday: formatWeekday(d),
      isToday,
      isPast: value < today,
    });
  }
  return out;
}

export function formatEventTime(iso: string | null | undefined, localTime?: string | null): string {
  // Tennis: the engine gives a wall-clock time without timezone, shown as is when there is no instant.
  if (!iso) return localTime && /^\d{2}:\d{2}/.test(localTime) ? localTime.slice(0, 5) : 'Orario n/d';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Orario n/d';
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  }).format(dt);
}
