import { escapeHTML as esc, icon, confirmDialog, toast, showError } from '../lib/dom.js';
const routes = [['inicio', 'Inicio', 'home'], ['calendario', 'Calendario', 'calendar'], ['tareas', 'Tareas', 'tasks'], ['recetas', 'Recetas', 'recipes'], ['cuentas', 'Cuentas', 'wallet']];
export class AppShell extends HTMLElement {
  set store(value) { this._store = value; this.unsubscribe = value.subscribe(() => this.sync()); this.onRoute = () => this.sync(true); window.addEventListener('hashchange', this.onRoute); this.sync(); }
  disconnectedCallback() { this.unsubscribe?.(); window.removeEventListener('hashchange', this.onRoute); }
  sync(routeChanged = false) {
    const s = this._store.getState();
    const real = s.mode === 'firebase';
    if ((real && s.authStatus !== 'ready') || (!real && !s.activeProfileId)) {
      if (real && s.authStatus === 'signed-out') this.loginRedirect = true;
      const tag = real ? 'firebase-access' : 'demo-access';
      if (this.mode !== 'access' || this.accessTag !== tag) {
        document.querySelector('dialog')?.close();
        this.mode = 'access'; this.accessTag = tag; this.innerHTML = `<${tag}></${tag}>`;
      }
      this.querySelector(tag).store = this._store; return;
    }
    const entering = this.mode === 'access';
    if (entering && (!real || this.loginRedirect)) history.replaceState(null, '', '#inicio');
    if (entering) this.loginRedirect = false;
    const route = routes.some(([r]) => r === location.hash.slice(1)) ? location.hash.slice(1) : 'inicio';
    if (this.mode !== 'app') {
      this.mode = 'app'; this.route = null;
      this.innerHTML = `<div class="app-layout"><aside class="sidebar"><a class="brand" href="#inicio"><img src="/favicon.svg" width="38" height="38" alt="">marsito<span class="brand-dot">.</span></a><p class="sidebar-caption">NUESTRO ESPACIO</p><nav aria-label="Principal">${routes.map(([r, name, glyph]) => `<a href="#${r}" data-route="${r}">${icon(glyph)}<span>${name}</span><span class="nav-dot"></span></a>`).join('')}</nav><div class="sidebar-bottom"><div class="together-card">${icon('heart')}<strong>Mejor en equipo.</strong><p>Un lugar para lo nuestro,<br>hecho para los dos.</p><span>${s.profiles.map(p => esc(p.name)).join(' + ')} · ♡</span></div><small>MARSITO APP · ${real ? 'BETA 0.2' : 'DEMO'}</small></div></aside><div class="main-column"><header class="topbar"><div class="breadcrumb">Nuestro espacio <span>/</span> <strong id="route-name">Inicio</strong></div><span class="demo-badge"><i></i> ${real ? 'BETA PRIVADA' : 'DEMO LOCAL'}</span><div class="profile-control"><span id="profile-avatar" class="avatar coral"></span>${real ? '<span id="profile-name"></span>' : '<label class="sr-only" for="active-profile">Perfil activo</label><select id="active-profile"></select>'}</div><button class="icon-button logout-button" id="logout" aria-label="Salir">${icon('logout')}</button></header><div id="storage-warning" class="storage-warning" role="alert" hidden></div><main id="main-content"></main><footer class="app-footer">${real ? '<span>Espacio compartido · Acceso autorizado</span>' : `<button id="reset-demo" class="subtle-button">${icon('spark')} Restablecer demo</button><span>Solo en este navegador · Datos de demostración</span>`}</footer></div></div>`;
      if (!real) this.querySelector('#active-profile').onchange = event => this._store.dispatch('login', { profileId: event.target.value });
      this.querySelector('#logout').onclick = async () => { document.querySelector('dialog')?.close(); try { await Promise.resolve(this._store.dispatch('logout')); } catch (error) { showError(error); } };
      if (!real) this.querySelector('#reset-demo').onclick = () => confirmDialog('¿Empezamos de nuevo?', 'Se borrarán tus cambios locales y volverán los datos de ejemplo. Esta acción no afecta a ningún servidor.', 'Sí, restablecer', () => { this._store.dispatch('reset'); toast('Demostración restablecida'); });
    }
    const profile = s.profiles.find(p => p.id === s.activeProfileId);
    if (real) this.querySelector('#profile-name').textContent = profile.name;
    else this.querySelector('#active-profile').innerHTML = s.profiles.map(p => `<option value="${esc(p.id)}" ${p.id === s.activeProfileId ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
    this.querySelector('#profile-avatar').textContent = profile.name[0];
    const warning = this.querySelector('#storage-warning');
    const message = s.storageWarning || s.error || (real && !s.connected ? 'Sin conexión confirmada. Necesitas conexión para guardar cambios.' : '');
    warning.textContent = message; warning.hidden = !message;
    if (this.route !== route) {
      document.querySelector('dialog')?.close(); this.route = route;
      this.querySelectorAll('[data-route]').forEach(a => { if (a.dataset.route === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      this.querySelector('#route-name').textContent = routes.find(([r]) => r === route)[1];
      const tag = { inicio: 'app-dashboard', calendario: 'app-calendar', tareas: 'app-tasks', recetas: 'app-recipes', cuentas: 'app-accounts' }[route];
      const view = document.createElement(tag); this.querySelector('#main-content').replaceChildren(view);
      if (customElements.get(tag)) view.store = this._store;
      else view.innerHTML = '<h1>Esta sección estará lista enseguida.</h1>';
      if (routeChanged || entering) { view.querySelector('h1')?.focus(); window.scrollTo(0, 0); }
    }
  }
}
customElements.define('marsito-app', AppShell);
