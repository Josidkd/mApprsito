import { StoreView, escapeHTML as esc, icon, pageHeading, showDialog, field, emptyState, saveAction, showError } from '../lib/dom.js';
import { euro, getBalance, getBalanceFromPaid } from '../lib/money.js';
import { prettyDate } from '../lib/date.js';
class Accounts extends StoreView {
  openCycles = new Set(); seenCycles = new Set(); loadingCycles = new Set();
  render() {
    const s = this.store.getState(), real = s.mode === 'firebase';
    const count = real ? s.currentCycle?.count || 0 : s.expenses.length;
    const balance = real ? getBalanceFromPaid(s.currentCycle || { paidA: 0, paidB: 0 }, s.profiles) : getBalance(s.expenses, s.profiles);
    const name = id => s.profiles.find(p => p.id === id)?.name || 'Perfil';
    const transferText = (b, profiles = s.profiles) => b.transfer ? `${esc(profiles.find(p => p.id === b.transfer.from)?.name)} debe a ${esc(profiles.find(p => p.id === b.transfer.to)?.name)} <strong>${euro(b.transfer.cents)}</strong>` : 'Estamos a mano ♡';
    const expenseRows = (expenses, profiles) => expenses.map(e => `<article class="expense-row"><span class="expense-glyph">${icon('wallet')}</span><div class="expense-body"><strong>${esc(e.concept)}</strong><small>${esc(profiles.find(p => p.id === e.profileId)?.name)} · ${prettyDate(e.date)}</small></div><strong class="expense-amount">${euro(e.cents)}</strong></article>`).join('');
    const cycles = [...s.settlements].reverse();
    for (const [index, cycle] of cycles.entries()) { if (!this.seenCycles.has(cycle.id)) { this.seenCycles.add(cycle.id); if (index === 0) this.openCycles.add(cycle.id); } }
    const history = cycles.map((cycle, index) => `<details class="history-cycle" data-cycle="${esc(cycle.id)}" ${this.openCycles.has(cycle.id) ? 'open' : ''}><summary><span>${icon('check')} Ciclo ${s.settlements.length - index} · ${new Date(cycle.createdAt).toLocaleDateString('es-ES')}</span><strong>${euro(cycle.balance.total)}</strong></summary><div class="history-body"><span class="badge">Liquidado · ${cycle.count ?? cycle.expenses.length} gastos</span><p class="history-transfer">${transferText(cycle.balance, cycle.profiles)}</p>${real && !cycle.expensesLoaded ? '<p class="muted">Cargando gastos del ciclo…</p>' : expenseRows(cycle.expenses, cycle.profiles)}</div></details>`).join('');
    this.innerHTML = `${pageHeading('COMPARTIR, SIN COMPLICARSE', 'Cuentas claras', 'Los gastos del día a día. A medias y con calma.', `<button id="new-expense" class="button primary">${icon('plus')} Añadir gasto</button>`)}<section class="accounts-summary"><div class="total-card"><span class="eyebrow">CICLO ACTUAL · ${count} GASTOS</span><h2>${euro(balance.total)}</h2><p>Total compartido</p><div class="split-caption">${icon('heart')} A partes iguales, entre los dos</div></div><div class="contributions panel"><h3>Lo que ha puesto cada uno</h3>${s.profiles.map((p, i) => { const paid = real ? s.currentCycle?.[i ? 'paidB' : 'paidA'] || 0 : s.expenses.filter(e => e.profileId === p.id).reduce((sum, e) => sum + e.cents, 0); return `<div class="contribution"><span class="avatar ${i ? 'sage' : 'coral'}">${esc(p.name[0])}</span><div><strong>${esc(p.name)}</strong><small>Su parte: ${euro(balance.shares[p.id])}</small></div><b>${euro(paid)}</b></div>`; }).join('')}</div></section><section class="balance-card"><span class="feature-icon green">${icon('check')}</span><div><span class="eyebrow">PARA QUEDAR A MANO</span><p data-testid="balance-transfer">${transferText(balance)}</p></div><button class="button dark" id="settle" ${count && !s.pendingCount && (!real || s.currentCycle?.status === 'open') ? '' : 'disabled'}>Liquidar</button></section><section class="panel expense-panel"><div class="panel-title"><h2>Los gastos de este ciclo</h2><span>Pagados por el perfil que los añade</span></div>${s.expenses.length ? expenseRows([...s.expenses].reverse(), s.profiles) : count ? '<p class="muted">Cargando gastos…</p>' : emptyState('Un ciclo nuevo, las cuentas a cero', 'El próximo gasto compartido empieza aquí.', 'wallet')}</section><section class="settlement-history" data-testid="settlement-history"><div class="section-title"><h2>Ciclos liquidados</h2><span>${s.settlements.length} en el historial</span></div>${history || '<div class="history-empty">Cuando liquidéis el primer ciclo, lo encontraréis aquí.</div>'}${real && s.historyHasMore ? '<button class="button secondary" id="more-history">Cargar ciclos anteriores</button>' : ''}</section><div class="gentle-note">${icon('leaf')} Esto organiza las cuentas; no mueve dinero ni realiza pagos.</div>`;
    this.querySelector('#new-expense').disabled = Boolean(s.pendingCount);
    this.querySelector('#new-expense').onclick = () => showDialog({ title: 'Un gasto compartido', submit: 'Guardar gasto', body: `<div class="demo-notice"><span>Lo ha pagado <strong>${esc(name(s.activeProfileId))}</strong>. ${real ? 'Se atribuye a tu cuenta autenticada.' : 'Puedes cambiar el perfil activo antes de añadir un gasto.'}</span></div>${field('Concepto', 'concept', 'text', 'required maxlength="150" placeholder="Por ejemplo, la compra del súper"')}${field('Importe (€)', 'amount', 'text', 'required inputmode="decimal" placeholder="0,00"')}<p class="muted">Se repartirá al 50 %. Introduce como máximo dos decimales.</p>`, onSubmit: data => saveAction(this.store, 'expense/add', data, 'Gasto añadido. Todo en orden.') });
    this.querySelector('#settle').onclick = () => showDialog({ title: '¿Dejamos las cuentas a cero?', submit: 'Confirmar liquidación', body: `<p>El total actual del ciclo es <strong>${euro(balance.total)}</strong>.</p><div class="settle-preview">${transferText(balance)}</div><p class="muted">Guardaremos los gastos del ciclo como liquidados y empezaremos uno vacío. Se comprobarán las cuentas en el servidor al confirmar. El historial se conserva.</p><div class="demo-notice">${icon('wallet')}<span>No se realiza ningún pago real. Esta confirmación solo registra la liquidación.</span></div>`, onSubmit: () => saveAction(this.store, 'expense/settle', real ? { expectedCycleId: s.currentCycle.id } : {}, 'Ciclo liquidado. Empezamos de nuevo.') });
    if (real) {
      this.querySelectorAll('[data-cycle]').forEach(details => {
        details.ontoggle = async () => {
          if (!details.isConnected) return;
          const id = details.dataset.cycle;
          if (details.open) this.openCycles.add(id); else this.openCycles.delete(id);
          const cycle = this.store.getState().settlements.find(c => c.id === id);
          if (!details.open || cycle?.expensesLoaded || this.loadingCycles.has(id)) return;
          this.loadingCycles.add(id);
          try { await this.store.loadCycleExpenses(id); } catch (error) { showError(error); }
          finally { this.loadingCycles.delete(id); }
        };
      });
      this.querySelector('#more-history')?.addEventListener('click', async event => {
        event.currentTarget.disabled = true;
        try { await this.store.loadHistoryPage(); } catch (error) { showError(error); if (this.isConnected) this.render(); }
      });
    }
  }
}
customElements.define('app-accounts', Accounts);
