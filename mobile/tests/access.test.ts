import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GUEST_FREE_MARKETS, isLockedDay } from '../utils/access.ts';

test('past days are free, today and future are locked', () => {
  assert.equal(isLockedDay('2026-10-17', '2026-10-18'), false);
  assert.equal(isLockedDay('2026-10-18', '2026-10-18'), true);
  assert.equal(isLockedDay('2026-10-19', '2026-10-18'), true);
  assert.equal(isLockedDay('2025-12-31', '2026-01-01'), false);
});

test('guests see three markets', () => {
  assert.equal(GUEST_FREE_MARKETS, 3);
});
