import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DECISION_ORDER,
  decisionRatio,
  decisionTotalsList,
  newDecisionTotals,
  tallyDecision,
} from '../utils/decisionTotals.ts';

test('the three states always come out in the order Play, Borderline, No bet, even when empty', () => {
  const list = decisionTotalsList(newDecisionTotals());
  assert.deepEqual(list.map((d) => d.decision), DECISION_ORDER);
  assert.deepEqual(list.map(decisionRatio), ['0/0', '0/0', '0/0']);
  assert.ok(list.every((d) => d.hitRate === null));
});

test('taken / decided per state, counting like the day total', () => {
  const t = newDecisionTotals();
  tallyDecision(t, 'PLAY', 'hit', false);
  tallyDecision(t, 'play', 'hit', false);
  tallyDecision(t, 'PLAY', 'miss', false);
  tallyDecision(t, 'PLAY', 'pending', false);
  tallyDecision(t, 'BORDERLINE', 'miss', false);
  tallyDecision(t, 'no_bet', 'hit', false);
  tallyDecision(t, 'NO BET', 'hit', false);
  const [play, border, noBet] = decisionTotalsList(t);
  assert.equal(decisionRatio(play), '2/3');
  assert.equal(play.pending, 1);
  assert.equal(play.hitRate, 2 / 3);
  assert.equal(decisionRatio(border), '0/1');
  assert.equal(decisionRatio(noBet), '2/2');
});

test('a match closed without a result adds no open prediction, a missing or unknown decision counts nowhere', () => {
  const t = newDecisionTotals();
  tallyDecision(t, 'PLAY', 'pending', true);
  tallyDecision(t, null, 'hit', false);
  tallyDecision(t, undefined, 'miss', false);
  tallyDecision(t, 'skip', 'hit', false);
  const list = decisionTotalsList(t);
  assert.ok(list.every((d) => d.hits === 0 && d.misses === 0 && d.pending === 0));
});
