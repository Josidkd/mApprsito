import { StoreView, escapeHTML as esc, icon, pageHeading, showDialog, field, emptyState, safeURL, saveAction, runAction, toast } from '../lib/dom.js';
import { dateKey, weekDays, shiftDay, prettyDate } from '../lib/date.js';
class Recipes extends StoreView {
  tab = 'recipes';
  week = dateKey();
  render() {
    const s = this.store.getState();
    this.innerHTML = `${pageHeading('DE NUESTRA COCINA, CON CARIÑO', 'Recetas y buenos ratos', 'Las favoritas de siempre y el eterno «¿qué comemos?».', `<button class="button primary" id="new-recipe">${icon('plus')} Nueva receta</button>`)}<div class="tabs" role="tablist" aria-label="Recetas y menú"><button role="tab" id="tab-recipes" aria-selected="${this.tab === 'recipes'}" aria-controls="recipes-content" tabindex="${this.tab === 'recipes' ? 0 : -1}" data-tab="recipes">${icon('recipes')} Recetas</button><button role="tab" id="tab-menu" aria-selected="${this.tab === 'menu'}" aria-controls="recipes-content" tabindex="${this.tab === 'menu' ? 0 : -1}" data-tab="menu">${icon('calendar')} Menú semanal</button></div><section id="recipes-content" role="tabpanel" aria-labelledby="tab-${this.tab}">${this.tab === 'recipes' ? this.recipeList(s) : this.weeklyMenu(s)}</section><div class="gentle-note">${icon('heart')} Cocinar para alguien también es una forma de decir «te quiero».</div>`;
    this.querySelector('#new-recipe').onclick = () => this.createRecipe();
    this.querySelectorAll('[data-tab]').forEach(button => {
      button.onclick = () => { this.tab = button.dataset.tab; this.render(); this.querySelector(`[data-tab="${this.tab}"]`).focus(); };
      button.onkeydown = event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); this.tab = event.key === 'Home' ? 'recipes' : event.key === 'End' ? 'menu' : this.tab === 'menu' ? 'recipes' : 'menu'; this.render(); this.querySelector(`[data-tab="${this.tab}"]`).focus(); } };
    });
    this.querySelectorAll('[data-recipe]').forEach(button => button.onclick = () => this.openRecipe(button.dataset.recipe));
    if (this.tab === 'menu') {
      const change = amount => { this.week = shiftDay(this.week, amount); this.render(); this.querySelector(amount < 0 ? '#prev-week' : '#next-week').focus(); };
      this.querySelector('#prev-week').onclick = () => change(-7);
      this.querySelector('#next-week').onclick = () => change(7);
      this.querySelector('#this-week').onclick = () => { this.week = dateKey(); this.render(); this.querySelector('#this-week').focus(); };
      this.querySelectorAll('[data-slot]').forEach(select => select.onchange = async () => {
        const { date, slot } = select.dataset;
        const saved = await runAction(select, this.store, 'menu/set', { date, slot, recipeId: select.value });
        if (this.isConnected) { this.render(); this.querySelector(`[data-date="${date}"][data-slot="${slot}"]`)?.focus(); if (saved) toast('Menú actualizado'); }
      });
    }
  }
  recipeList(s) {
    return s.recipes.length ? `<div class="recipe-grid">${s.recipes.map((r, i) => `<button class="recipe-card" data-recipe="${esc(r.id)}" aria-label="Ver receta: ${esc(r.title)}"><div class="recipe-art recipe-color-${i % 3}">${safeURL(r.image) ? `<img src="${esc(safeURL(r.image))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span>${esc(r.emoji || '🍽️')}</span><i class="recipe-art-leaf">✧</i>`}<span class="recipe-heart">♡</span></div><div class="recipe-info"><span class="eyebrow">RECETARIO COMPARTIDO</span><h3>${esc(r.title)}</h3><p>${r.ingredients.length} ingredientes · De ${esc(s.profiles.find(p => p.id === r.profileId)?.name)}</p><span class="card-link">A la cocina ${icon('arrow')}</span></div></button>`).join('')}</div>` : `<div class="panel">${emptyState('Aquí empieza vuestro recetario', 'Guardad esa receta que siempre sale bien.', 'recipes')}</div>`;
  }
  weeklyMenu(s) {
    const days = weekDays(this.week);
    return `<section class="panel menu-panel"><div class="panel-title week-title"><div><p class="eyebrow">UN POCO DE INSPIRACIÓN</p><h2>${prettyDate(days[0], { day: 'numeric', month: 'short' })} — ${prettyDate(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}</h2></div><div class="calendar-controls"><button class="icon-button" id="prev-week" aria-label="Semana anterior">‹</button><button class="text-button" id="this-week">Esta semana</button><button class="icon-button" id="next-week" aria-label="Semana siguiente">›</button></div></div>${!s.recipes.length ? '<p class="muted menu-empty-hint">Crea una receta para empezar a planificar.</p>' : ''}<div class="menu-days">${days.map(date => `<article class="menu-day ${date === dateKey() ? 'is-today' : ''}"><header><span>${prettyDate(date, { weekday: 'long' })}</span><strong>${prettyDate(date, { day: 'numeric', month: 'short' })}</strong>${date === dateKey() ? '<small>HOY</small>' : ''}</header>${[['lunch', 'Comida', '☀'], ['dinner', 'Cena', '☾']].map(([slot, label, emoji]) => `<label class="meal-slot"><span>${emoji} ${label}</span><select data-date="${date}" data-slot="${slot}" aria-label="${label} del ${date}" ${s.recipes.length ? '' : 'disabled'}><option value="">Sin planificar</option>${s.recipes.map(r => `<option value="${esc(r.id)}" ${s.menu[date]?.[slot] === r.id ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></label>`).join('')}</article>`).join('')}</div><p class="menu-tip">${icon('leaf')} Elige una receta en cada turno. Selecciona «Sin planificar» para dejarlo libre.</p></section>`;
  }
  createRecipe() {
    showDialog({ title: 'Una nueva favorita', submit: 'Guardar receta', body: `${field('Título', 'title', 'text', 'required maxlength="120" placeholder="El nombre de algo rico"')}${field('Ingredientes (uno por línea)', 'ingredients', 'textarea', 'required placeholder="200 g de pasta&#10;2 tomates&#10;Una pizca de sal"')}${field('Instrucciones', 'instructions', 'textarea', 'required maxlength="8000" placeholder="Paso a paso, sin prisas…"')}${field('URL de imagen (opcional)', 'image', 'text', 'inputmode="url" placeholder="https://…"')}${field('URL de información (opcional)', 'info', 'text', 'inputmode="url" placeholder="https://…"')}`, onSubmit: async data => { this.tab = 'recipes'; await saveAction(this.store, 'recipe/add', { ...data, ingredients: data.ingredients.split('\n') }, 'Una receta más para compartir'); } });
  }
  openRecipe(id) {
    const r = this.store.getState().recipes.find(item => item.id === id);
    showDialog({ title: r.title, wide: true, body: `${safeURL(r.image) ? `<img class="content-image" src="${esc(safeURL(r.image))}" alt="${esc(r.title)}" referrerpolicy="no-referrer">` : `<div class="recipe-detail-emoji">${esc(r.emoji || '🍽️')}</div>`}<h3 class="recipe-section-title">Ingredientes</h3><ul class="ingredient-list">${r.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}</ul><h3 class="recipe-section-title">Manos a la obra</h3><p class="pre-line recipe-instructions">${esc(r.instructions)}</p>${safeURL(r.info) ? `<p><a class="external-link" href="${esc(safeURL(r.info))}" target="_blank" rel="noopener noreferrer">Ver enlace de la receta ↗</a></p>` : ''}` });
  }
}
customElements.define('app-recipes', Recipes);
