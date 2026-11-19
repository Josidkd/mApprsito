import { doc } from 'firebase/firestore';
import { text, url, civilDate } from '../data/validation.js';
import { createEntity, entityRef, onlineTransaction } from './operations.js';
export async function createRecipe(context, payload, operationId) {
  if (!Array.isArray(payload.ingredients) || payload.ingredients.length < 1 || payload.ingredients.length > 100) throw new Error('Añade entre 1 y 100 ingredientes.');
  const ingredients = payload.ingredients.map(value => { const item = text(value, 200, 'Cada ingrediente'); if (/[\r\n]/.test(item)) throw new Error('Usa una línea por ingrediente.'); return item; });
  return createEntity(context, entityRef(context, 'recipes', operationId), { title: text(payload.title, 120, 'El título'), ingredientsText: ingredients.join('\n'), instructions: text(payload.instructions, 8000, 'Las instrucciones'), image: url(payload.image), info: url(payload.info) });
}
export async function setMenu(context, { date, slot, recipeId }) {
  civilDate(date);
  if (!['lunch', 'dinner'].includes(slot)) throw new Error('Turno del menú no válido.');
  const ref = doc(context.db, 'spaces', context.spaceId, 'menu', date);
  return onlineTransaction(context, async tx => {
    const previous = await tx.get(ref);
    if (recipeId) { const recipe = await tx.get(entityRef(context, 'recipes', recipeId)); if (!recipe.exists()) throw new Error('Selecciona una receta existente.'); }
    tx.set(ref, { lunch: '', dinner: '', ...(previous.exists() ? previous.data() : {}), [slot]: recipeId || '' });
  });
}
