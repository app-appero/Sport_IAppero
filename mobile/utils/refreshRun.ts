import {
  REFRESH_POLL_MS,
  adminErrorMessage,
  isFinalRefreshState,
  shouldKeepPolling,
} from './admin.ts';

export const REFRESH_SPORTS = ['football', 'tennis'] as const;

export type RefreshView = {
  running: boolean;
  states: Record<string, string> | null;
  progress: Record<string, number | null>;
  reasons: Record<string, string>;
  message: string | null;
};

type StartResult = { state: string; ref?: string | null; message?: string | null };
type StatusResult = { state?: string; progress?: number | null };

export type RefreshDeps = {
  start: (token: string, sports: string[]) => Promise<{ results?: Record<string, StartResult> }>;
  status: (token: string, refs: Record<string, string>) => Promise<Record<string, StatusResult | undefined>>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  pollMs?: number;
};

const EMPTY: RefreshView = { running: false, states: null, progress: {}, reasons: {}, message: null };

/**
 * One "Aggiorna tutto" run that lives OUTSIDE any screen: the polling loop belongs to the store, so
 * leaving the profile page (which unmounts the admin block) neither stops nor hides it.
 */
export function createRefreshStore(deps: RefreshDeps) {
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = deps.now ?? Date.now;
  const pollMs = deps.pollMs ?? REFRESH_POLL_MS;
  let view: RefreshView = EMPTY;
  const listeners = new Set<() => void>();

  const set = (next: RefreshView) => {
    view = next;
    listeners.forEach((fn) => fn());
  };

  async function run(token: string, sports: readonly string[]): Promise<void> {
    const states: Record<string, string> = {};
    const progress: Record<string, number | null> = {};
    const reasons: Record<string, string> = {};
    const publish = (extra: Partial<RefreshView> = {}) =>
      set({ running: true, states: { ...states }, progress: { ...progress }, reasons: { ...reasons }, message: null, ...extra });

    try {
      const res = await deps.start(token, [...sports]);
      const refs: Record<string, string> = {};
      for (const sport of sports) {
        const r = res.results?.[sport];
        if (!r || r.state === 'error' || !r.ref) {
          states[sport] = 'error';
          if (r?.message) reasons[sport] = r.message;
        } else {
          states[sport] = 'queued';
          refs[sport] = r.ref;
        }
      }
      publish();
      const startedAt = now();
      let failures = 0;
      while (Object.keys(refs).length > 0) {
        const pending = Object.fromEntries(
          Object.entries(refs).filter(([sport]) => !isFinalRefreshState(states[sport])),
        );
        if (Object.keys(pending).length === 0) break;
        if (!shouldKeepPolling(states, startedAt, now())) {
          publish({ message: 'Controllo interrotto dopo 20 minuti: lo stato potrebbe non essere aggiornato.' });
          break;
        }
        await sleep(pollMs);
        try {
          const status = await deps.status(token, pending);
          failures = 0;
          for (const sport of Object.keys(pending)) {
            const s = status[sport];
            if (s?.state) states[sport] = s.state;
            if (s) progress[sport] = s.progress ?? progress[sport] ?? null;
          }
          publish();
        } catch (err) {
          const code = (err as { status?: number })?.status;
          if (code === 401 || code === 403 || ++failures >= 3) {
            publish({ message: adminErrorMessage(err) });
            break;
          }
        }
      }
    } catch (err) {
      publish({ message: adminErrorMessage(err) });
    } finally {
      set({ ...view, running: false });
    }
  }

  return {
    getView: () => view,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    /** No-op while a run is in progress (the button is disabled anyway). */
    start(token: string, sports: readonly string[] = REFRESH_SPORTS): Promise<void> {
      if (view.running) return Promise.resolve();
      set({ ...EMPTY, running: true });
      return run(token, sports);
    },
  };
}
