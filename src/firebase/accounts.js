import { doc, collection, serverTimestamp, getDocsFromServer, getDocFromServer, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { parseCents } from '../lib/money.js';
import { dateKey } from '../lib/date.js';
import { text } from '../data/validation.js';
import { entityRef, onlineTransaction } from './operations.js';
export async function addExpense(context, { concept, amount }, operationId) {
  const cents = parseCents(amount), title = text(concept, 150, 'El concepto');
  entityRef(context, 'cycles', operationId);
  for (let attempt = 0; attempt < 5; attempt++) {
    let observed = null;
    try { return await onlineTransaction(context, async tx => {
    const rootRef = doc(context.db, 'spaces', context.spaceId), root = await tx.get(rootRef);
    const config = root.data(), cycleRef = entityRef(context, 'cycles', config.activeCycleId);
    const expenseRef = doc(cycleRef, 'expenses', operationId);
    const cycle = await tx.get(cycleRef);
    observed = { id: config.activeCycleId, ...cycle.data() };
    const previous = await tx.get(expenseRef);
    if (previous.exists()) {
      if (previous.data().profileId !== context.uid || previous.data().cents !== cents || previous.data().concept !== title) throw new Error('Ese envío ya existe con otros datos.');
      return;
    }
    if (cycle.data()?.status !== 'open') throw Object.assign(new Error('El ciclo cambió.'), { code: 'cycle-changed' });
    const key = config.profiles[0].id === context.uid ? 'paidA' : 'paidB';
    tx.set(expenseRef, { concept: title, cents, date: dateKey(), profileId: context.uid, createdAt: serverTimestamp() });
    tx.update(cycleRef, { [key]: cycle.data()[key] + cents, count: cycle.data().count + 1, lastExpenseId: operationId });
    }); } catch (error) {
      if (!observed || attempt === 4 || !['permission-denied', 'cycle-changed'].includes(error.code)) throw error;
      // Rules can reject a stale write before Firestore reports its version conflict.
      // Retry only after a fresh, authorized server read proves a real cycle change.
      const root = await getDocFromServer(doc(context.db, 'spaces', context.spaceId));
      const fresh = await getDocFromServer(entityRef(context, 'cycles', root.data().activeCycleId));
      if (fresh.id === observed.id && ['status', 'count', 'paidA', 'paidB'].every(key => fresh.data()[key] === observed[key])) throw error;
    }
  }
}
export async function settleCycle(context, { expectedCycleId }, operationId) {
  entityRef(context, 'cycles', expectedCycleId);
  const nextRef = entityRef(context, 'cycles', operationId);
  return onlineTransaction(context, async tx => {
    const rootRef = doc(context.db, 'spaces', context.spaceId), root = await tx.get(rootRef);
    if (root.data().activeCycleId !== expectedCycleId) throw new Error('Ese ciclo ya se liquidó. Revisa las cuentas antes de continuar.');
    const currentRef = entityRef(context, 'cycles', expectedCycleId);
    const current = await tx.get(currentRef), next = await tx.get(nextRef);
    if (current.data()?.status !== 'open' || !current.data().count || next.exists()) throw new Error('No hay gastos pendientes que liquidar.');
    tx.update(currentRef, { status: 'closed', closedAt: serverTimestamp(), settledBy: context.uid, nextCycleId: operationId });
    tx.set(nextRef, { status: 'open', paidA: 0, paidB: 0, count: 0, lastExpenseId: null, createdAt: serverTimestamp(), closedAt: null, settledBy: null, nextCycleId: null });
    tx.update(rootRef, { activeCycleId: operationId });
  });
}
function mapped(snapshot) { const data = snapshot.data(); return { ...data, id: snapshot.id, createdAt: (data.closedAt || data.createdAt)?.toDate().toISOString() }; }
export async function historyPage(context, cursor = null) {
  const constraints = [where('status', '==', 'closed'), orderBy('closedAt', 'desc')];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(20));
  const result = await getDocsFromServer(query(collection(context.db, 'spaces', context.spaceId, 'cycles'), ...constraints));
  return { items: result.docs.map(mapped), cursor: result.docs.at(-1) || cursor, hasMore: result.size === 20 };
}
export async function cycleExpenses(context, cycleId) {
  entityRef(context, 'cycles', cycleId);
  const result = await getDocsFromServer(collection(context.db, 'spaces', context.spaceId, 'cycles', cycleId, 'expenses'));
  return result.docs.map(mapped).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
