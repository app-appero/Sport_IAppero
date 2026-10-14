import type { RefreshRunState, UserRole } from '../types/api.ts';

export const REFRESH_POLL_MS = 5_000;
export const REFRESH_MAX_WAIT_MS = 10 * 60_000;

type Roled = { role?: UserRole | string | null; permissions?: readonly string[] | null };

export function isAdminUser(user: Roled | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

export function isSuperAdmin(user: Roled | null | undefined): boolean {
  return user?.role === 'super_admin';
}

/** The super admin has every permission; an admin only the ones granted. */
export function hasPermission(user: Roled | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return user.role === 'admin' && (user.permissions ?? []).includes(permission);
}

export function roleLabel(role: string | null | undefined): string {
  if (role === 'super_admin') return 'Super admin';
  if (role === 'admin') return 'Admin';
  return 'Utente';
}

const PERMISSION_LABELS: Record<string, string> = {
  view_users: 'Vedere gli utenti registrati',
  refresh_data: 'Aggiornare i dati',
  free_access: 'Accesso gratuito',
};

/** Server label wins when given; otherwise a local fallback, finally the raw key. */
export function permissionLabel(key: string, serverLabel?: string | null): string {
  return serverLabel || PERMISSION_LABELS[key] || key;
}

export function sportLabel(sport: string): string {
  if (sport === 'football') return 'Calcio';
  if (sport === 'tennis') return 'Tennis';
  return sport;
}

/** Status of one sport's refresh; `null` state = the start request itself failed. */
export function refreshStateLabel(state: RefreshRunState | 'error' | null | undefined): string {
  switch (state) {
    case 'queued':
      return 'In coda…';
    case 'running':
      return 'In corso…';
    case 'success':
      return 'Completato';
    case 'failed':
      return 'Errore';
    case 'error':
      return 'Errore';
    case 'unknown':
      return 'Stato non disponibile';
    default:
      return 'In corso…';
  }
}

export function isFinalRefreshState(state: string | null | undefined): boolean {
  return state === 'success' || state === 'failed' || state === 'unknown' || state === 'error';
}

/** True when every sport has reached a final state (and there is at least one). */
export function allRefreshFinal(states: Record<string, string | null | undefined>): boolean {
  const values = Object.values(states);
  return values.length > 0 && values.every(isFinalRefreshState);
}

/** Polling stops once everything is final or the time budget is used up. */
export function shouldKeepPolling(
  states: Record<string, string | null | undefined>,
  startedAtMs: number,
  nowMs: number,
  maxWaitMs: number = REFRESH_MAX_WAIT_MS,
): boolean {
  if (allRefreshFinal(states)) return false;
  return nowMs - startedAtMs < maxWaitMs;
}

export function cooldownMessage(seconds: number | null | undefined): string {
  const n = Math.max(1, Math.ceil(Number.isFinite(seconds as number) ? (seconds as number) : 60));
  return `Aggiornamento già avviato: riprova tra ${n} ${n === 1 ? 'secondo' : 'secondi'}`;
}

/** "14 ott 2026" (Rome time); "—" when missing or invalid. */
export function formatItalianDate(iso: string | null | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return '—';
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  })
    .format(new Date(t))
    .replace(/\./g, '');
}

/** "14 ott 2026, 09:30" (Rome time); "Mai" when the user never logged in. */
export function formatItalianDateTime(iso: string | null | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(t)) return 'Mai';
  const date = formatItalianDate(iso);
  const time = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Rome',
  }).format(new Date(t));
  return `${date}, ${time}`;
}

type ErrLike = { status?: number; code?: string; message?: string; retryAfterSeconds?: number };

/** Short Italian message for a failed admin call; never shows raw API text. */
export function adminErrorMessage(err: unknown): string {
  const e = (err ?? {}) as ErrLike;
  if (e.status === 429) return cooldownMessage(e.retryAfterSeconds);
  if (e.status === 401) return 'Sessione scaduta: esci e accedi di nuovo.';
  if (e.status === 403) return 'Non hai il permesso per questa operazione.';
  if (e.status === 409 && e.code === 'self_change') return 'Non puoi cambiare il tuo stesso ruolo.';
  if (e.status === 409 && e.code === 'protected') return 'Un super admin non può essere modificato.';
  if (e.status === 404) return 'Utente non trovato: aggiorna l’elenco.';
  if (e.status === 422) return 'Dati non validi. Controlla e riprova.';
  if (err instanceof TypeError || /network|fetch/i.test(String(e.message))) {
    return 'Connessione assente o instabile. Controlla la rete e riprova.';
  }
  return 'Qualcosa è andato storto. Riprova tra poco.';
}

/** Can the current user open the role editor on this row? */
export function canEditUser(
  me: (Roled & { id?: string }) | null | undefined,
  target: { id: string; role: string },
): boolean {
  return isSuperAdmin(me) && target.role !== 'super_admin' && target.id !== me?.id;
}

const FINISHED_STATES = ['success', 'failed', 'unknown', 'error'];

/** 0-100 for one sport: finished runs count as 100, otherwise the engine's number (0 if not known). */
export function sportProgress(state: string | null | undefined, progress: number | null | undefined): number {
  if (state && FINISHED_STATES.includes(state)) return 100;
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

/** Mean progress over the sports being refreshed (null when there is nothing to average). */
export function overallProgress(
  states: Record<string, string | undefined>,
  progress: Record<string, number | null | undefined>,
): number | null {
  const sports = Object.keys(states);
  if (sports.length === 0) return null;
  const sum = sports.reduce((acc, sport) => acc + sportProgress(states[sport], progress[sport]), 0);
  return Math.round(sum / sports.length);
}
