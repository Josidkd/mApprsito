import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { requireEmulators } from './helpers.js';
export async function seedSpace(env, { uidA = 'alice', uidB = 'bob' } = {}) {
  requireEmulators();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'betaMembers', uidA), { spaceId: 'marsito', enabled: true }),
      setDoc(doc(db, 'betaMembers', uidB), { spaceId: 'marsito', enabled: true }),
      setDoc(doc(db, 'spaces/marsito'), { profiles: [{ id: uidA, name: 'Alice', color: 'coral' }, { id: uidB, name: 'Bob', color: 'sage' }], activeCycleId: 'initial' }),
      setDoc(doc(db, 'spaces/marsito/cycles/initial'), { status: 'open', paidA: 0, paidB: 0, count: 0, lastExpenseId: null, createdAt: Timestamp.now(), closedAt: null, settledBy: null, nextCycleId: null }),
      setDoc(doc(db, 'spaces/marsito/tasks/private'), { profileId: uidA, title: 'Plan privado', description: 'Solo para miembros', done: false, createdAt: Timestamp.now() })
    ]);
  });
}
