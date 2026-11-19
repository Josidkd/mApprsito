import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
export function initializeFirebase(config) {
  if (config.mode === 'emulator' && (config.firebase.projectId !== 'demo-marsito-beta' || config.emulators?.firestore.host !== '127.0.0.1' || config.emulators?.auth !== 'http://127.0.0.1:9099')) throw new Error('Configuración de emuladores no segura.');
  if (config.mode !== 'emulator' && (config.firebase.projectId !== 'marsito-beta' || config.emulators)) throw new Error('Proyecto Firebase no permitido.');
  const app = initializeApp(config.firebase, config.name || '[DEFAULT]');
  const auth = getAuth(app);
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  if (config.mode === 'emulator') {
    connectAuthEmulator(auth, config.emulators.auth, { disableWarnings: true });
    connectFirestoreEmulator(db, config.emulators.firestore.host, config.emulators.firestore.port);
  }
  return { auth, db };
}
