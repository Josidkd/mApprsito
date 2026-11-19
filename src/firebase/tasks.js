import { taskData } from '../data/validation.js';
import { createEntity, entityRef, onlineTransaction } from './operations.js';
export async function createTask(context, payload, operationId) { return createEntity(context, entityRef(context, 'tasks', operationId), taskData(payload), ['done']); }
export async function toggleTask(context, { id }) {
  const ref = entityRef(context, 'tasks', id);
  return onlineTransaction(context, async tx => { const value = await tx.get(ref); if (!value.exists()) throw new Error('No se encontró la tarea.'); tx.update(ref, { done: !value.data().done }); });
}
