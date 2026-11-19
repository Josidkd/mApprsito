import { doc, runTransaction, serverTimestamp, getDocFromServer } from 'firebase/firestore';
export async function onlineTransaction(context, callback) {
  if (globalThis.navigator?.onLine === false) throw new Error('Necesitas conexión para guardar cambios.');
  // Transactions use a separate transport; explicitly check server reachability first.
  await getDocFromServer(doc(context.db, 'spaces', context.spaceId));
  return runTransaction(context.db, callback);
}
export function entityRef(context, kind, id) {
  if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) throw new Error('Identificador no válido.');
  return doc(context.db, 'spaces', context.spaceId, kind, id);
}
export async function createEntity(context, ref, data, mutable = []) {
  return onlineTransaction(context, async tx => {
    const previous = await tx.get(ref);
    if (previous.exists()) {
      const saved = previous.data();
      if (saved.profileId !== context.uid || Object.entries(data).some(([key, value]) => !mutable.includes(key) && JSON.stringify(saved[key]) !== JSON.stringify(value))) throw new Error('Ese envío ya existe con otros datos.');
      return;
    }
    tx.set(ref, { ...data, profileId: context.uid, createdAt: serverTimestamp() });
  });
}
