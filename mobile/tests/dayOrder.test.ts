import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDayRows, isEventDone, sortDayEvents } from '../utils/dayOrder.ts';

const TODAY = '2026-10-13';
const ev = (id: string, start: string | null, status: string | null, calendar = TODAY) => ({
  event: { id, start_time: start, status, calendar_date: calendar },
});

test('finished, void and stuck-in-the-past matches are done; live and upcoming are not', () => {
  assert.equal(isEventDone({ status: 'FT', calendar_date: TODAY }, TODAY), true);
  assert.equal(isEventDone({ status: 'finished', calendar_date: TODAY }, TODAY), true);
  assert.equal(isEventDone({ status: 'PST', calendar_date: TODAY }, TODAY), true);
  assert.equal(isEventDone({ status: 'NS', calendar_date: '2026-10-12' }, TODAY), true);
  assert.equal(isEventDone({ status: 'NS', calendar_date: TODAY }, TODAY), false);
  assert.equal(isEventDone({ status: '2H', calendar_date: TODAY }, TODAY), false);
  assert.equal(isEventDone({ status: 'live', calendar_date: TODAY }, TODAY), false);
});

test('open matches by time ascending, finished ones after them, also by time', () => {
  const items = [
    ev('late', '2026-10-13T20:45:00+02:00', 'NS'),
    ev('done2', '2026-10-13T15:00:00+02:00', 'FT'),
    ev('early', '2026-10-13T12:30:00+02:00', 'NS'),
    ev('live', '2026-10-13T18:00:00+02:00', '2H'),
    ev('done1', '2026-10-13T12:00:00+02:00', 'FT'),
  ];
  const { open, done } = sortDayEvents(items, TODAY);
  assert.deepEqual(open.map((i) => i.event.id), ['early', 'live', 'late']);
  assert.deepEqual(done.map((i) => i.event.id), ['done1', 'done2']);
});

test('missing start times go last in their group and order is stable', () => {
  const items = [ev('a', null, 'NS'), ev('b', '2026-10-13T10:00:00Z', 'NS'), ev('c', null, 'NS')];
  assert.deepEqual(sortDayEvents(items, TODAY).open.map((i) => i.event.id), ['b', 'a', 'c']);
});

test('rows carry a single divider with the number of finished matches, and none when nothing is finished', () => {
  const some = buildDayRows(
    [ev('x', '2026-10-13T10:00:00Z', 'FT'), ev('y', '2026-10-13T11:00:00Z', 'NS')] as never,
    TODAY,
  );
  assert.deepEqual(some.map((r) => r.kind), ['event', 'divider', 'event']);
  assert.equal((some[1] as { count: number }).count, 1);
  const none = buildDayRows([ev('y', '2026-10-13T11:00:00Z', 'NS')] as never, TODAY);
  assert.deepEqual(none.map((r) => r.kind), ['event']);
});
