import { StoreView, escapeHTML as esc, icon, pageHeading, showDialog, field, emptyState, safeURL, toast } from '../lib/dom.js';
import { dateKey, localDate, prettyDate, shiftDay } from '../lib/date.js';
class Calendar extends StoreView {
  selected = dateKey();
  month = dateKey().slice(0, 7);
  render() {
    const s = this.store.getState();
    const first = localDate(this.month + '-01'), offset = (first.getDay() + 6) % 7;
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
      const key = shiftDay(dateKey(first), i - offset), inMonth = key.startsWith(this.month);
      const count = s.events.filter(e => e.date === key).length;
      return `<button class="calendar-day ${inMonth ? '' : 'outside'} ${key === this.selected ? 'selected' : ''} ${key === dateKey() ? 'today' : ''}" data-day="${key}" aria-label="${prettyDate(key, { day: 'numeric', month: 'long', year: 'numeric' })}${count ? `, ${count} eventos` : ''}" aria-pressed="${key === this.selected}"><span>${Number(key.slice(-2))}</span><i ${count ? '' : 'hidden'}></i></button>`;
    }).join('');
    const events = s.events.filter(e => e.date === this.selected).sort((a, b) => a.time.localeCompare(b.time));
    this.innerHTML = `${pageHeading('HAGAMOS HUECO A LO BUENO', 'Nuestros planes', 'Las fechas importantes y los planes porque sí.', `<button id="new-event" class="button primary">${icon('plus')} Nuevo evento</button>`)}<div class="calendar-layout"><section class="panel calendar-panel"><div class="panel-title"><h2>${prettyDate(dateKey(first), { month: 'long', year: 'numeric' })}</h2><div class="calendar-controls"><button class="icon-button" id="prev-month" aria-label="Mes anterior">‹</button><button class="text-button" id="today">Hoy</button><button class="icon-button" id="next-month" aria-label="Mes siguiente">›</button></div></div><div class="calendar-weekdays">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span>${d}</span>`).join('')}</div><div class="calendar-grid">${cells}</div><div class="calendar-legend"><i></i> Tenemos un plan <span>♡ Un día a la vez</span></div></section><section class="panel day-panel"><div class="panel-title"><div><p class="eyebrow">${prettyDate(this.selected, { weekday: 'long' }).toUpperCase()}</p><h2>${prettyDate(this.selected)}</h2></div><span class="badge">${events.length} ${events.length === 1 ? 'plan' : 'planes'}</span></div>${events.length ? events.map(e => `<button class="event-card" data-event="${esc(e.id)}" aria-label="Ver evento: ${esc(e.title)}"><span class="event-time">${icon('clock')} ${esc(e.time)}</span><strong>${esc(e.title)}</strong><p>${esc(e.description)}</p><span class="event-card-footer">${icon('chat')} ${e.comments.length} comentarios ${icon('arrow')}</span></button>`).join('') : emptyState('Un día por llenar', 'Cualquier día es bueno para inventar un plan.', 'calendar')}<button class="button secondary full-width" id="add-day">${icon('plus')} Añadir un plan este día</button></section></div><div class="gentle-note">${icon('heart')} No hace falta una ocasión especial para pasar tiempo juntos.</div>`;
    this.querySelector('#new-event').onclick = () => this.createEvent();
    this.querySelector('#add-day').onclick = () => this.createEvent();
    const changeMonth = amount => { const date = localDate(this.month + '-01'); date.setMonth(date.getMonth() + amount); this.month = dateKey(date).slice(0, 7); this.selected = this.month + '-01'; this.render(); this.querySelector(amount > 0 ? '#next-month' : '#prev-month').focus(); };
    this.querySelector('#prev-month').onclick = () => changeMonth(-1);
    this.querySelector('#next-month').onclick = () => changeMonth(1);
    this.querySelector('#today').onclick = () => { this.selected = dateKey(); this.month = this.selected.slice(0, 7); this.render(); this.querySelector('#today').focus(); };
    this.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { this.selected = b.dataset.day; this.month = this.selected.slice(0, 7); this.render(); this.querySelector(`[data-day="${this.selected}"]`)?.focus(); });
    this.querySelectorAll('[data-event]').forEach(b => b.onclick = () => this.openEvent(b.dataset.event));
  }
  createEvent() {
    showDialog({ title: 'Un nuevo plan', submit: 'Crear evento', body: `${field('Título', 'title', 'text', 'required maxlength="120" placeholder="¿Qué vamos a hacer?"')}<div class="form-row">${field('Fecha', 'date', 'date', `required value="${this.selected}"`)}${field('Hora', 'time', 'time', 'required')}</div>${field('Descripción', 'description', 'textarea', 'required maxlength="5000" placeholder="Cuenta un poquito más…"')}${field('URL de imagen (opcional)', 'image', 'text', 'inputmode="url" placeholder="https://…"')}${field('URL de información (opcional)', 'info', 'text', 'inputmode="url" placeholder="https://…"')}`, onSubmit: data => { const previous = this.selected; this.selected = data.date; this.month = data.date.slice(0, 7); try { this.store.dispatch('event/add', data); toast('¡Tenemos un nuevo plan!'); } catch (error) { this.selected = previous; this.month = previous.slice(0, 7); throw error; } } });
  }
  openEvent(id) {
    const event = this.store.getState().events.find(e => e.id === id);
    const dialog = showDialog({ title: event.title, body: '', wide: true });
    const update = () => {
      const s = this.store.getState(), e = s.events.find(item => item.id === id);
      const name = key => s.profiles.find(p => p.id === key)?.name || 'Perfil';
      const answer = e.attendance[s.activeProfileId];
      dialog.querySelector('.dialog-content').innerHTML = `<div class="info-line">${icon('calendar')} ${prettyDate(e.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${esc(e.time)} h</div>${safeURL(e.image) ? `<img class="content-image" src="${esc(safeURL(e.image))}" alt="${esc(e.title)}" referrerpolicy="no-referrer">` : ''}<p class="pre-line event-description">${esc(e.description)}</p>${safeURL(e.info) ? `<p><a class="external-link" href="${esc(safeURL(e.info))}" target="_blank" rel="noopener noreferrer">Más información ↗</a></p>` : ''}<section class="attendance-section"><h3>¿Te apuntas?</h3><div class="attendance-buttons"><button type="button" class="button ${answer === 'yes' ? 'dark' : 'secondary'}" data-answer="yes" aria-pressed="${answer === 'yes'}">${icon('check')} Sí, voy</button><button type="button" class="button ${answer === 'no' ? 'dark' : 'secondary'}" data-answer="no" aria-pressed="${answer === 'no'}">No puedo</button></div><div class="attendee-list">${s.profiles.map(p => `<span class="badge">${esc(p.name)} · ${e.attendance[p.id] === 'yes' ? 'Sí' : e.attendance[p.id] === 'no' ? 'No' : 'Sin responder'}</span>`).join('')}</div></section><section class="comment-section"><h3>Comentarios <span class="muted">(${e.comments.length})</span></h3><div class="comments">${e.comments.map(c => `<article class="comment"><span class="avatar ${c.profileId === s.profiles[0].id ? 'coral' : 'sage'}">${esc(name(c.profileId)[0])}</span><div><strong>${esc(name(c.profileId))}</strong><p class="pre-line">${esc(c.text)}</p></div></article>`).join('') || '<p class="muted">El primer comentario puede ser el tuyo.</p>'}</div><label class="field"><span>Tu comentario</span><textarea id="comment-text" maxlength="2000" placeholder="¿Quién lleva el postre?"></textarea></label><button type="button" id="send-comment" class="button primary">Comentar</button></section>`;
      dialog.querySelectorAll('[data-answer]').forEach(b => b.onclick = () => { this.store.dispatch('event/attendance', { id, answer: b.dataset.answer }); update(); dialog.querySelector(`[data-answer="${b.dataset.answer}"]`).focus(); });
      dialog.querySelector('#send-comment').onclick = () => {
        const text = dialog.querySelector('#comment-text'); if (!text.value.trim()) { text.focus(); return; }
        this.store.dispatch('event/comment', { id, text: text.value }); update(); dialog.querySelector('#comment-text').focus();
      };
    };
    update();
  }
}
customElements.define('app-calendar', Calendar);
