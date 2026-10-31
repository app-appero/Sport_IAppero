import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cardTally } from '../utils/cardTally.ts';

const live = { live: true, done: false };
const done = { live: false, done: true };

test('not started or no predictions: no tally', () => {
  assert.equal(cardTally([null, null], { live: false, done: false }), null);
  assert.equal(cardTally([], live), null);
});

test('live counts wins over every prediction, open ones included', () => {
  assert.deepEqual(cardTally(['hit', 'hit', 'miss', null, null], live), { hits: 2, total: 5, tone: 'mid' });
  assert.deepEqual(cardTally([null, null], live), { hits: 0, total: 2, tone: 'neutral' });
});

test('finished colours by share won; closed without a result shows nothing', () => {
  assert.equal(cardTally(['hit', 'hit', 'hit', 'miss'], done)?.tone, 'good');
  assert.equal(cardTally(['hit', 'miss', 'miss', 'miss'], done)?.tone, 'mid');
  assert.equal(cardTally(['miss', 'miss', 'miss', 'miss', 'miss'], done)?.tone, 'bad');
  assert.equal(cardTally([null, null], done), null);
});
