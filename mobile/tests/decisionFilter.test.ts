import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyDecisionFilter,
  decisionCode,
  decisionHint,
  parseDecisionFilter,
  predictionMatchesDecision,
} from '../utils/decisionFilter.ts';
import type { FeedItem } from '../types/api.ts';

const pred = (id: string, code: string | null) =>
  ({ id, decision: code == null ? null : { code } }) as FeedItem['predictions'][number];

test('each state has a plain explanation', () => {
  assert.match(decisionHint('all'), /paga di più/);
  assert.match(decisionHint('PLAY'), /paga più/);
  assert.match(decisionHint('BORDERLINE'), /poco di più/);
  assert.match(decisionHint('NO BET'), /paga meno/);
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
