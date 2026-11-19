import { doc } from 'firebase/firestore';
import { eventData, text } from '../data/validation.js';
import { createEntity, entityRef, onlineTransaction } from './operations.js';
export async function createEvent(context, payload, operationId) { return createEntity(context, entityRef(context, 'events', operationId), eventData(payload), ['attendance']); }
export async function setAttendance(context, { id, answer }) {
  if (!['yes', 'no'].includes(answer)) throw new Error('Selecciona sí o no.');
  const ref = entityRef(context, 'events', id);
  await onlineTransaction(context, async tx => {
    const event = await tx.get(ref); if (!event.exists()) throw new Error('El evento ya no está disponible.');
    tx.update(ref, { attendance: { ...event.data().attendance, [context.uid]: answer } });
  });
}
export async function addComment(context, { id, text: value }, operationId) {
  const ref = entityRef(context, 'events', id);
  entityRef(context, 'events', operationId);
  return createEntity(context, doc(ref, 'comments', operationId), { text: text(value, 2000, 'El comentario') });
}
