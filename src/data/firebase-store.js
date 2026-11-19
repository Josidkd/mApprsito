import { doc, collection, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { createAuthController } from '../firebase/auth.js';
import { createEvent, setAttendance, addComment } from '../firebase/events.js';
import { createTask, toggleTask } from '../firebase/tasks.js';
import { createRecipe, setMenu } from '../firebase/recipes.js';
const actions = { 'recipe/add': createRecipe, 'menu/set': setMenu, 'event/add': createEvent, 'event/attendance': setAttendance, 'event/comment': addComment, 'task/add': createTask, 'task/toggle': toggleTask };
const dataFields = () => ({ profiles: [], activeProfileId: null, events: [], tasks: [], recipes: [], menu: {}, expenses: [], settlements: [], currentCycle: null, historyHasMore: false });
export function firebaseError(error) {
  if (error.code === 'permission-denied') return new Error('No tienes permiso para esta operación. Revisa tu autorización.');
  if (error.code === 'resource-exhausted') return new Error('Se ha alcanzado la cuota de Firebase. Inténtalo más tarde.');
  if (['unavailable', 'deadline-exceeded'].includes(error.code)) return new Error('No se pudo confirmar la operación. Comprueba tu conexión antes de reintentar.');
  return error;
}
export function mapDocument(snapshot) {
  const values = snapshot.data();
  return { ...values, id: snapshot.id, ...(values.createdAt?.toDate ? { createdAt: values.createdAt.toDate().toISOString() } : {}) };
}
export function createFirebaseStore({ auth, db, spaceId = 'marsito', online = () => globalThis.navigator?.onLine !== false }) {
  let state = { ...dataFields(), mode: 'firebase', authStatus: 'loading', user: null, error: '', connected: false, pendingCount: 0, storageWarning: '' };
  let generation = 0, sessionUnsubs = [], dataUnsubs = [], cycleUnsubs = [], cycleId = null, started = false, destroyed = false;
  const listeners = new Set();
  const notify = () => { if (!destroyed) listeners.forEach(fn => fn()); };
  const clearData = () => {
    dataUnsubs.splice(0).forEach(fn => fn()); cycleUnsubs.splice(0).forEach(fn => fn()); cycleId = null; started = false;
    Object.assign(state, dataFields()); state.connected = false;
  };
  const failure = (error, epoch) => {
    if (epoch !== generation || destroyed) return;
    clearData(); state.authStatus = error.code === 'permission-denied' ? 'pending' : 'error'; state.error = firebaseError(error).message; notify();
  };
  const collectionWatch = (kind, epoch) => {
    dataUnsubs.push(onSnapshot(collection(db, 'spaces', spaceId, kind), { includeMetadataChanges: true }, snapshot => {
      if (epoch !== generation || destroyed || snapshot.metadata.fromCache) return;
      const values = snapshot.docs.map(mapDocument);
      if (kind === 'menu') state.menu = Object.fromEntries(values.map(({ id, ...value }) => [id, value]));
      else if (kind === 'recipes') state.recipes = values.map(value => ({ ...value, ingredients: value.ingredientsText.split('\n'), emoji: '🍽️' }));
      else if (kind === 'events') state.events = values.map(value => ({ ...value, comments: state.events.find(e => e.id === value.id)?.comments || [] }));
      else state[kind] = values;
      state.connected = true; notify();
    }, error => failure(error, epoch)));
  };
  const watchCycle = (id, epoch) => {
    cycleUnsubs.splice(0).forEach(fn => fn()); cycleId = id; state.expenses = []; state.currentCycle = null;
    cycleUnsubs.push(onSnapshot(doc(db, 'spaces', spaceId, 'cycles', id), snapshot => {
      if (epoch !== generation || id !== cycleId || snapshot.metadata.fromCache) return;
      if (!snapshot.exists()) { failure(new Error('Falta configurar el ciclo de gastos.'), epoch); return; }
      state.currentCycle = mapDocument(snapshot); notify();
    }, error => failure(error, epoch)));
    cycleUnsubs.push(onSnapshot(collection(db, 'spaces', spaceId, 'cycles', id, 'expenses'), snapshot => {
      if (epoch !== generation || id !== cycleId || snapshot.metadata.fromCache) return;
      state.expenses = snapshot.docs.map(mapDocument); notify();
    }, error => failure(error, epoch)));
  };
  const startData = async (user, epoch) => {
    if (started) return; started = true;
    try {
      const root = doc(db, 'spaces', spaceId);
      await getDocFromServer(root);
      if (epoch !== generation || destroyed) return;
      dataUnsubs.push(onSnapshot(root, { includeMetadataChanges: true }, snapshot => {
        if (epoch !== generation || destroyed || snapshot.metadata.fromCache) return;
        const config = snapshot.data();
        if (!config?.profiles || config.profiles.length !== 2 || !config.profiles.some(p => p.id === user.uid)) { failure(new Error('La configuración del espacio no está completa.'), epoch); return; }
        state.profiles = config.profiles; state.activeProfileId = user.uid; state.authStatus = 'ready'; state.error = ''; state.connected = true;
        if (cycleId !== config.activeCycleId) watchCycle(config.activeCycleId, epoch);
        notify();
      }, error => failure(error, epoch)));
      for (const kind of ['events', 'tasks', 'recipes', 'menu']) collectionWatch(kind, epoch);
    } catch (error) { failure(error, epoch); }
  };
  const onSession = async user => {
    const epoch = ++generation;
    sessionUnsubs.splice(0).forEach(fn => fn()); clearData(); state.pendingCount = 0; state.error = '';
    state.user = user ? { uid: user.uid, email: user.email, emailVerified: user.emailVerified } : null;
    if (!user) { state.authStatus = 'signed-out'; notify(); return; }
    if (!user.emailVerified) { state.authStatus = 'unverified'; notify(); return; }
    state.authStatus = 'loading'; notify();
    sessionUnsubs.push(onSnapshot(doc(db, 'betaMembers', user.uid), { includeMetadataChanges: true }, snapshot => {
      if (epoch !== generation || destroyed || snapshot.metadata.fromCache) return;
      const membership = snapshot.data();
      if (!snapshot.exists() || !membership.enabled || membership.spaceId !== spaceId) {
        clearData(); state.authStatus = 'pending'; notify(); return;
      }
      void startData(user, epoch);
    }, error => failure(error, epoch)));
  };
  const controller = createAuthController({ auth, onSession });
  const store = {
    getState: () => structuredClone(state),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async dispatch(type, payload = {}) {
      if (type === 'logout') { await onSession(null); await controller.dispatch(type); return; }
      if (type.startsWith('auth/')) return controller.dispatch(type, payload);
      if (state.authStatus !== 'ready' || !state.activeProfileId) throw new Error('Tu cuenta todavía no está autorizada.');
      if (!online() || !state.connected) throw new Error('Necesitas conexión para guardar cambios.');
      const action = actions[type]; if (!action) throw new Error('Operación no disponible.');
      const epoch = generation, uid = state.activeProfileId;
      state.pendingCount++; notify();
      try { await action({ db, spaceId, uid }, payload, crypto.randomUUID()); }
      catch (error) { if (epoch === generation && error.code === 'permission-denied') failure(error, epoch); throw firebaseError(error); }
      finally { if (epoch === generation) { state.pendingCount = Math.max(0, state.pendingCount - 1); notify(); } }
    },
    watchComments(eventId) {
      const epoch = generation;
      if (state.authStatus !== 'ready') return () => {};
      const unsubscribe = onSnapshot(collection(db, 'spaces', spaceId, 'events', eventId, 'comments'), snapshot => {
        if (epoch !== generation || state.authStatus !== 'ready' || snapshot.metadata.fromCache) return;
        const event = state.events.find(value => value.id === eventId);
        if (event) { event.comments = snapshot.docs.map(mapDocument).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); event.commentsLoaded = true; notify(); }
      }, error => failure(error, epoch));
      sessionUnsubs.push(unsubscribe); return unsubscribe;
    },
    destroy() { destroyed = true; generation++; controller.destroy(); sessionUnsubs.splice(0).forEach(fn => fn()); clearData(); listeners.clear(); }
  };
  return store;
}
