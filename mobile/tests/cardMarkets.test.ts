import assert from 'node:assert/strict';
import { test } from 'node:test';

import { marketFamily, topMarkets } from '../utils/cardMarkets.ts';
import { initials, lineupChip, otherScorersCount, pickCardScorers } from '../utils/scorers.ts';

function pred(type: string, confidence: number | null, name = 'x') {
  return {
    id: `${type}-${name}-${confidence}`,
    prediction: { type, confidence, selection: { id: name, name } },
  } as never;
}

test('marketFamily groups cards lines together', () => {
  assert.equal(marketFamily('cards_line_4_5'), 'cards_line');
  assert.equal(marketFamily('h2h'), 'h2h');
});

test('topMarkets keeps the best per family, strongest first, max 3', () => {
  const picked = topMarkets([
    pred('h2h', 0.5),
    pred('cards_line_4_5', 0.9),
    pred('cards_line_5_5', 0.95),
    pred('goal_no_goal', 0.7),
    pred('under_over_2_5', 0.6),
  ]);
  assert.deepEqual(
    picked.map((p) => p.prediction.type),
    ['cards_line_5_5', 'goal_no_goal', 'under_over_2_5'],
  );
});

test('topMarkets puts the preferred market first and honours exclude', () => {
  const list = [pred('h2h', 0.5), pred('goal_no_goal', 0.7), pred('under_over_2_5', 0.6)];
  assert.equal(topMarkets(list, { preferredMarket: 'h2h' })[0].prediction.type, 'h2h');
  assert.deepEqual(
    topMarkets(list, { exclude: ['goal_no_goal'] }).map((p) => p.prediction.type),
    ['under_over_2_5', 'h2h'],
  );
});

test('topMarkets ignores null confidences when ranking but still lists them last', () => {
  const picked = topMarkets([pred('h2h', null), pred('goal_no_goal', 0.4)]);
  assert.deepEqual(picked.map((p) => p.prediction.type), ['goal_no_goal', 'h2h']);
});

const player = (id: number, team_id: number, probability: number) =>
  ({ player_id: id, name: `P${id}`, team_id, team: `T${team_id}`, position: 'F', probability, scored: null }) as never;

test('initials', () => {
  assert.equal(initials('A. Ferrero'), 'AF');
  assert.equal(initials('Lautaro Martinez'), 'LM');
  assert.equal(initials('Pelé'), 'P');
  assert.equal(initials(''), '—');
});

test('pickCardScorers takes the best of each team, then fills by probability', () => {
  const data = {
    available: true,
    status: 'ready',
    teams: [
      { top: [player(1, 10, 0.41), player(2, 10, 0.39)], players: [] },
      { top: [player(3, 20, 0.2)], players: [] },
    ],
  };
  const two = pickCardScorers(data as never, 2);
  assert.deepEqual(two.map((p) => p.player_id), [1, 3]);
  const three = pickCardScorers(data as never, 3);
  assert.deepEqual(three.map((p) => p.player_id), [1, 2, 3]);
});

test('pickCardScorers is empty when not ready or unsupported', () => {
  assert.deepEqual(pickCardScorers(undefined), []);
  assert.deepEqual(pickCardScorers({ available: false, status: 'lineup_pending', teams: [] } as never), []);
  assert.deepEqual(pickCardScorers({ available: true, status: 'unsupported', teams: [] } as never), []);
});

test('lineupChip maps the three states and hides unsupported', () => {
  assert.equal(lineupChip(undefined), null);
  assert.equal(lineupChip({ available: false, status: 'unsupported', teams: [] } as never), null);
  assert.equal(lineupChip({ available: false, status: 'lineup_pending', teams: [] } as never)?.kind, 'waiting');
  const ready = { available: true, status: 'ready', teams: [{ top: [], players: [] }] };
  assert.equal(lineupChip({ ...ready, lineup_type: 'official' } as never)?.kind, 'official');
  assert.equal(lineupChip({ ...ready, lineup_type: 'probable' } as never)?.kind, 'estimate');
  assert.equal(lineupChip(ready as never)?.kind, 'official');
});

