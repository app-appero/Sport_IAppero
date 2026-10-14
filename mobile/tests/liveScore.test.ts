import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatGame, formatSets, isLiveEvent, liveLine } from '../utils/liveScore.ts';

const live = { is_live: true, sets: [[6, 4], [3, 2]], current_game: '30 - 15', server: 'home' as const, status_detail: 'Set 2' };
const participants = [{ name: 'A. Rossi' }, { name: 'B. Neri' }] as never;

test('live detection uses the live state or the status', () => {
  assert.equal(isLiveEvent({ status: 'live', live: null }), true);
  assert.equal(isLiveEvent({ status: 'NS', live }), true);
  assert.equal(isLiveEvent({ status: 'Finished', live: null }), false);
});

test('sets and game are formatted compactly', () => {
  assert.equal(formatSets([[6, 4], [3, 2]]), '6-4 3-2');
  assert.equal(formatSets([]), '');
  assert.equal(formatGame('30 - 15'), '30-15');
  assert.equal(formatGame('0 - 0'), null);
  assert.equal(formatGame('-'), null);
  assert.equal(formatGame(null), null);
});

test('live line names the server from the participants', () => {
  assert.deepEqual(liveLine({ live, participants }), { sets: '6-4 3-2', game: '30-15', server: 'A. Rossi' });
  assert.equal(liveLine({ live: null, participants }), null);
  assert.equal(
    liveLine({ live: { ...live, sets: [], current_game: null, server: null }, participants }),
    null,
  );
});
