import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { deleteMe, getMe, loginWithGoogle } from '@/services/api';
import type { AuthSession, AuthUser } from '@/types/api';

const KEY = 'sport_iappero.session.v1';
/**
 * Google OAuth *Web* client ID of the "SportIAppero" Cloud project. Not a secret (it ships in
 * every APK), so it is the default; EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in mobile/.env overrides it.
 * It must equal GOOGLE_CLIENT_IDS on the BFF, which checks it as the token audience.
 */
const DEFAULT_WEB_CLIENT_ID =
  '113489003769-66q7tc5ccgdrq2hue7vod0ve75i80hu9.apps.googleusercontent.com';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || DEFAULT_WEB_CLIENT_ID;

/** Sign-in exists only in native builds that were given a Google Web client ID. */
export const AUTH_AVAILABLE = Platform.OS !== 'web' && WEB_CLIENT_ID.length > 0;

/**
 * False in Expo Go and in builds made without the Google module: the sign-in button stays visible
 * but sign-in cannot run there, and guests are not blocked (they could never sign in).
 */
function nativeModuleLinked(): boolean {
  if (!AUTH_AVAILABLE) return false;
  try {
    googleSignin();
    return true;
  } catch {
    return false;
  }
}
export const AUTH_NATIVE_READY = nativeModuleLinked();

export type StoredSession = { token: string; expiresAt: string; user: AuthUser };

export async function loadSession(): Promise<StoredSession | null> {
  if (!AUTH_AVAILABLE) return null;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

async function saveSession(session: AuthSession): Promise<StoredSession> {
  const stored: StoredSession = {
    token: session.access_token,
    expiresAt: session.expires_at,
    user: session.user,
  };
  await SecureStore.setItemAsync(KEY, JSON.stringify(stored));
  return stored;
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** The native module is required lazily so web builds never load it. */
function googleSignin() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
}

/** Returns the new session, or null if the user dismissed the Google sheet. */
export async function signInWithGoogle(): Promise<StoredSession | null> {
  if (!AUTH_NATIVE_READY) throw Object.assign(new Error('Google sign-in module missing'), { code: 'native_module_missing' });
  const { GoogleSignin, isSuccessResponse } = googleSignin();
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result) || !result.data.idToken) return null;
  const session = await loginWithGoogle(result.data.idToken);
  return saveSession(session);
}

export async function refreshUser(token: string): Promise<AuthUser> {
  return getMe(token);
}

export async function signOut(): Promise<void> {
  try {
    await googleSignin().GoogleSignin.signOut();
  } catch {
    /* the local session is what matters */
  }
  await clearSession();
}

/** Deletes the account on the BFF first; local state is cleared only if that succeeded. */
export async function deleteAccount(token: string): Promise<void> {
  await deleteMe(token);
  try {
    await googleSignin().GoogleSignin.revokeAccess();
  } catch {
    /* already signed out of Google */
  }
  await clearSession();
}
