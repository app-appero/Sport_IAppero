import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MIN_BAR_RATIO,
  isScorersUnsupported,
  shouldPollScorers,
  formatScorerPct,
  maxProbability,
  positionLong,
  positionShort,
  scorerA11yLabel,
  scorerBarRatio,
} from '../utils/scorers.ts';

const rossi = {
  player_id: 1,
  name: 'M. Rossi',
  team_id: 10,
  team: 'Casa FC',
  position: 'F',
  probability: 0.31,
  scored: null,
};

test('formatScorerPct rounds to the integer and clamps', () => {
  assert.equal(formatScorerPct(0.31), '31%');
  assert.equal(formatScorerPct(0.146), '15%');
  assert.equal(formatScorerPct(0), '0%');
  assert.equal(formatScorerPct(1.4), '100%');
  assert.equal(formatScorerPct(-0.2), '0%');
  assert.equal(formatScorerPct(Number.NaN), '—');
});

test('positionShort / positionLong map the roles', () => {
  assert.equal(positionShort('F'), 'ATT');
  assert.equal(positionShort('M'), 'CEN');
  assert.equal(positionShort('D'), 'DIF');
  assert.equal(positionShort('x'), '—');
  assert.equal(positionLong('F'), 'attaccante');
  assert.equal(positionLong('M'), 'centrocampista');
  assert.equal(positionLong('D'), 'difensore');
});

test('scorerBarRatio is relative to the max, with a visible minimum', () => {
  assert.equal(scorerBarRatio(0.31, 0.31), 1);
  assert.equal(scorerBarRatio(0.155, 0.31), 0.5);
  assert.equal(scorerBarRatio(0.001, 0.31), MIN_BAR_RATIO);
  assert.equal(scorerBarRatio(0.2, 0), MIN_BAR_RATIO);
  assert.equal(maxProbability([{ probability: 0.1 }, { probability: 0.31 }]), 0.31);
  assert.equal(maxProbability([]), 0);
});

test('scorerA11yLabel reads name, role and percent', () => {
  assert.equal(scorerA11yLabel(rossi), 'M. Rossi, attaccante, 31 percento');
  assert.equal(
    scorerA11yLabel({ ...rossi, scored: true }),
    'M. Rossi, attaccante, 31 percento, ha segnato',
  );
  assert.equal(scorerA11yLabel({ ...rossi, scored: false }), 'M. Rossi, attaccante, 31 percento');
});

test('competizione non coperta: sezione nascosta e nessun polling', () => {
  assert.equal(isScorersUnsupported({ status: 'unsupported' }), true);
  assert.equal(isScorersUnsupported({ status: 'lineup_pending' }), false);
  assert.equal(isScorersUnsupported(undefined), false);
  assert.equal(shouldPollScorers({ available: false, status: 'unsupported' }), false);
  assert.equal(shouldPollScorers({ available: false, status: 'lineup_pending' }), true);
  assert.equal(shouldPollScorers({ available: false }), true); // BFF vecchio senza status
  assert.equal(shouldPollScorers({ available: true, status: 'ready' }), false);
  assert.equal(shouldPollScorers(undefined), false);
});
