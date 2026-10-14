import assert from 'node:assert/strict';
import { test } from 'node:test';

import { scorerA11yLabel } from '../utils/scorers.ts';

const player = {
  player_id: 1,
  name: 'M. Rossi',
  team_id: 10,
  team: 'Casa FC',
  position: 'D',
  probability: 0.2,
  scored: null,
  booked: true,
};

test('yellow-card label says the player was booked, not that they scored', () => {
  assert.equal(scorerA11yLabel(player, 'cards'), 'M. Rossi, difensore, 20 percento, ammonito');
  assert.equal(scorerA11yLabel(player), 'M. Rossi, difensore, 20 percento');
  assert.equal(scorerA11yLabel({ ...player, scored: true }), 'M. Rossi, difensore, 20 percento, ha segnato');
  assert.equal(scorerA11yLabel({ ...player, booked: null }, 'cards'), 'M. Rossi, difensore, 20 percento');
});
