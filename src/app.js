import { createStore } from './data/store.js';
import './components/demo-access.js';
import './views/dashboard.js';
import './views/calendar.js';
import './views/tasks.js';
import './components/app-shell.js';
const storage = { getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) };
document.querySelector('marsito-app').store = createStore(storage);