test('otherScorersCount subtracts the shown ones and never goes negative', () => {
  const data = { available: true, teams: [{ top: [], players: [player(1, 1, 0.1), player(2, 1, 0.1), player(3, 1, 0.1)] }] };
  assert.equal(otherScorersCount(data as never, 2), 1);
  assert.equal(otherScorersCount(data as never, 9), 0);
  assert.equal(otherScorersCount(undefined, 2), 0);
});

import { resolveTennisWinner, setPills } from '../utils/tennisCard.ts';

const players = [
  { id: '1', name: 'M. Rossi', role: 'home' },
  { id: '2', name: 'T. Keller', role: 'away' },
];
const winnerPred = (id: string, name: string, confidence: number | null) =>
  ({ prediction: { type: 'match_winner', confidence, selection: { id, name } } }) as never;

test('resolveTennisWinner maps player_2 and returns the complement', () => {
  const w = resolveTennisWinner(winnerPred('player_2', 'Second Player', 0.7), players);
  assert.deepEqual(w?.names, ['T. Keller', 'M. Rossi']);
  assert.equal(w?.favoriteIndex, 1);
  assert.ok(Math.abs((w?.probs[0] ?? 0) - 0.7) < 1e-9);
  assert.ok(Math.abs((w?.probs[1] ?? 0) - 0.3) < 1e-9);
});

test('resolveTennisWinner falls back to the participant name', () => {
  const w = resolveTennisWinner(winnerPred('x', 'M. Rossi', 0.6), players);
  assert.equal(w?.favoriteIndex, 0);
  assert.equal(w?.names[0], 'M. Rossi');
});

test('resolveTennisWinner is null without confidence, players or a match', () => {
  assert.equal(resolveTennisWinner(winnerPred('player_1', 'a', null), players), null);
  assert.equal(resolveTennisWinner(winnerPred('player_1', 'a', 0.6), players.slice(0, 1)), null);
  assert.equal(resolveTennisWinner(winnerPred('zzz', 'Nobody', 0.6), players), null);
});

test('setPills splits set scores and ignores empties', () => {
  assert.deepEqual(setPills('6-4 3-6 7-5'), ['6–4', '3–6', '7–5']);
  assert.deepEqual(setPills('2-1'), ['2–1']);
  assert.deepEqual(setPills(''), []);
});

import { bookingA11yLabel } from '../utils/scorers.ts';

const booking = (id: number, team_id: number, probability: number, booked: boolean | null = null) =>
  ({ player_id: id, name: `B${id}`, team_id, team: `T${team_id}`, position: 'M', probability, booked }) as never;

test('pickCardScorers also works on yellow-card data (booked instead of scored)', () => {
  const data = {
    available: true,
    status: 'ready',
    teams: [
      { top: [booking(1, 10, 0.38), booking(2, 10, 0.3)], players: [] },
      { top: [booking(3, 20, 0.31)], players: [] },
    ],
  };
  assert.deepEqual(pickCardScorers(data as never, 2).map((p: { player_id: number }) => p.player_id), [1, 3]);
  assert.equal(lineupChip(data as never)?.kind, 'official');
});

test('bookingA11yLabel says booked only once it happened', () => {
  const base = { name: 'D. Moretti', position: 'M', probability: 0.38 };
  assert.match(bookingA11yLabel({ ...base, booked: null }), /38 percento di essere ammonito$/);
  assert.match(bookingA11yLabel({ ...base, booked: true }), /è stato ammonito$/);
});

test('topMarkets with byFamily=false keeps every cards line', () => {
  const list = [pred('cards_line_4_5', 0.9), pred('cards_line_5_5', 0.8), pred('h2h', 0.5)];
  assert.deepEqual(
    topMarkets(list, { limit: 99, byFamily: false }).map((p) => p.prediction.type),
    ['cards_line_4_5', 'cards_line_5_5', 'h2h'],
  );
  assert.equal(topMarkets(list, { limit: 99 }).length, 2);
});
