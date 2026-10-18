import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  AUTH_AVAILABLE,
  AUTH_NATIVE_READY,
  clearSession,
  deleteAccount as deleteAccountRequest,
  loadSession,
  refreshUser,
  signInWithGoogle,
  signOut as signOutRequest,
  type StoredSession,
} from '@/services/auth';
import type { AuthUser } from '@/types/api';
import { isSessionExpired } from '@/utils/profile';

type AuthState = {
  available: boolean;
  /** "loading" only until the stored session has been read. */
  status: 'loading' | 'signedOut' | 'signedIn';
  user: AuthUser | null;
  /** Session token for authenticated BFF calls (null when signed out). */
  token: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(AUTH_AVAILABLE);

  useEffect(() => {
    if (!AUTH_AVAILABLE) return;
    let cancelled = false;
    (async () => {
      const stored = await loadSession();
      if (cancelled) return;
      if (!stored || isSessionExpired(stored.expiresAt)) {
        if (stored) await clearSession();
        setSession(null);
        setLoading(false);
        return;
      }
      // Show the saved profile at once, then confirm it with the server.
      setSession(stored);
      setLoading(false);
      try {
        const user = await refreshUser(stored.token);
        if (!cancelled) setSession({ ...stored, user });
      } catch (err) {
        // Only a definite "no" signs out; being offline keeps the saved profile.
        if ((err as { status?: number })?.status === 401) {
          await clearSession();
          if (!cancelled) setSession(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async () => {
    const next = await signInWithGoogle();
    if (next) setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    await signOutRequest();
    setSession(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!session) return;
    await deleteAccountRequest(session.token);
    setSession(null);
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      available: AUTH_AVAILABLE,
      status: loading ? 'loading' : session ? 'signedIn' : 'signedOut',
      user: session?.user ?? null,
      token: session?.token ?? null,
      signIn,
      signOut,
      deleteAccount,
    }),
    [loading, session, signIn, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/**
 * True for a visitor who is not signed in. False where sign-in cannot work (web, Expo Go, builds
 * without the Google module) and while the saved session is loading.
 */
export function useIsGuest(): boolean {
  const { available, status } = useAuth();
  return available && AUTH_NATIVE_READY && status === 'signedOut';
}
