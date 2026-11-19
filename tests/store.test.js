import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/data/store.js';
const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; };
function setup() { const storage = memory(); const store = createStore(storage); store.dispatch('login', { profileId: 'alex' }); return { store, storage }; }
test('local changes survive reload, notify subscribers and share profiles', () => {
  const { store, storage } = setup(); let called = 0; const off = store.subscribe(() => called++);
  store.dispatch('task/add', { title: 'Comprar pan', description: 'Integral' });
  off(); store.dispatch('login', { profileId: 'sam' });
  assert.equal(called, 1);
  const reloaded = createStore(storage).getState();
  assert.equal(reloaded.activeProfileId, 'sam');
  assert.equal(reloaded.tasks.at(-1).title, 'Comprar pan');
  const snapshot = store.getState(); snapshot.tasks.length = 0;
  assert.ok(store.getState().tasks.length > 0);
});
test('creating data works on HTTP LAN where randomUUID is unavailable', () => {
  const { store } = setup();
  const original = globalThis.crypto.randomUUID;
  globalThis.crypto.randomUUID = undefined;
  try {
    store.dispatch('task/add', { title: 'Desde Android', description: 'HTTP en la red local' });
    store.dispatch('task/add', { title: 'Otra tarea', description: 'ID independiente' });
    const tasks = store.getState().tasks.slice(-2);
    assert.equal(tasks[0].title, 'Desde Android');
    assert.match(tasks[0].id, /^[0-9a-f-]{36}$/);
    assert.notEqual(tasks[0].id, tasks[1].id);
  } finally { globalThis.crypto.randomUUID = original; }
});
test('registration renames a demo profile without adding a third or storing a password', () => {
  const { store } = setup();
  store.dispatch('register', { profileId: 'alex', name: 'Mar', password: 'not-stored' });
  assert.equal(store.getState().profiles.length, 2);
  assert.equal(store.getState().profiles[0].name, 'Mar');
  assert.ok(!JSON.stringify(store.getState()).includes('not-stored'));
  store.dispatch('logout'); assert.equal(store.getState().activeProfileId, null);
  assert.throws(() => store.dispatch('task/add', { title: 'x', description: 'y' }));
});
test('events validate required fields, URLs and collect attendance and comments by author', () => {
  const { store } = setup();
  const event = { title: 'Cena', date: '2026-08-15', time: '21:00', description: 'En casa' };
  for (const key of ['title', 'date', 'time', 'description']) assert.throws(() => store.dispatch('event/add', { ...event, [key]: '' }));
  assert.throws(() => store.dispatch('event/add', { ...event, image: 'javascript:alert(1)' }));
  assert.throws(() => store.dispatch('event/add', { ...event, date: '2026-02-30' }));
  store.dispatch('event/add', event); const id = store.getState().events.at(-1).id;
  store.dispatch('event/attendance', { id, answer: 'yes' });
  store.dispatch('login', { profileId: 'sam' });
  store.dispatch('event/attendance', { id, answer: 'no' });
  store.dispatch('event/comment', { id, text: '<b>Hola</b>' });
  const saved = store.getState().events.at(-1);
  assert.deepEqual(saved.attendance, { alex: 'yes', sam: 'no' });
  assert.equal(saved.comments[0].profileId, 'sam'); assert.equal(saved.comments[0].text, '<b>Hola</b>');
});
test('shared tasks toggle; recipes require ingredients and weekly menu uses existing recipes', () => {
  const { store } = setup();
  assert.throws(() => store.dispatch('task/add', { title: 'x', description: ' ' }));
  store.dispatch('task/add', { title: 'Mesa', description: 'Limpiar' });
  const id = store.getState().tasks.at(-1).id; store.dispatch('task/toggle', { id });
  assert.equal(store.getState().tasks.at(-1).done, true);
  assert.throws(() => store.dispatch('recipe/add', { title: 'x', ingredients: [], instructions: 'Mezclar' }));
  store.dispatch('recipe/add', { title: 'Sopa', ingredients: ['Agua', 'Sal'], instructions: 'Hervir' });
  const recipeId = store.getState().recipes.at(-1).id;
  store.dispatch('menu/set', { date: '2026-08-17', slot: 'lunch', recipeId });
  assert.equal(store.getState().menu['2026-08-17'].lunch, recipeId);
  assert.throws(() => store.dispatch('menu/set', { date: '2026-08-17', slot: 'lunch', recipeId: 'missing' }));
  store.dispatch('menu/set', { date: '2026-08-17', slot: 'lunch', recipeId: '' });
  assert.equal(store.getState().menu['2026-08-17'].lunch, '');
});
test('settlement archives the current cycle and begins an empty one', () => {
  const { store, storage } = setup();
  // Seed includes demo expenses: settle those first.
  store.dispatch('expense/settle');
  assert.throws(() => store.dispatch('expense/settle'));
  store.dispatch('expense/add', { concept: 'Compra', amount: '30' });
  store.dispatch('login', { profileId: 'sam' });
  store.dispatch('expense/add', { concept: 'Pan', amount: '10' });
  store.dispatch('expense/settle');
  const state = createStore(storage).getState();
  assert.equal(state.expenses.length, 0);
  const cycle = state.settlements.at(-1);
  assert.equal(cycle.expenses.length, 2); assert.equal(cycle.balance.total, 4000);
  assert.deepEqual(cycle.balance.transfer, { from: 'sam', to: 'alex', cents: 1000 });
  store.dispatch('reset'); assert.equal(store.getState().settlements.length, 0);
});
test('a truncated settlement is rejected instead of breaking account rendering', () => {
  const { store } = setup();
  store.dispatch('expense/settle');
  const saved = store.getState();
  saved.settlements[0].profiles = [null, null];
  saved.settlements[0].balance.transfer = { from: 'alex', to: 'sam', cents: 'oops' };
  const restored = createStore({ getItem: () => JSON.stringify(saved), setItem() {} }).getState();
  assert.equal(restored.settlements.length, 0);
  assert.match(restored.storageWarning, /datos|guardad/i);
});
test('corrupt storage and write failures produce visible warnings without losing session work', () => {
  const corrupt = createStore({ getItem: () => '{bad', setItem() {} });
  assert.match(corrupt.getState().storageWarning, /datos|guardad/i);
  const invalid = createStore({ getItem: () => '{"version":1,"tasks":[]}', setItem() {} });
  assert.equal(invalid.getState().profiles.length, 2);
  const blocked = createStore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } });
  blocked.dispatch('login', { profileId: 'alex' });
  blocked.dispatch('task/add', { title: 'Temporal', description: 'Sin persistencia' });
  assert.equal(blocked.getState().tasks.at(-1).title, 'Temporal');
  assert.match(blocked.getState().storageWarning, /guard|almacen/i);
});
