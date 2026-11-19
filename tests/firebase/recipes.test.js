import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { testEnvironment } from './helpers.js';
import { seedSpace } from './provision-fixture.js';
import { createRecipe, setMenu } from '../../src/firebase/recipes.js';
let env; before(async () => { env = await testEnvironment(); }); beforeEach(async () => { await env.clearFirestore(); await seedSpace(env); }); after(() => env?.cleanup());
const ctx = uid => ({ uid, spaceId: 'marsito', db: env.authenticatedContext(uid, { email_verified: true }).firestore() });
const recipe = { title: '<b>Sopa</b>', ingredients: ['Agua', 'Sal'], instructions: 'Hervir', image: '', info: '' };
test('recipes remain literal and concurrent lunch/dinner menu changes are preserved', async () => {
  const a = ctx('alice'), b = ctx('bob'); await createRecipe(a, recipe, 'soup');
  const data = (await getDoc(doc(b.db, 'spaces/marsito/recipes/soup'))).data(); assert.equal(data.title, '<b>Sopa</b>'); assert.equal(data.ingredientsText, 'Agua\nSal');
  await Promise.all([setMenu(a, { date: '2026-08-15', slot: 'lunch', recipeId: 'soup' }), setMenu(b, { date: '2026-08-15', slot: 'dinner', recipeId: 'soup' })]);
  assert.deepEqual((await getDoc(doc(a.db, 'spaces/marsito/menu/2026-08-15'))).data(), { lunch: 'soup', dinner: 'soup' });
  await setMenu(b, { date: '2026-08-15', slot: 'lunch', recipeId: '' });
  assert.equal((await getDoc(doc(a.db, 'spaces/marsito/menu/2026-08-15'))).data().dinner, 'soup');
});
test('recipe validation and rules reject malformed ingredients, URLs, authors and menu references', async () => {
  const a = ctx('alice');
  for (const ingredients of [[], [1], [' '], ['x'.repeat(201)], Array(101).fill('x')]) await assert.rejects(createRecipe(a, { ...recipe, ingredients }, crypto.randomUUID()));
  const base = { title: 'Sopa', ingredientsText: 'Agua\nSal', instructions: 'Hervir', image: '', info: '', profileId: 'alice', createdAt: serverTimestamp() };
  for (const patch of [{ ingredientsText: '' }, { ingredientsText: ['Agua', 1] }, { ingredientsText: 'Agua\n \nSal' }, { ingredientsText: 'x'.repeat(201) }, { info: 'javascript:alert(1)' }, { profileId: 'bob' }, { extra: true }]) await assertFails(setDoc(doc(a.db, 'spaces/marsito/recipes', crypto.randomUUID()), { ...base, ...patch }));
  await assert.rejects(setMenu(a, { date: '2026-08-15', slot: 'lunch', recipeId: 'missing' }));
  await assertFails(setDoc(doc(a.db, 'spaces/marsito/menu/2026-08-15'), { lunch: 'missing', dinner: '' }));
  await assertFails(setDoc(doc(a.db, 'spaces/marsito/menu/2026-08-15'), { breakfast: '', dinner: '' }));
});
