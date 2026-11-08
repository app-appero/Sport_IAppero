import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ENTITIES_PREVIEW,
  barShares,
  decidedLine,
  entityLine,
  excludedNote,
  formatRate,
  groupsByMarket,
  marketsLine,
  othersLine,
  visibleEntities,
} from '../utils/history.ts';
import type { HistoryGroup } from '../types/api.ts';

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

test('market cards combine every model into one row and drop the names', () => {
  const group = (market: string, model: string, won: number, lost: number): HistoryGroup => ({
    sport: 'football',
    market,
    model_name: model,
    model_version: 'decision_policy_v2_model_break_even',
    won,
    lost,
    void: 0,
    pending: 0,
    not_placed: 0,
    unknown: 0,
    total: won + lost,
    decided: won + lost,
    win_rate: (won + lost) > 0 ? won / (won + lost) : null,
  });
  const merged = groupsByMarket([
    group('under_over_2_5', 'logistic', 11, 9),
    group('under_over_2_5', 'voting', 7, 3),
    group('goal_no_goal', 'logistic', 0, 3),
  ]);
  assert.deepEqual(merged.map((row) => row.market), ['under_over_2_5', 'goal_no_goal']);
  assert.equal(merged[0].won, 18);
  assert.equal(merged[0].decided, 30);
  assert.equal(merged[0].win_rate, 18 / 30);
  assert.equal(merged[0].model_name, null);
  assert.equal(merged[0].model_version, null);
});

test('excluded predictions are declared', () => {
  assert.equal(excludedNote(0), null);
  assert.match(excludedNote(1) ?? '', /1 predizione esclusa/);
  assert.match(excludedNote(3) ?? '', /3 predizioni escluse/);
});

test('visibleEntities shows the first few in the server order and all when expanded', () => {
  const list = Array.from({ length: 8 }, (_, i) => ({ name: `T${i}` }));
  assert.equal(visibleEntities(list, false).length, ENTITIES_PREVIEW);
  assert.deepEqual(visibleEntities(list, false).map((e) => e.name), ['T0', 'T1', 'T2', 'T3', 'T4']);
  assert.equal(visibleEntities(list, true).length, 8);
  assert.equal(visibleEntities(list.slice(0, 3), false).length, 3);
});

test('entityLine spells out the denominator and the rate', () => {
  assert.equal(entityLine({ won: 6, decided: 11, win_rate: 6 / 11 }), '6 prese su 11 decise · 55%');
  assert.equal(entityLine({ won: 0, decided: 0, win_rate: null }), 'Nessuna predizione ancora decisa');
});

test('marketsLine keeps the server order, skips undecided markets and uses the label function', () => {
  const markets = [
    { market: 'under_over_2_5', won: 2, lost: 1, decided: 3, total: 3, win_rate: 2 / 3 },
    { market: 'h2h', won: 1, lost: 1, decided: 2, total: 2, win_rate: 0.5 },
    { market: 'dc', won: 0, lost: 0, decided: 0, total: 1, win_rate: null },
  ];
  const label = (m: string) => ({ under_over_2_5: 'O/U 2.5', h2h: '1X2', dc: 'DC' })[m] ?? m;
  assert.equal(marketsLine(markets, label), 'O/U 2.5 67% (2/3) · 1X2 50% (1/2)');
  assert.equal(marketsLine([], label), '');
});
