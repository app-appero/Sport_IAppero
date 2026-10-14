import assert from 'node:assert/strict';
import test from 'node:test';

import { createRefreshStore } from '../utils/refreshRun.ts';

const noSleep = () => Promise.resolve();

test('the run keeps going and publishes progress with no screen subscribed', async () => {
  let polls = 0;
  const store = createRefreshStore({
    start: async () => ({ results: { football: { state: 'queued', ref: 'a' }, tennis: { state: 'queued', ref: 'b' } } }),
    status: async () => {
      polls += 1;
      return polls < 2
        ? { football: { state: 'running', progress: 45 }, tennis: { state: 'running', progress: 10 } }
        : { football: { state: 'success', progress: 100 }, tennis: { state: 'success', progress: 100 } };
    },
    sleep: noSleep,
  });
  const seen: number[] = [];
  const off = store.subscribe(() => seen.push(store.getView().progress.football ?? -1));
  off(); // the profile page unmounted: nothing listens any more
  await store.start('t');
  const view = store.getView();
  assert.equal(view.running, false);
  assert.deepEqual(view.states, { football: 'success', tennis: 'success' });
  assert.equal(view.progress.football, 100);
  assert.equal(polls, 2);
  assert.deepEqual(seen, []);
});

test('a screen that subscribes later sees the run in progress', async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const store = createRefreshStore({
    start: async () => ({ results: { football: { state: 'queued', ref: 'a' } } }),
    status: async () => {
      await gate;
      return { football: { state: 'success' } };
    },
    sleep: noSleep,
  });
  const done = store.start('t', ['football']);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(store.getView().running, true);
  assert.equal(store.getView().states?.football, 'queued');
  release();
  await done;
  assert.equal(store.getView().running, false);
});

test('a refused start is reported per sport and a second start is ignored while running', async () => {
  let starts = 0;
  const store = createRefreshStore({
    start: async () => {
      starts += 1;
      return { results: { football: { state: 'error', message: 'No' } } };
    },
    status: async () => ({}),
    sleep: noSleep,
  });
  await Promise.all([store.start('t', ['football']), store.start('t', ['football'])]);
  assert.equal(starts, 1);
  assert.equal(store.getView().states?.football, 'error');
  assert.equal(store.getView().reasons.football, 'No');
});
