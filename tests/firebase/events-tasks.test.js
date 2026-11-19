import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, updateDoc, setDoc, deleteDoc, serverTimestamp, disableNetwork, enableNetwork } from 'firebase/firestore';
import { testEnvironment } from './helpers.js';
import { seedSpace } from './provision-fixture.js';
import { createEvent, setAttendance, addComment } from '../../src/firebase/events.js';
import { createTask, toggleTask } from '../../src/firebase/tasks.js';
let env;
before(async () => { env = await testEnvironment(); }); beforeEach(async () => { await env.clearFirestore(); await seedSpace(env); }); after(() => env?.cleanup());
const context = uid => ({ db: env.authenticatedContext(uid, { email_verified: true }).firestore(), uid, spaceId: 'marsito' });
const event = { title: 'Cena real', description: 'Terraza', date: '2026-08-15', time: '20:30', image: '', info: '' };
test('events, attendance, comments and tasks are shared and authors are enforced', async () => {
  const a = context('alice'), b = context('bob');
  await createEvent(a, event, 'event-one');
  await setAttendance(a, { id: 'event-one', answer: 'yes' }); await setAttendance(b, { id: 'event-one', answer: 'no' });
  const saved = (await getDoc(doc(b.db, 'spaces/marsito/events/event-one'))).data();
  assert.deepEqual(saved.attendance, { alice: 'yes', bob: 'no' });
  await addComment(b, { id: 'event-one', text: '<b>Hola</b>' }, 'comment-one');
  const comment = (await getDoc(doc(a.db, 'spaces/marsito/events/event-one/comments/comment-one'))).data();
  assert.equal(comment.profileId, 'bob'); assert.equal(comment.text, '<b>Hola</b>');
  await createTask(a, { title: 'Compra', description: 'Pan' }, 'task-one');
  await toggleTask(b, { id: 'task-one' });
  assert.equal((await getDoc(doc(a.db, 'spaces/marsito/tasks/task-one'))).data().done, true);
  await createTask(a, { title: 'Compra', description: 'Pan' }, 'task-one');
  assert.equal((await getDocs(collection(a.db, 'spaces/marsito/tasks'))).size, 2);
});
test('direct clients cannot impersonate authors, change other attendance, inject fields or edit comments', async () => {
  const a = context('alice'), b = context('bob'); await createEvent(a, event, 'e');
  const eventRef = doc(b.db, 'spaces/marsito/events/e');
  for (const patch of [{ title: 'Hacked' }, { attendance: { alice: 'no' } }, { attendance: { bob: 'maybe' } }, { extra: true }]) await assertFails(updateDoc(eventRef, patch));
  await assertFails(setDoc(doc(b.db, 'spaces/marsito/events/spoof'), { ...event, profileId: 'alice', attendance: {}, createdAt: serverTimestamp() }));
  await addComment(b, { id: 'e', text: 'Hola' }, 'c');
  await assertFails(updateDoc(doc(b.db, 'spaces/marsito/events/e/comments/c'), { text: 'Editado' }));
  await assertFails(deleteDoc(doc(b.db, 'spaces/marsito/events/e/comments/c')));
  await assertFails(updateDoc(doc(b.db, 'spaces/marsito/tasks/private'), { description: 'Otra' }));
});
test('invalid events and empty text are rejected by both helpers and direct rules', async () => {
  const a = context('alice');
  for (const patch of [{ title: '' }, { info: 'javascript:alert(1)' }, { date: '2026-02-30' }, { time: '25:00' }, { description: 'x'.repeat(5001) }]) await assert.rejects(createEvent(a, { ...event, ...patch }, crypto.randomUUID()));
  for (const patch of [{ title: ' ' }, { info: 'javascript:alert(1)' }, { date: 'not-a-date' }, { time: '25:00' }, { title: 'x'.repeat(121) }]) await assertFails(setDoc(doc(a.db, 'spaces/marsito/events', crypto.randomUUID()), { ...event, ...patch, profileId: 'alice', attendance: {}, createdAt: serverTimestamp() }));
  await assert.rejects(createTask(a, { title: 'x', description: ' ' }, 'invalid'));
});
test('offline transactions do not queue creations for later replay', async () => {
  const a = context('alice'); await disableNetwork(a.db);
  try { await assert.rejects(createTask(a, { title: 'Offline', description: 'Must not queue' }, 'offline')); }
  finally { await enableNetwork(a.db); }
  assert.equal((await getDoc(doc(context('bob').db, 'spaces/marsito/tasks/offline'))).exists(), false);
});
