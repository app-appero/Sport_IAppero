import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  POLL_INTERVAL_MS,
  formatUpdatedAt,
  offlineBannerText,
  pollIntervalFor,
} from '../utils/staleness.ts';

// 2026-10-12T12:32:00Z = 14:32 in Europe/Rome (CEST, UTC+2)
const T = Date.UTC(2026, 9, 12, 12, 32);

test('formatUpdatedAt uses Europe/Rome', () => {
  assert.equal(formatUpdatedAt(T), '14:32');
  assert.equal(formatUpdatedAt(undefined), null);
  assert.equal(formatUpdatedAt(0), null);
});

test('no banner while online or without cached data', () => {
  assert.equal(offlineBannerText(true, true, T), null);
  assert.equal(offlineBannerText(false, false, undefined), null);
});

test('offline with cached data declares the snapshot stale', () => {
  assert.equal(
    offlineBannerText(false, true, T),
    'Offline · dati delle 14:32, potrebbero non essere aggiornati',
  );
  assert.match(offlineBannerText(false, true, undefined) ?? '', /dati salvati/);
});

test('only today is polled', () => {
  assert.equal(pollIntervalFor('2026-10-12', '2026-10-12'), POLL_INTERVAL_MS);
  assert.equal(pollIntervalFor('2026-10-11', '2026-10-12'), false);
  assert.equal(pollIntervalFor(undefined, '2026-10-12'), false);
});
