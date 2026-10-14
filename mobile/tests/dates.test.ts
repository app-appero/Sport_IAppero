import assert from 'node:assert/strict';
import test from 'node:test';

import { formatEventTime } from '../utils/dates.ts';

test('tennis shows its wall-clock time when there is no instant', () => {
  assert.equal(formatEventTime(null, '14:30'), '14:30');
  assert.equal(formatEventTime(undefined, '09:05:00'), '09:05');
  assert.equal(formatEventTime(null, null), 'Orario n/d');
  assert.equal(formatEventTime(null, 'tbd'), 'Orario n/d');
});
