import { useSyncExternalStore } from 'react';

import { adminRefresh, adminRefreshStatus } from '@/services/api';
import { createRefreshStore } from '@/utils/refreshRun';

/** App-wide singleton: the run survives navigating away from the profile page. */
const store = createRefreshStore({
  start: (token, sports) => adminRefresh(token, sports),
  status: (token, refs) => adminRefreshStatus(token, refs),
});

export function useRefreshRun() {
  const view = useSyncExternalStore(store.subscribe, store.getView, store.getView);
  return { view, start: store.start };
}
