import assert from 'node:assert/strict';
import { test } from 'node:test';

import { periodFrom, romeToday } from '../utils/period.ts';

test('"Sempre" has no lower bound', () => {
  assert.equal(periodFrom('all', '2026-10-12'), undefined);
});

test('windows are inclusive of today', () => {
  assert.equal(periodFrom('d7', '2026-10-12'), '2026-10-06');
  assert.equal(periodFrom('d30', '2026-10-12'), '2026-09-13');
});

test('windows cross month and year boundaries', () => {
  assert.equal(periodFrom('d7', '2026-01-03'), '2025-12-28');
  // 30 days ending 1 Mar: 1 Mar + 28 days of Feb + 31 Jan.
  assert.equal(periodFrom('d30', '2026-03-01'), '2026-01-31');
});

test('Rome day changes at local midnight, not UTC', () => {
  // 22:30 UTC on 11 Oct is already 00:30 on 12 Oct in Rome (CEST).
  assert.equal(romeToday(new Date(Date.UTC(2026, 9, 11, 22, 30))), '2026-10-12');
  assert.equal(romeToday(new Date(Date.UTC(2026, 9, 11, 21, 30))), '2026-10-11');
});
