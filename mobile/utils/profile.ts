import type { AuthUser } from '@/types/api';

/** One or two capital letters for the avatar circle; "?" when nothing is known. */
export function initials(user: Pick<AuthUser, 'display_name' | 'email'>): string {
  const source = (user.display_name || user.email || '').trim();
  if (!source) return '?';
  const words = source.split(/\s+/).filter(Boolean);
  const letters =
    words.length >= 2 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2);
  return letters.toUpperCase();
}

/** A stored session is dropped locally once its expiry has passed (with a small margin). */
export function isSessionExpired(expiresAt: string, now: number = Date.now()): boolean {
  const t = Date.parse(expiresAt);
  return Number.isNaN(t) || t - 60_000 <= now;
}

type CodeError = { status?: number; code?: string; message?: string };

/** Short Italian message for a failed sign-in; never shows tokens or raw API text. */
export function authErrorMessage(err: unknown): string {
  const e = (err ?? {}) as CodeError;
  if (e.code === 'auth_disabled' || e.status === 503) {
    return 'L’accesso non è ancora disponibile. Riprova più tardi.';
  }
  if (e.code === 'invalid_google_token' || e.status === 401) {
    return 'Accesso con Google non riuscito. Riprova.';
  }
  if (e.code === 'native_module_missing') {
    return 'Questa installazione non include l’accesso con Google. Installa l’ultimo APK (npm run apk).';
  }
  if (e.code === 'SIGN_IN_CANCELLED' || e.code === '12501') return '';
  if (e.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
    return 'Google Play Services non è disponibile su questo dispositivo.';
  }
  if (err instanceof TypeError || /network|fetch/i.test(String(e.message))) {
    return 'Connessione assente o instabile. Controlla la rete e riprova.';
  }
  return 'Qualcosa è andato storto. Riprova tra poco.';
}
