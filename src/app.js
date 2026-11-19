import './styles.css';
import './components/firebase-access.css';
import './views/calendar-tasks.css';
import './views/recipes.css';
import './views/accounts.css';
import { getRuntimeConfig } from './config/runtime.js';
const config = getRuntimeConfig();
document.querySelector('marsito-app').dataset.mode = config.mode;
if (__MARSITO_MODE__ === 'demo') {
  const { startDemo } = await import('./demo.js');
  startDemo();
} else {
  const { startFirebase } = await import('./firebase/start.js');
  startFirebase(config);
}
