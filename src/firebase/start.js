import { initializeFirebase } from './client.js';
import { createFirebaseStore } from '../data/firebase-store.js';
import '../components/firebase-access.js';
import '../views/dashboard.js';
import '../views/calendar.js';
import '../views/tasks.js';
import '../views/recipes.js';
import '../views/accounts.js';
import '../components/app-shell.js';
export function startFirebase(config) {
  const { auth, db } = initializeFirebase(config);
  const store = createFirebaseStore({ auth, db, spaceId: config.spaceId });
  document.querySelector('marsito-app').store = store;
}
