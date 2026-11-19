import './styles.css';
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
  document.querySelector('marsito-app').innerHTML = '<main class="access-panel"><div><h1>Marsito Beta</h1><p role="status">Conexión Firebase en preparación.</p></div></main>';
}
