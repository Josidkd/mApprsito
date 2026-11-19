import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCents, getBalance } from '../src/lib/money.js';
const profiles = [{ id: 'a' }, { id: 'b' }];
test('decimal amounts accept comma and reject non-positive or fractional cents', () => {
  assert.equal(parseCents('12,50'), 1250);
  assert.equal(parseCents(' 12.5 '), 1250);
  for (const value of ['0', '-1', '1.234', 'NaN', '', 'Infinity', '1e2']) assert.throws(() => parseCents(value));
});
test('balance reimburses half the difference, not half the total', () => {
  const b = getBalance([{ profileId: 'a', cents: 3000 }, { profileId: 'b', cents: 1000 }], profiles);
  assert.equal(b.total, 4000);
  assert.deepEqual(b.shares, { a: 2000, b: 2000 });
  assert.deepEqual(b.transfer, { from: 'b', to: 'a', cents: 1000 });
});
test('odd cent split conserves the total and zero balance has no transfer', () => {
  const b = getBalance([{ profileId: 'b', cents: 101 }], profiles);
  assert.deepEqual(b.shares, { a: 51, b: 50 });
  assert.deepEqual(b.transfer, { from: 'a', to: 'b', cents: 51 });
  assert.equal(getBalance([], profiles).transfer, null);
});
