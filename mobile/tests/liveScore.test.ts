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

import { liveBoard, liveMinuteLabel } from '../utils/liveScore.ts';

test('liveMinuteLabel shows the minute, else a short detail', () => {
  assert.equal(liveMinuteLabel({ live: { is_live: true, sets: [], current_game: null, server: null, status_detail: null, minute: 63 } }), "63'");
  assert.equal(liveMinuteLabel({ live: { is_live: true, sets: [], current_game: null, server: null, status_detail: 'Intervallo' } }), 'Intervallo');
  assert.equal(liveMinuteLabel({ live: { is_live: true, sets: [], current_game: null, server: null, status_detail: 'a very long provider status' } }), null);
  assert.equal(liveMinuteLabel({ live: null }), null);
});

test('liveBoard builds one row per player with sets, point and server', () => {
  const board = liveBoard({
    participants: [{ id: '1', name: 'M. Rossi', role: 'player_1' }, { id: '2', name: 'T. Keller', role: 'player_2' }],
    live: { is_live: true, sets: [[6, 4], [3, 6], [2, 1]], current_game: '30 - 15', server: 'away', status_detail: null },
  });
  assert.deepEqual(board?.rows[0], { name: 'M. Rossi', games: [6, 3, 2], point: '30', serving: false });
  assert.deepEqual(board?.rows[1], { name: 'T. Keller', games: [4, 6, 1], point: '15', serving: true });
  assert.equal(board?.currentSet, 2);
});

test('liveBoard is null with nothing to show and hides placeholder points', () => {
  const players = [{ id: '1', name: 'A', role: null }, { id: '2', name: 'B', role: null }];
  assert.equal(liveBoard({ participants: players, live: { is_live: true, sets: [], current_game: null, server: null, status_detail: null } }), null);
  const b = liveBoard({ participants: players, live: { is_live: true, sets: [[1, 0]], current_game: '0 - 0', server: 'home', status_detail: null } });
  assert.equal(b?.rows[0].point, null);
  assert.equal(b?.rows[0].serving, true);
});
