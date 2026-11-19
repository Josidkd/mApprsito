import { seed } from './seed.js';
import { dateKey, validDate } from '../lib/date.js';
import { parseCents, getBalance } from '../lib/money.js';
export const STORAGE_KEY = 'marsito.demo.v1';
const copy = value => structuredClone(value);
const required = (value, name) => { const text = String(value ?? '').trim(); if (!text) throw new Error(`${name} es obligatorio.`); if (text.length > 10000) throw new Error(`${name} es demasiado largo.`); return text; };
function optionalURL(value) {
  const text = String(value ?? '').trim(); if (!text) return '';
  try { const url = new URL(text); if (['http:', 'https:'].includes(url.protocol)) return url.href; } catch { /* invalid URL */ }
  throw new Error('Usa una URL completa que empiece por https:// o http://.');
}
const id = () => globalThis.crypto.randomUUID();
function validState(s) {
  if (!s || s.version !== 1 || !Array.isArray(s.profiles) || s.profiles.length !== 2) return false;
  if (!s.profiles.every(p => p && typeof p.id === 'string' && typeof p.name === 'string') || new Set(s.profiles.map(p => p.id)).size !== 2) return false;
  const profile = value => s.profiles.some(p => p.id === value);
  if (s.activeProfileId !== null && !profile(s.activeProfileId)) return false;
  if (!['events', 'tasks', 'recipes', 'expenses', 'settlements'].every(key => Array.isArray(s[key]))) return false;
  if (!s.menu || typeof s.menu !== 'object' || Array.isArray(s.menu)) return false;
  const base = x => x && typeof x.id === 'string' && profile(x.profileId);
  const expense = x => base(x) && typeof x.concept === 'string' && Number.isSafeInteger(x.cents) && x.cents > 0 && validDate(x.date);
  return s.events.every(x => base(x) && typeof x.title === 'string' && validDate(x.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time) && typeof x.description === 'string' && x.attendance && typeof x.attendance === 'object' && Array.isArray(x.comments) && x.comments.every(c => base(c) && typeof c.text === 'string'))
    && s.tasks.every(x => base(x) && typeof x.title === 'string' && typeof x.description === 'string' && typeof x.done === 'boolean')
    && s.recipes.every(x => base(x) && typeof x.title === 'string' && Array.isArray(x.ingredients) && x.ingredients.every(i => typeof i === 'string') && typeof x.instructions === 'string')
    && s.expenses.every(expense)
    && s.settlements.every(x => x && typeof x.id === 'string' && typeof x.createdAt === 'string' && Array.isArray(x.expenses) && x.expenses.every(expense) && x.balance && Number.isSafeInteger(x.balance.total) && x.profiles?.length === 2)
    && Object.entries(s.menu).every(([key, slots]) => validDate(key) && slots && typeof slots === 'object' && Object.entries(slots).every(([slot, recipeId]) => ['lunch', 'dinner'].includes(slot) && (recipeId === '' || s.recipes.some(r => r.id === recipeId))));
}
export function createStore(storage) {
  let state = seed(); const listeners = new Set();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) { const saved = JSON.parse(raw); if (!validState(saved)) throw Error('invalid'); state = { ...saved, storageWarning: '' }; }
  } catch { state.storageWarning = 'No se pudieron leer los datos guardados. Mostramos una nueva demostración.'; }
  function save(next) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify({ ...next, storageWarning: '' })); }
    catch { next.storageWarning = 'No se pueden guardar los cambios en este navegador. Se conservarán solo durante esta sesión.'; }
    state = next; listeners.forEach(fn => fn());
  }
  return {
    getState: () => copy(state),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dispatch(type, payload = {}) {
      let next = copy(state);
      const find = (list, key) => { const item = list.find(x => x.id === key); if (!item) throw new Error('No se encontró el elemento.'); return item; };
      const profileId = next.activeProfileId;
      if (!['login', 'register', 'logout', 'reset'].includes(type) && !profileId) throw new Error('Entra en la demostración para continuar.');
      switch (type) {
        case 'login': find(next.profiles, payload.profileId); next.activeProfileId = payload.profileId; break;
        case 'register': find(next.profiles, payload.profileId).name = required(payload.name, 'El nombre').slice(0, 40); next.activeProfileId = payload.profileId; break;
        case 'logout': next.activeProfileId = null; break;
        case 'reset': next = seed(); next.activeProfileId = profileId; break;
        case 'event/add': {
          const event = { id: id(), profileId, title: required(payload.title, 'El título'), date: required(payload.date, 'La fecha'), time: required(payload.time, 'La hora'), description: required(payload.description, 'La descripción'), image: optionalURL(payload.image), info: optionalURL(payload.info), attendance: {}, comments: [] };
          if (!validDate(event.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)) throw new Error('Revisa la fecha y la hora.');
          next.events.push(event); break;
        }
        case 'event/attendance': {
          if (!['yes', 'no'].includes(payload.answer)) throw new Error('Selecciona sí o no.');
          find(next.events, payload.id).attendance[profileId] = payload.answer; break;
        }
        case 'event/comment': find(next.events, payload.id).comments.push({ id: id(), profileId, text: required(payload.text, 'El comentario'), createdAt: new Date().toISOString() }); break;
        case 'task/add': next.tasks.push({ id: id(), profileId, title: required(payload.title, 'El título'), description: required(payload.description, 'La tarea'), done: false }); break;
        case 'task/toggle': { const task = find(next.tasks, payload.id); task.done = !task.done; break; }
        case 'recipe/add': {
          const ingredients = (Array.isArray(payload.ingredients) ? payload.ingredients : []).map(x => String(x).trim()).filter(Boolean);
          if (!ingredients.length) throw new Error('Añade al menos un ingrediente.');
          next.recipes.push({ id: id(), profileId, title: required(payload.title, 'El título'), ingredients, instructions: required(payload.instructions, 'Las instrucciones'), image: optionalURL(payload.image), info: optionalURL(payload.info), emoji: '🍽️' }); break;
        }
        case 'menu/set': {
          if (!validDate(payload.date) || !['lunch', 'dinner'].includes(payload.slot)) throw new Error('Revisa el día y el turno del menú.');
          if (payload.recipeId) find(next.recipes, payload.recipeId);
          next.menu[payload.date] ??= {}; next.menu[payload.date][payload.slot] = payload.recipeId || ''; break;
        }
        case 'expense/add': next.expenses.push({ id: id(), profileId, concept: required(payload.concept, 'El concepto'), cents: parseCents(payload.amount), date: dateKey() }); break;
        case 'expense/settle': {
          if (!next.expenses.length) throw new Error('No hay gastos que liquidar.');
          next.settlements.push({ id: id(), createdAt: new Date().toISOString(), expenses: copy(next.expenses), profiles: copy(next.profiles), balance: getBalance(next.expenses, next.profiles) }); next.expenses = []; break;
        }
        default: throw new Error('Acción no disponible.');
      }
      save(next);
    }
  };
}
