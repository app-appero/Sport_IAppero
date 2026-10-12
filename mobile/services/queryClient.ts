import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

/** A persisted snapshot older than this is discarded instead of shown as "stale". */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

let wired = false;

/** Connect React Query to the device: connectivity and app foreground/background. */
function wireDeviceState() {
  if (wired) return;
  wired = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      // isInternetReachable is null until probed; only an explicit false means offline.
      setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    }),
  );

  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (status) => {
      focusManager.setFocused(status === 'active');
    });
  }
}

export function createQueryClient() {
  wireDeviceState();
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        // Must outlive the persister maxAge, otherwise restored data is garbage-collected.
        gcTime: CACHE_MAX_AGE_MS,
        // Polling pauses in background (focusManager) and while offline.
        refetchIntervalInBackground: false,
      },
    },
  });
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'sport-iappero-query-cache',
  throttleTime: 1000,
});
