import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { testEnvironment } from './helpers.js';
import { seedSpace } from './provision-fixture.js';
import { addExpense, settleCycle, historyPage, cycleExpenses } from '../../src/firebase/accounts.js';
import { getBalanceFromPaid } from '../../src/lib/money.js';
let env; before(async () => { env = await testEnvironment(); }); beforeEach(async () => { await env.clearFirestore(); await seedSpace(env); }); after(() => env?.cleanup());
const ctx = uid => ({ uid, spaceId: 'marsito', db: env.authenticatedContext(uid, { email_verified: true }).firestore() });
test('integer contributions derive the half-difference balance and archived history', async () => {
  const a = ctx('alice'), b = ctx('bob');
  await addExpense(a, { concept: 'Compra', amount: '30' }, 'a'); await addExpense(b, { concept: 'Pan', amount: '10' }, 'b');
  await addExpense(a, { concept: 'Compra', amount: '30' }, 'a');
  const cycle = (await getDoc(doc(a.db, 'spaces/marsito/cycles/initial'))).data();
  assert.equal(cycle.count, 2); assert.deepEqual(getBalanceFromPaid(cycle, [{ id: 'alice' }, { id: 'bob' }]).transfer, { from: 'bob', to: 'alice', cents: 1000 });
  assert.deepEqual(getBalanceFromPaid({ paidA: 0, paidB: 101 }, [{ id: 'alice' }, { id: 'bob' }]).shares, { alice: 51, bob: 50 });
  await settleCycle(a, { expectedCycleId: 'initial' }, 'next');
  assert.equal((await getDoc(doc(b.db, 'spaces/marsito'))).data().activeCycleId, 'next');
  assert.equal((await cycleExpenses(a, 'initial')).length, 2);
  const page = await historyPage(a); assert.equal(page.items[0].id, 'initial'); assert.equal(page.items[0].count, 2);
  await assert.rejects(settleCycle(b, { expectedCycleId: 'initial' }, 'stale'));
});
test('simultaneous settlements and a competing expense preserve every cent over ten races', async () => {
  const a = ctx('alice'), b = ctx('bob');
  for (let i = 0; i < 10; i++) {
    const id = (await getDoc(doc(a.db, 'spaces/marsito'))).data().activeCycleId;
    await addExpense(a, { concept: 'Base ' + i, amount: '1' }, 'base-' + i);
    const results = await Promise.allSettled([settleCycle(a, { expectedCycleId: id }, 'close-a-' + i), settleCycle(b, { expectedCycleId: id }, 'close-b-' + i), addExpense(b, { concept: 'Race ' + i, amount: '0,01' }, 'race-' + i)]);
    assert.equal(results.slice(0, 2).filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results[2].status, 'fulfilled', results[2].reason?.stack);
  }
  const cycles = (await getDocs(collection(a.db, 'spaces/marsito/cycles'))).docs;
  assert.equal(cycles.filter(s => s.data().status === 'closed').length, 10);
  assert.equal(cycles.reduce((n, s) => n + s.data().paidA + s.data().paidB, 0), 1010);
  let expenseCount = 0; for (const cycle of cycles) expenseCount += (await cycleExpenses(a, cycle.id)).length;
  assert.equal(expenseCount, 20);
});
test('direct writes cannot forge counters, bypass settlement protocol or modify closed expenses', async () => {
  const a = ctx('alice'), b = ctx('bob'), cycle = doc(a.db, 'spaces/marsito/cycles/initial');
  await assert.rejects(settleCycle(a, { expectedCycleId: 'initial' }, 'empty'));
  await assertFails(updateDoc(doc(a.db, 'spaces/marsito'), { activeCycleId: 'missing' }));
  await assertFails(updateDoc(cycle, { paidA: 100, count: 1, lastExpenseId: 'missing' }));
  const expense = { concept: 'Fake', cents: 100, date: '2026-08-15', profileId: 'alice', createdAt: serverTimestamp() };
  await assertFails(setDoc(doc(a.db, 'spaces/marsito/cycles/initial/expenses/missing-counter'), expense));
  for (const [i, patch] of [{ cents: 0 }, { cents: -1 }, { cents: 1.5 }, { cents: 100000001 }, { profileId: 'bob' }, { extra: true }].entries()) {
    const batch = writeBatch(a.db); const id = 'bad-' + i;
    batch.set(doc(a.db, 'spaces/marsito/cycles/initial/expenses', id), { ...expense, ...patch });
    batch.update(cycle, { paidA: patch.cents ?? 100, count: 1, lastExpenseId: id });
    await assertFails(batch.commit());
  }
  const wrongCounter = writeBatch(a.db); wrongCounter.set(doc(a.db, 'spaces/marsito/cycles/initial/expenses/wrong'), expense); wrongCounter.update(cycle, { paidB: 100, count: 1, lastExpenseId: 'wrong' }); await assertFails(wrongCounter.commit());
  await addExpense(a, { concept: 'Real', amount: '1' }, 'real');
  await assertFails(setDoc(doc(b.db, 'spaces/marsito/cycles/initial/expenses/real'), { ...expense, profileId: 'bob' }));
  await settleCycle(a, { expectedCycleId: 'initial' }, 'closed-next');
  await assertFails(updateDoc(cycle, { paidA: 999 }));
  await assertFails(updateDoc(doc(a.db, 'spaces/marsito/cycles/initial/expenses/real'), { cents: 999 }));
});
test('history pagination returns more than twenty archived cycles without duplicates', async () => {
  const a = ctx('alice');
  await env.withSecurityRulesDisabled(async context => {
    for (let i = 0; i < 23; i++) await setDoc(doc(context.firestore(), 'spaces/marsito/cycles', 'history-' + i), { status: 'closed', paidA: 100, paidB: 0, count: 1, createdAt: Timestamp.fromMillis(i * 1000), closedAt: Timestamp.fromMillis(i * 1000), settledBy: 'alice', nextCycleId: 'other', lastExpenseId: 'x' });
  });
  const one = await historyPage(a); const two = await historyPage(a, one.cursor);
  assert.equal(one.items.length, 20); assert.equal(two.items.length, 3); assert.equal(new Set([...one.items, ...two.items].map(x => x.id)).size, 23);
});
