import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore';
import { testEnvironment } from './helpers.js';
import { seedSpace } from './provision-fixture.js';
let env;
before(async () => { env = await testEnvironment(); });
beforeEach(async () => { await env.clearFirestore(); await seedSpace(env); });
after(async () => { await env?.cleanup(); });
const client = (uid, verified = true) => env.authenticatedContext(uid, { email_verified: verified, email: uid + '@example.test' }).firestore();
test('only configured verified members can read shared private data', async () => {
  for (const uid of ['alice', 'bob']) {
    const result = await assertSucceeds(getDoc(doc(client(uid), 'spaces/marsito/tasks/private')));
    assert.equal(result.data().title, 'Plan privado');
  }
  for (const db of [env.unauthenticatedContext().firestore(), client('outsider'), client('alice', false)]) await assertFails(getDoc(doc(db, 'spaces/marsito/tasks/private')));
  await assertFails(getDoc(doc(client('alice'), 'spaces/other/tasks/private')));
});
test('revoked members and third members outside the two configured profiles are denied', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'betaMembers/alice'), { enabled: false });
    await setDoc(doc(context.firestore(), 'betaMembers/third'), { enabled: true, spaceId: 'marsito' });
  });
  for (const uid of ['alice', 'third']) await assertFails(getDoc(doc(client(uid), 'spaces/marsito/tasks/private')));
});
test('a user can inspect only their own membership and can never approve themselves', async () => {
  const db = client('alice', false);
  await assertSucceeds(getDoc(doc(db, 'betaMembers/alice')));
  await assertFails(getDoc(doc(db, 'betaMembers/bob')));
  await assertFails(getDocs(collection(db, 'betaMembers')));
  await assertFails(setDoc(doc(client('outsider'), 'betaMembers/outsider'), { enabled: true, spaceId: 'marsito' }));
  await assertFails(updateDoc(doc(client('alice'), 'spaces/marsito'), { profiles: [{ id: 'outsider', name: 'Fake' }, { id: 'bob', name: 'Bob' }] }));
});
test('unknown paths and arbitrary entity writes stay denied', async () => {
  await assertFails(setDoc(doc(client('alice'), 'spaces/marsito/tasks/invalid'), { title: 'Missing other fields' }));
  await assertFails(getDoc(doc(client('alice'), 'unexpected/path')));
});
