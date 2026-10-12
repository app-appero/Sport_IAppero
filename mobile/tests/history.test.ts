import assert from 'node:assert/strict';
import { test } from 'node:test';

import { barShares, decidedLine, excludedNote, formatRate, othersLine } from '../utils/history.ts';

const base = { won: 6, lost: 5, void: 1, pending: 1, not_placed: 0, unknown: 0, total: 13, decided: 11, win_rate: 6 / 11 };

test('rate is shown with its denominator, never as a bare percentage', () => {
  assert.equal(formatRate(base.win_rate), '55%');
  assert.equal(decidedLine(base), '6 prese su 11 decise');
  assert.equal(decidedLine({ ...base, won: 1, decided: 1 }), '1 presa su 1 decisa');
});

test('no decided predictions gives n.d., not 0%', () => {
  const none = { ...base, won: 0, lost: 0, decided: 0, win_rate: null };
  assert.equal(formatRate(none.win_rate), 'n.d.');
  assert.equal(decidedLine(none), 'Nessuna predizione ancora decisa');
});

test('void and pending are reported separately', () => {
  assert.equal(othersLine(base), '1 annullata · 1 in attesa');
  assert.equal(othersLine({ ...base, void: 0, pending: 0 }), '');
});

test('bar shares add up and skip empty statuses', () => {
  const shares = barShares(base);
  assert.deepEqual(shares.map((s) => s.status), ['won', 'lost', 'void', 'pending']);
  assert.ok(Math.abs(shares.reduce((a, s) => a + s.share, 0) - 1) < 1e-9);
  assert.deepEqual(barShares({ ...base, total: 0 }), []);
});

test('excluded predictions are declared', () => {
  assert.equal(excludedNote(0), null);
  assert.match(excludedNote(1) ?? '', /1 predizione esclusa/);
  assert.match(excludedNote(3) ?? '', /3 predizioni escluse/);
});
