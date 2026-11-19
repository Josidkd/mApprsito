import { createUserWithEmailAndPassword, reload } from 'firebase/auth';
import { deleteApp } from 'firebase/app';
import { initializeFirebase } from '../../src/firebase/client.js';
import { requireEmulators, PROJECT_ID } from './helpers.js';
export const emulatorConfig = name => ({ mode: 'emulator', name, spaceId: 'marsito', firebase: { projectId: PROJECT_ID, apiKey: 'demo-key', authDomain: PROJECT_ID + '.firebaseapp.com' }, emulators: { auth: 'http://127.0.0.1:9099', firestore: { host: '127.0.0.1', port: 8080 } } });
export async function makeUser(t, prefix, verified = true) {
  requireEmulators();
  const email = `${prefix}-${crypto.randomUUID()}@example.test`;
  const client = initializeFirebase(emulatorConfig(crypto.randomUUID()));
  t.after(() => deleteApp(client.auth.app));
  const result = await createUserWithEmailAndPassword(client.auth, email, 'Example-Password-123!');
  if (verified) {
    const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId: result.user.uid, emailVerified: true }) });
    if (!response.ok) throw new Error('Could not verify emulator user: ' + await response.text());
    await reload(result.user); await result.user.getIdToken(true);
  }
  return { ...client, uid: result.user.uid, email };
}
export async function until(predicate, timeout = 8000) {
  const end = Date.now() + timeout;
  while (!predicate()) { if (Date.now() > end) throw new Error('Condition did not become true'); await new Promise(resolve => setTimeout(resolve, 30)); }
}
