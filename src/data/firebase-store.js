import { doc, collection, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { createAuthController } from '../firebase/auth.js';
import { createEvent, setAttendance, addComment } from '../firebase/events.js';
import { createTask, toggleTask } from '../firebase/tasks.js';
import { createRecipe, setMenu } from '../firebase/recipes.js';
import { addExpense, settleCycle, historyPage, cycleExpenses } from '../firebase/accounts.js';
import { getBalanceFromPaid } from '../lib/money.js';
const actions = { 'expense/add': addExpense, 'expense/settle': settleCycle, 'recipe/add': createRecipe, 'menu/set': setMenu, 'event/add': createEvent, 'event/attendance': setAttendance, 'event/comment': addComment, 'task/add': createTask, 'task/toggle': toggleTask };
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
export function createFirebaseStore({ auth, db, spaceId = 'marsito', online = () => globalThis.navigator?.onLine !== false, listen = onSnapshot }) {
  let state = { ...dataFields(), mode: 'firebase', authStatus: 'loading', user: null, error: '', connected: false, pendingCount: 0, storageWarning: '' };
  let generation = 0, accessGeneration = 0, destroyed = false, started = false, cycleId = null;
  let sessionUnsubs = [], dataUnsubs = [], cycleUnsubs = [];
  let historyCursor = null, historyJob = null, historyRefresh = false;
  const listeners = new Set();
  const active = (epoch, access) => !destroyed && epoch === generation && (access === undefined || access === accessGeneration);
  const notify = () => { if (!destroyed) listeners.forEach(fn => fn()); };
  const clearData = () => {
    accessGeneration++;
    dataUnsubs.splice(0).forEach(fn => fn()); cycleUnsubs.splice(0).forEach(fn => fn());
    cycleId = null; started = false; historyCursor = null; historyJob = null; historyRefresh = false;
    Object.assign(state, dataFields()); state.connected = false; state.pendingCount = 0;
  };
  const failure = (error, epoch, access) => {
    if (!active(epoch, access)) return;
    clearData(); state.authStatus = error.code === 'permission-denied' ? 'pending' : 'error'; state.error = firebaseError(error).message; notify();
  };
  const historyFailure = (error, epoch, access) => {
    if (active(epoch, access)) { state.error = firebaseError(error).message; notify(); }
  };
  const collectionWatch = (kind, epoch) => {
    const access = accessGeneration;
    dataUnsubs.push(listen(collection(db, 'spaces', spaceId, kind), { includeMetadataChanges: true }, snapshot => {
      if (!active(epoch, access) || snapshot.metadata.fromCache) return;
      const values = snapshot.docs.map(mapDocument);
      if (kind === 'menu') state.menu = Object.fromEntries(values.map(({ id, ...value }) => [id, value]));
      else if (kind === 'recipes') state.recipes = values.map(value => ({ ...value, ingredients: value.ingredientsText.split('\n'), emoji: '🍽️' }));
      else if (kind === 'events') state.events = values.map(value => { const previous = state.events.find(e => e.id === value.id); return { ...value, comments: previous?.comments || [], commentsLoaded: previous?.commentsLoaded || false }; });
      else state[kind] = values;
      state.connected = true; notify();
    }, error => failure(error, epoch, access)));
  };
  const watchCycle = (id, epoch) => {
    const access = accessGeneration;
    cycleUnsubs.splice(0).forEach(fn => fn()); cycleId = id; state.expenses = []; state.currentCycle = null;
    cycleUnsubs.push(listen(doc(db, 'spaces', spaceId, 'cycles', id), snapshot => {
      if (!active(epoch, access) || id !== cycleId || snapshot.metadata.fromCache) return;
      if (!snapshot.exists()) { failure(new Error('Falta configurar el ciclo de gastos.'), epoch, access); return; }
      state.currentCycle = mapDocument(snapshot); notify();
    }, error => failure(error, epoch, access)));
    cycleUnsubs.push(listen(collection(db, 'spaces', spaceId, 'cycles', id, 'expenses'), snapshot => {
      if (!active(epoch, access) || id !== cycleId || snapshot.metadata.fromCache) return;
      state.expenses = snapshot.docs.map(mapDocument); notify();
    }, error => failure(error, epoch, access)));
    void store.loadHistoryPage(true).catch(error => historyFailure(error, epoch, access));
  };
  const startData = async (user, epoch) => {
    if (started) return; started = true;
    const access = accessGeneration;
    try {
      const root = doc(db, 'spaces', spaceId);
      await getDocFromServer(root);
      if (!active(epoch, access)) return;
      dataUnsubs.push(listen(root, { includeMetadataChanges: true }, snapshot => {
        if (!active(epoch, access) || snapshot.metadata.fromCache) return;
        const config = snapshot.data();
        if (!config?.profiles || config.profiles.length !== 2 || !config.profiles.some(p => p.id === user.uid)) { failure(new Error('La configuración del espacio no está completa.'), epoch, access); return; }
        state.profiles = config.profiles; state.activeProfileId = user.uid; state.authStatus = 'ready'; state.error = ''; state.connected = true;
        if (cycleId !== config.activeCycleId) watchCycle(config.activeCycleId, epoch);
        notify();
      }, error => failure(error, epoch, access)));
      for (const kind of ['events', 'tasks', 'recipes', 'menu']) collectionWatch(kind, epoch);
    } catch (error) { failure(error, epoch, access); }
  };
  const onSession = async user => {
    const epoch = ++generation;
    sessionUnsubs.splice(0).forEach(fn => fn()); clearData(); state.error = '';
    state.user = user ? { uid: user.uid, email: user.email, emailVerified: user.emailVerified } : null;
    if (!user) { state.authStatus = 'signed-out'; notify(); return; }
    if (!user.emailVerified) { state.authStatus = 'unverified'; notify(); return; }
    state.authStatus = 'loading'; notify();
    sessionUnsubs.push(listen(doc(db, 'betaMembers', user.uid), { includeMetadataChanges: true }, snapshot => {
      if (!active(epoch) || snapshot.metadata.fromCache) return;
      const membership = snapshot.data();
      if (!snapshot.exists() || !membership.enabled || membership.spaceId !== spaceId) { clearData(); state.authStatus = 'pending'; notify(); return; }
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
      const epoch = generation, access = accessGeneration, uid = state.activeProfileId;
      state.pendingCount++; notify();
      try {
        await action({ db, spaceId, uid }, payload, crypto.randomUUID());
        if (!active(epoch, access)) throw new Error('La sesión o autorización cambió durante la operación.');
      } catch (error) {
        if (error.code === 'permission-denied') failure(error, epoch, access);
        throw firebaseError(error);
      } finally { if (active(epoch, access)) { state.pendingCount = Math.max(0, state.pendingCount - 1); notify(); } }
    },
    watchComments(eventId) {
      const epoch = generation, access = accessGeneration;
      if (state.authStatus !== 'ready') return () => {};
      const unsubscribe = listen(collection(db, 'spaces', spaceId, 'events', eventId, 'comments'), snapshot => {
        if (!active(epoch, access) || state.authStatus !== 'ready' || snapshot.metadata.fromCache) return;
        const event = state.events.find(value => value.id === eventId);
        if (event) { event.comments = snapshot.docs.map(mapDocument).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); event.commentsLoaded = true; notify(); }
      }, error => failure(error, epoch, access));
      const stop = () => { unsubscribe(); dataUnsubs = dataUnsubs.filter(fn => fn !== stop); };
      dataUnsubs.push(stop); return stop;
    },
    async loadHistoryPage(reset = false) {
      if (state.authStatus !== 'ready') return;
      if (historyJob) { if (reset) historyRefresh = true; return historyJob; }
      const epoch = generation, access = accessGeneration, profiles = structuredClone(state.profiles), uid = state.activeProfileId;
      if (reset) historyCursor = null;
      const job = (async () => {
        const result = await historyPage({ db, spaceId, uid }, historyCursor);
        if (!active(epoch, access) || state.authStatus !== 'ready') return;
        const previous = new Map(state.settlements.map(value => [value.id, value]));
        for (const cycle of result.items) previous.set(cycle.id, { ...cycle, profiles, balance: getBalanceFromPaid(cycle, profiles), expenses: previous.get(cycle.id)?.expenses || [], expensesLoaded: previous.get(cycle.id)?.expensesLoaded || false });
        state.settlements = [...previous.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        historyCursor = result.cursor; state.historyHasMore = result.hasMore; notify();
      })();
      historyJob = job;
      try { await job; } finally {
        if (historyJob === job) {
          historyJob = null;
          if (historyRefresh) { historyRefresh = false; void store.loadHistoryPage(true).catch(error => historyFailure(error, epoch, access)); }
        }
      }
    },
    async loadCycleExpenses(id) {
      if (state.authStatus !== 'ready') throw new Error('Sesión no autorizada.');
      const epoch = generation, access = accessGeneration, uid = state.activeProfileId;
      const expenses = await cycleExpenses({ db, spaceId, uid }, id);
      if (!active(epoch, access) || state.authStatus !== 'ready') return;
      const cycle = state.settlements.find(value => value.id === id);
      if (cycle) { cycle.expenses = expenses; cycle.expensesLoaded = true; notify(); }
    },
    destroy() { destroyed = true; generation++; controller.destroy(); sessionUnsubs.splice(0).forEach(fn => fn()); clearData(); listeners.clear(); }
  };
  return store;
}
