import test from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, weekDays } from '../src/lib/date.js';
test('date keys use the local calendar, including leap day', () => {
  assert.equal(dateKey(new Date(2024, 1, 29, 23, 30)), '2024-02-29');
});
test('weeks start Monday and cross year boundaries without UTC conversion', () => {
  assert.deepEqual(weekDays('2025-01-01'), ['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05']);
  assert.equal(weekDays('2024-03-01')[3], '2024-02-29');
});
