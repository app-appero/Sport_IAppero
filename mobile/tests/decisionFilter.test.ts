import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyDecisionFilter,
  DECISION_DISCLAIMER,
  decisionCode,
  decisionHint,
  parseDecisionFilter,
  predictionMatchesDecision,
} from '../utils/decisionFilter.ts';
import type { FeedItem } from '../types/api.ts';

const pred = (id: string, code: string | null) =>
  ({ id, decision: code == null ? null : { code } }) as FeedItem['predictions'][number];

test('each state has a plain explanation: model probability against the odds', () => {
  assert.match(decisionHint('all'), /^Play: .*Borderline: .*No bet: /);
  assert.match(decisionHint('PLAY'), /^Play: il modello .*più alta di quella indicata dalla quota\./);
  assert.match(decisionHint('BORDERLINE'), /^Borderline: .*solo di poco più alta/);
  assert.match(decisionHint('NO BET'), /^No bet: .*non è più alta di quella della quota\./);
});

test('every explanation says it is a model estimate, not a guarantee, and promises no gain', () => {
  assert.equal(DECISION_DISCLAIMER, 'Stima del modello rispetto alla quota: non è una garanzia di vincita.');
  for (const filter of ['all', 'PLAY', 'BORDERLINE', 'NO BET'] as const) {
    const hint = decisionHint(filter);
    assert.ok(hint.endsWith(` ${DECISION_DISCLAIMER}`), hint);
    assert.doesNotMatch(hint, /paga|vale la giocata|vantaggio|guadagn|sicur/i);
  }
});

test('decision codes accept the provider labels and ignore anything else', () => {
  assert.equal(decisionCode('play'), 'PLAY');
  assert.equal(decisionCode('BORDERLINE'), 'BORDERLINE');
  assert.equal(decisionCode('no_bet'), 'NO BET');
  assert.equal(decisionCode('No bet'), 'NO BET');
  assert.equal(decisionCode('skip'), null);
  assert.equal(decisionCode(null), null);
});

test('all keeps every prediction; a state keeps only that state', () => {
  const item = {
    event: { id: 'm1' },
    sport: 'football',
    predictions: [pred('a', 'PLAY'), pred('b', 'BORDERLINE'), pred('c', 'NO BET'), pred('d', null)],
  } as FeedItem;
  assert.equal(applyDecisionFilter([item], 'all')[0]?.predictions.length, 4);
  const play = applyDecisionFilter([item], 'PLAY');
  assert.deepEqual(play[0]?.predictions.map((p) => p.id), ['a']);
  assert.equal(predictionMatchesDecision(pred('b', 'Borderline'), 'BORDERLINE'), true);
  assert.equal(parseDecisionFilter('NO BET'), 'NO BET');
  assert.equal(parseDecisionFilter('other'), 'all');
});

test('a match with no prediction of that state is removed and the original list is not mutated', () => {
  const item = {
    event: { id: 'm1' },
    sport: 'football',
    predictions: [pred('a', 'NO BET')],
  } as FeedItem;
  assert.deepEqual(applyDecisionFilter([item], 'PLAY'), []);
  assert.equal(item.predictions.length, 1);
});
