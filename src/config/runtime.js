import { firebaseConfig } from './firebase.js';
export function getRuntimeConfig() {
  const mode = __MARSITO_MODE__;
  return { mode, spaceId: 'marsito', firebase: mode === 'emulator' ? { ...firebaseConfig, apiKey: 'demo-key', projectId: 'demo-marsito-beta', authDomain: 'demo-marsito-beta.firebaseapp.com' } : firebaseConfig, emulators: mode === 'emulator' ? { auth: 'http://127.0.0.1:9099', firestore: { host: '127.0.0.1', port: 8080 } } : null };
}
