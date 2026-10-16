import assert from 'node:assert/strict';
import { test } from 'node:test';

import { compareMarketTypes, groupsFromTypes, marketGroup } from '../utils/marketGroups.ts';

test('lines of the same kind share one group', () => {
  assert.equal(marketGroup('under_over_1_5').id, 'under_over');
  assert.equal(marketGroup('under_over_3_5').id, 'under_over');
  assert.equal(marketGroup('under_over_1_5').label, 'Under/Over gol');
  assert.equal(marketGroup('cards_line_4_5').id, 'cards');
  assert.equal(marketGroup('cards_line_6_5').label, 'Cartellini');
  assert.equal(marketGroup('corners_line_8_5').id, 'corners');
  assert.equal(marketGroup('h2h').id, 'h2h');
  assert.equal(marketGroup('over_under_games').id, marketGroup('total_games').id);
});

test('a match only lists groups it actually has, in a stable order', () => {
  const groups = groupsFromTypes([
    'cards_line_5_5',
    'under_over_2_5',
    'cards_line_3_5',
    'h2h',
    'under_over_1_5',
  ]);
  assert.deepEqual(
    groups.map((group) => group.id),
    ['h2h', 'under_over', 'cards'],
  );
});

test('inside a group the lower line comes first', () => {
  const types = ['under_over_3_5', 'cards_line_6_5', 'under_over_1_5', 'cards_line_3_5', 'h2h'];
  assert.deepEqual([...types].sort(compareMarketTypes), [
    'h2h',
    'under_over_1_5',
    'under_over_3_5',
    'cards_line_3_5',
    'cards_line_6_5',
  ]);
});
