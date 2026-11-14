import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STALE_WARNING, staleLine } from '../utils/feedBanner.ts';
import { formatProbability, outcomesFor } from '../utils/probability.ts';

const pick = (confidence: number | null, probabilities: { key: string; label: string; value: number }[] = []) => ({
  probabilities,
  prediction: { type: 'h2h', selection: { id: '1', name: 'Roma' }, confidence },
});

test('missing probability is never shown as 0%', () => {
  assert.deepEqual(outcomesFor(pick(null)), []);
  assert.deepEqual(outcomesFor({ ...pick(null), probabilities: undefined as never }), []);
  assert.equal(formatProbability(null), '—');
  assert.equal(formatProbability(undefined), '—');
  assert.equal(formatProbability(Number.NaN), '—');
});

test('a real 0 is kept as 0%, a confidence becomes the single row', () => {
  assert.equal(formatProbability(0), '0%');
  assert.equal(formatProbability(0.554), '55%');
  assert.equal(formatProbability(1.4), '100%');
  assert.deepEqual(outcomesFor(pick(0)), [{ key: '1', label: 'Roma', value: 0 }]);
  assert.deepEqual(outcomesFor(pick(0.6)), [{ key: '1', label: 'Roma', value: 0.6 }]);
});

test('engine probabilities win over the confidence fallback', () => {
  const rows = [{ key: 'x', label: 'Pari', value: 0.3 }];
  assert.deepEqual(outcomesFor(pick(0.6, rows)), rows);
});

test('stale line only when the feed is flagged stale', () => {
  assert.equal(staleLine({}), null);
  assert.equal(staleLine({ is_stale: false, snapshot_age_seconds: 500 }), null);
  assert.match(staleLine({ is_stale: true, snapshot_age_seconds: 42.4 }) ?? '', /circa 42s/);
  assert.match(staleLine({ is_stale: true }) ?? '', /ultimi disponibili/);
  assert.equal(STALE_WARNING, 'served_from_stale_cache');
});
