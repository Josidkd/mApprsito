import { escapeHTML as esc, icon, field, formValues } from '../lib/dom.js';
class FirebaseAccess extends HTMLElement {
  formMode = 'login'; busy = false;
  set store(value) { this._store = value; this.render(); }
  render() {
    const s = this._store.getState();
    const waiting = s.authStatus !== 'signed-out';
    const states = {
      loading: ['Un momento…', 'Comprobando tu sesión y tu acceso al espacio.'],
      unverified: ['Verifica tu correo', 'Abre el enlace que te hemos enviado. Después vuelve aquí y pulsa «Ya he verificado».'],
      pending: ['Acceso pendiente', 'Tu cuenta existe, pero aún no está autorizada para este espacio. El propietario debe aprobar tu UID.'],
      error: ['No pudimos conectar', s.error || 'Comprueba tu conexión y vuelve a intentarlo.']
    };
    const titles = { login: 'Qué bien tenerte por aquí', register: 'Tu cuenta de Marsito', reset: 'Recuperar contraseña' };
    const title = waiting ? states[s.authStatus]?.[0] || 'Un momento…' : titles[this.formMode];
    const intro = waiting ? states[s.authStatus]?.[1] : this.formMode === 'register' ? 'Registrarse no concede acceso. Tendrás que verificar tu correo y recibir autorización.' : this.formMode === 'reset' ? 'Te enviaremos las instrucciones si existe una cuenta para ese correo.' : 'Entra a vuestro espacio compartido. Solo para cuentas autorizadas.';
    this.innerHTML = `<main class="access-layout firebase-access"><section class="access-story"><a class="brand" href="#inicio"><img src="/favicon.svg" alt="" width="44" height="44">marsito<span class="brand-dot">.</span></a><span class="pill warm">${icon('heart')} Nuestro espacio, de verdad</span><h1>Lo cotidiano.<br>Lo nuestro.<br><em>Todo aquí.</em></h1><p>Planes, recetas, tareas y cuentas. Ahora compartidos y sincronizados, con acceso solo para los dos.</p><div class="access-art" aria-hidden="true"><div class="art-card art-note">🌿<strong>Un lugar para<br>lo que importa.</strong><span>Marsito · Beta 0.2</span></div></div></section><section class="access-panel"><div class="access-box"><p class="eyebrow">BETA PRIVADA · SOLO INVITADOS</p><h2>${esc(title)}</h2><p class="muted">${esc(intro || '')}</p>${waiting ? `<div class="auth-state-content">${s.user ? `<p class="auth-email">${esc(s.user.email)}</p>` : ''}${s.authStatus === 'pending' ? `<label class="field"><span>Tu UID para solicitar acceso</span><input readonly value="${esc(s.user.uid)}" aria-label="Tu UID"></label>` : ''}${s.authStatus === 'unverified' ? '<button class="button primary" data-auth="auth/refresh">Ya he verificado</button><button class="text-button" data-auth="auth/resend-verification">Reenviar correo</button>' : ''}${s.authStatus === 'error' || s.authStatus === 'pending' ? '<button class="button secondary" data-auth="auth/refresh">Volver a comprobar</button>' : ''}${s.user ? '<button class="button secondary" data-auth="logout">Salir</button>' : s.authStatus === 'error' ? '<button class="button secondary" id="retry">Reintentar</button>' : ''}</div>` : `<form id="firebase-auth-form">${field('Correo electrónico', 'email', 'email', 'required autocomplete="email" maxlength="254"')}${this.formMode !== 'reset' ? field('Contraseña', 'password', 'password', `required minlength="${this.formMode === 'register' ? 10 : 1}" autocomplete="${this.formMode === 'register' ? 'new-password' : 'current-password'}"`) : ''}<button class="button primary full-width" type="submit">${this.formMode === 'login' ? 'Entrar' : this.formMode === 'register' ? 'Crear cuenta' : 'Enviar instrucciones'}</button></form><div class="auth-links">${this.formMode === 'login' ? '<button class="text-button" data-mode="register">Crear una cuenta</button><button class="text-button" data-mode="reset">He olvidado mi contraseña</button>' : '<button class="text-button" data-mode="login">Volver a entrar</button>'}</div>`}<p class="auth-feedback" role="alert" hidden></p><div class="privacy-note">${icon('heart')} Conexión Firebase · Registro sujeto a autorización</div></div></section></main>`;
    this.querySelectorAll('[data-mode]').forEach(button => button.onclick = () => { this.formMode = button.dataset.mode; this.render(); this.querySelector('input')?.focus(); });
    const feedback = (message, success = false) => { const node = this.querySelector('.auth-feedback'); if (!node) return; node.hidden = false; node.textContent = message; node.classList.toggle('success', success); };
    const run = async (type, payload) => {
      if (this.busy) return; this.busy = true;
      this.querySelectorAll('button').forEach(b => b.disabled = true);
      try {
        await this._store.dispatch(type, payload);
        if (type === 'auth/reset-password') feedback('Si existe una cuenta para ese correo, recibirás las instrucciones.', true);
        if (type === 'auth/resend-verification') feedback('Correo de verificación enviado. Revisa también spam.', true);
      } catch (error) { feedback(error.message); }
      finally { this.busy = false; this.querySelectorAll('button').forEach(b => b.disabled = false); }
    };
    const form = this.querySelector('#firebase-auth-form');
    if (form) form.onsubmit = event => { event.preventDefault(); void run({ login: 'auth/login', register: 'auth/register', reset: 'auth/reset-password' }[this.formMode], formValues(form)); };
    this.querySelectorAll('[data-auth]').forEach(button => button.onclick = () => void run(button.dataset.auth));
    this.querySelector('#retry')?.addEventListener('click', () => location.reload());
  }
}
customElements.define('firebase-access', FirebaseAccess);
