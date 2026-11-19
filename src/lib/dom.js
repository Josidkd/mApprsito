export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
export function safeURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h1m6 0h1"/>',
  tasks: '<rect x="4" y="3" width="16" height="19" rx="3"/><path d="m8 9 2 2 5-5M8 16h8"/>',
  recipes: '<path d="M5 3v6m3-6v6M2 3v6a3 3 0 0 0 6 0m-3 3v9M18 3c-5 5-5 10 0 10h2V3zm2 10v8"/>',
  wallet: '<rect x="3" y="6" width="18" height="15" rx="3"/><path d="m5 6 13-3v3m3 6h-6v5h6m-4-2.5h.1"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  heart: '<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-4 4 0 9 8 15 8-6 12-11 8-15Z"/>',
  logout: '<path d="M9 4H4v16h5m5-13 5 5-5 5M8 12h12"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chat: '<path d="M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0Z"/>',
  leaf: '<path d="M20 3C7 2 1 8 5 15c6 9 16 1 15-12ZM3 21 16 8"/>'
};
export function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`; }
export const formValues = form => Object.fromEntries(new FormData(form));
export function field(label, name, type = 'text', opts = '') {
  const control = type === 'textarea' ? `<textarea name="${name}" id="field-${name}" ${opts}></textarea>` : `<input type="${type}" name="${name}" id="field-${name}" ${opts}>`;
  return `<label class="field" for="field-${name}"><span>${label}</span>${control}</label>`;
}
export function showDialog({ title, body, onSubmit, submit = 'Guardar', wide = false }) {
  document.querySelector('dialog')?.close();
  const opener = document.activeElement;
  const dialog = document.createElement('dialog'); dialog.className = wide ? 'wide-dialog' : '';
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  dialog.innerHTML = `<form><header class="dialog-head"><h2 id="dialog-title">${escapeHTML(title)}</h2><button type="button" class="icon-button" data-close aria-label="Cerrar">×</button></header><div class="dialog-content">${body}</div><p class="form-error" role="alert" hidden></p>${onSubmit ? `<footer class="dialog-actions"><button class="button secondary" type="button" data-close>Cancelar</button><button class="button primary" type="submit">${escapeHTML(submit)}</button></footer>` : ''}</form>`;
  dialog.querySelectorAll('[data-close]').forEach(button => button.onclick = () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => {
    dialog.remove();
    const target = opener?.isConnected ? opener : opener?.id ? document.getElementById(opener.id) : null;
    if (target && !target.disabled) target.focus();
    else document.querySelector('main h1')?.focus();
  }, { once: true });
  dialog.querySelector('form').onsubmit = event => {
    event.preventDefault(); if (!onSubmit) return;
    try { onSubmit(formValues(event.target), dialog); dialog.close(); }
    catch (error) { const node = dialog.querySelector('.form-error'); node.textContent = error.message; node.hidden = false; }
  };
  document.body.append(dialog); dialog.showModal(); return dialog;
}
export function confirmDialog(title, text, submit, callback) { return showDialog({ title, body: `<p>${escapeHTML(text)}</p>`, submit, onSubmit: callback }); }
export function toast(message) {
  let node = document.querySelector('#toast'); if (!node) { node = document.createElement('div'); node.id = 'toast'; node.role = 'status'; document.body.append(node); }
  node.textContent = message; node.classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('visible'), 2800);
}
export class StoreView extends HTMLElement {
  set store(value) { this.unsubscribe?.(); this._store = value; this.unsubscribe = value.subscribe(() => this.render()); this.render(); }
  get store() { return this._store; }
  disconnectedCallback() { this.unsubscribe?.(); }
}
export function emptyState(title, text, name = 'spark') { return `<div class="empty-state">${icon(name)}<h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p></div>`; }
export function pageHeading(eyebrow, title, subtitle, button = '') { return `<header class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1><p class="muted">${subtitle}</p></div>${button}</header>`; }
