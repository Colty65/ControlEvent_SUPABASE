window.__ceDisableLegacyBarGraficas = true;
/* ControlEvent v45.1 - Bundle legacy generado desde scripts legacy-inline extraídos. */
/* Mantiene el orden original de ejecución para compatibilidad. */

;/* ===== BEGIN legacy-inline-55-v250-core.js ===== */

/* ControlEvent v45.1 - JS legacy extraido de public/index.html. Bloque inline #55. */
/* ==== v25.0: entrada sin evento, render ligero y base modular ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.1';
  const VERSION_FILE = 'ControlEvent_v45_1';
  const CHOSEN_KEY = 'ce_v250_event_chosen';
  const LEGACY_EVENT_KEY = 'controlevent_v229_selected_event_id';
  const tipStore = new WeakMap();
  const $ = id => document.getElementById(id);
  const events = () => {
    const s = stateRef();
    return Array.isArray(s.eventos) ? s.eventos : [];
  };
  function stateRef(){
    try{ return (typeof state !== 'undefined' && state) || window.state || {}; }
    catch(_){ return window.state || {}; }
  }
  function isAuthed(){
    try{ return !!((typeof authUser !== 'undefined' && authUser) || window.authUser); }
    catch(_){ return !!window.authUser; }
  }
  function chosenForThisEntry(){
    try{ return sessionStorage.getItem(CHOSEN_KEY) === '1'; }
    catch(_){ return false; }
  }
  function markEntryNeedsEvent(){
    try{ sessionStorage.removeItem(CHOSEN_KEY); }catch(_){ }
    clearLegacyEventMemory();
  }
  function clearLegacyEventMemory(){
    try{ sessionStorage.removeItem(LEGACY_EVENT_KEY); }catch(_){ }
    try{ localStorage.removeItem(LEGACY_EVENT_KEY); }catch(_){ }
  }
  function validSelected(){
    const s = stateRef();
    const id = String(s.selectedEventId || '');
    return !!id && events().some(e => String(e.id) === id);
  }
  function forcePickerIfNeeded(){
    if(!isAuthed() || chosenForThisEntry()) return;
    const s = stateRef();
    if(!Array.isArray(s.eventos)) return;
    if(s.selectedEventId) s.__ceV250PreviousEventId = s.selectedEventId;
    s.selectedEventId = '';
    clearLegacyEventMemory();
  }
  function patchVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{
      window.emittedByTextV171 = function(date = new Date()){
        const p = n => String(n).padStart(2,'0');
        return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
      };
      emittedByTextV171 = window.emittedByTextV171;
    }catch(_){ }
  }
  function patchEventSelect(){
    const sel = $('selectedEvent');
    if(!sel) return;
    if(!sel.querySelector('option[value=""]')){
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = events().length ? 'Selecciona evento...' : 'Sin eventos';
      sel.insertBefore(opt, sel.firstChild);
    }
    if(!validSelected()) sel.value = '';
    sel.classList.toggle('ce-v250-awaiting', isAuthed() && !validSelected());
  }
  function patchNoEventMessage(){
    const waiting = isAuthed() && !validSelected();
    document.body.classList.toggle('ce-v250-no-event', waiting);
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.toggle('hidden', !waiting);
      msg.classList.toggle('ce-v250-pick-event', waiting);
      const empty = msg.querySelector('.empty');
      if(empty){
        empty.textContent = events().length
          ? 'Selecciona un evento en el desplegable EVENTO para cargar sus datos.'
          : 'No hay eventos. Crea uno desde mantenimiento.';
      }
    }
  }
  function renderHeaderOnly(){
    try{ if(typeof renderEnvironmentBanner === 'function') renderEnvironmentBanner(); }catch(_){ }
    try{ if(typeof renderAuthUI === 'function') renderAuthUI(); }catch(_){ }
    patchVersion();
    if(!isAuthed()) return;
    forcePickerIfNeeded();
    try{ if(typeof renderHeader === 'function') renderHeader(); }catch(err){ console.warn('[v25.0] renderHeader ligero', err); }
    try{ if(typeof renderTabVisibility === 'function') renderTabVisibility(); }catch(_){ }
    try{ if(typeof renderMainSelectors === 'function') renderMainSelectors(); }catch(err){ console.warn('[v25.0] renderMainSelectors ligero', err); }
    patchEventSelect();
    patchNoEventMessage();
    try{ if(typeof renderPermissions === 'function') renderPermissions(); }catch(_){ }
    try{ if(typeof renderLockState === 'function') renderLockState(); }catch(_){ }
    scheduleDeferredTips();
  }
  function deferTipsNow(){
    document.querySelectorAll('[data-ce-tip-v21]').forEach(el => {
      if(el.closest('#ceTooltipV21,#authOverlay')) return;
      const html = el.getAttribute('data-ce-tip-v21');
      if(!html) return;
      tipStore.set(el, {
        html,
        bg: el.getAttribute('data-tip-bg-v21') || el.getAttribute('data-ce-tip-bg') || '',
        layout: el.getAttribute('data-ce-tip-layout-v21') || el.getAttribute('data-ce-tip-layout') || ''
      });
      el.removeAttribute('data-ce-tip-v21');
      el.removeAttribute('data-tip-bg-v21');
      el.removeAttribute('data-ce-tip-layout-v21');
      el.removeAttribute('data-ce-tip-bg');
      el.removeAttribute('data-ce-tip-layout');
      el.setAttribute('data-ce-tip-lazy-v250','1');
    });
  }
  function hydrateTip(target){
    const el = target?.closest?.('[data-ce-tip-lazy-v250]');
    if(!el) return;
    const tip = tipStore.get(el);
    if(!tip) return;
    el.setAttribute('data-ce-tip-v21', tip.html);
    if(tip.bg) el.setAttribute('data-tip-bg-v21', tip.bg);
    if(tip.layout) el.setAttribute('data-ce-tip-layout-v21', tip.layout);
    el.removeAttribute('data-ce-tip-lazy-v250');
  }
  function scheduleDeferredTips(){
    [0, 90, 350, 1000].forEach(ms => setTimeout(deferTipsNow, ms));
  }
  ['pointerdown','mousedown','touchstart','focusin'].forEach(type => {
    document.addEventListener(type, ev => hydrateTip(ev.target), true);
  });
  document.addEventListener('keydown', ev => {
    if(ev.key === 'Enter' || ev.key === ' ') hydrateTip(ev.target);
  }, true);

  const previousRender = (typeof render === 'function') ? render : window.render;
  function renderV250(){
    if(!isAuthed()){
      const ret = previousRender ? previousRender.apply(this, arguments) : undefined;
      patchVersion();
      return ret;
    }
    forcePickerIfNeeded();
    if(!validSelected()){
      renderHeaderOnly();
      return undefined;
    }
    const ret = previousRender ? previousRender.apply(this, arguments) : undefined;
    patchVersion();
    patchEventSelect();
    patchNoEventMessage();
    scheduleDeferredTips();
    return ret;
  }
  try{ render = renderV250; }catch(_){ }
  window.render = renderV250;

  const previousMerge = (typeof mergeLoadedState === 'function') ? mergeLoadedState : window.mergeLoadedState;
  if(previousMerge && !previousMerge.__v250Wrapped){
    const wrappedMerge = function(serverState, defaults){
      const merged = previousMerge.apply(this, arguments);
      if(isAuthed() && !chosenForThisEntry() && merged && Array.isArray(merged.eventos)){
        merged.selectedEventId = '';
      }
      return merged;
    };
    wrappedMerge.__v250Wrapped = true;
    try{ mergeLoadedState = wrappedMerge; }catch(_){ }
    window.mergeLoadedState = wrappedMerge;
  }

  const previousLogin = (typeof doLogin === 'function') ? doLogin : window.doLogin;
  if(previousLogin && !previousLogin.__v250Wrapped){
    const wrappedLogin = async function(){
      markEntryNeedsEvent();
      const ret = await previousLogin.apply(this, arguments);
      if(isAuthed()){
        forcePickerIfNeeded();
        renderV250();
      }
      return ret;
    };
    wrappedLogin.__v250Wrapped = true;
    try{ doLogin = wrappedLogin; }catch(_){ }
    window.doLogin = wrappedLogin;
  }

  const previousLogout = (typeof doLogout === 'function') ? doLogout : window.doLogout;
  if(previousLogout && !previousLogout.__v250Wrapped){
    const wrappedLogout = async function(){
      markEntryNeedsEvent();
      return previousLogout.apply(this, arguments);
    };
    wrappedLogout.__v250Wrapped = true;
    try{ doLogout = wrappedLogout; }catch(_){ }
    window.doLogout = wrappedLogout;
  }

  const previousChangeSelected = (typeof changeSelectedEvent === 'function') ? changeSelectedEvent : window.changeSelectedEvent;
  const changeSelectedEventV250 = async function(value){
    const id = String(value || '');
    const s = stateRef();
    if(!id){
      markEntryNeedsEvent();
      s.selectedEventId = '';
      renderV250();
      return false;
    }
    try{ sessionStorage.setItem(CHOSEN_KEY, '1'); }catch(_){ }
    s.selectedEventId = id;
    if(previousChangeSelected && previousChangeSelected !== changeSelectedEventV250){
      return previousChangeSelected.apply(this, arguments);
    }
    renderV250();
    return false;
  };
  try{ changeSelectedEvent = changeSelectedEventV250; }catch(_){ }
  window.changeSelectedEvent = changeSelectedEventV250;

  patchVersion();
  if(isAuthed()) renderV250();
  scheduleDeferredTips();
  window.__ceV250 = {version: VERSION, render: renderV250, deferTips: deferTipsNow};
})();

;/* ===== END legacy-inline-55-v250-core.js ===== */


;/* ===== BEGIN legacy-inline-56-v251-core.js ===== */

/* ControlEvent v45.1 - JS legacy extraido de public/index.html. Bloque inline #56. */
/* ==== v25.1: operativa, zooms y RESUMEN Excel ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.1';
  const VERSION_FILE = 'ControlEvent_v45_1';
  const $ = id => document.getElementById(id);
  const COLORS = {
    income:'#eef6ff',
    donation:'#fff7e8',
    bought:'#dc2626',
    donated:'#f59e0b',
    pending:'#fb7185',
    pendingSoft:'#fff1f2',
    white:'#ffffff'
  };
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(v); }catch(_){ }
    return num(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  };
  function stateRef(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function rowsFor(k){ const s = stateRef(); return Array.isArray(s[k]) ? s[k] : []; }
  function evId(){ try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; return String(ev?.id || stateRef().selectedEventId || ''); }catch(_){ return String(stateRef().selectedEventId || ''); } }
  function byId(k,id){ return rowsFor(k).find(x => String(x.id) === String(id)) || {}; }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id); }catch(_){ return byId('productos', id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id); }catch(_){ return byId('tiendas', id); } }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id); }catch(_){ return byId('personas', id); } }
  function compras(){
    try{ const r = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(r)) return r; }catch(_){ }
    const id = evId();
    return rowsFor('compras').filter(c => String(c.eventId || '') === id);
  }
  function isDonation(v){ try{ return typeof isDonationTicket === 'function' ? isDonationTicket(v) : up(v).startsWith('DONADO'); }catch(_){ return up(v).startsWith('DONADO'); } }
  function isCurrent(v){ try{ return typeof isCurrentExpenseTicket === 'function' ? isCurrentExpenseTicket(v) : up(v) === 'GASTOS CORRIENTES'; }catch(_){ return up(v) === 'GASTOS CORRIENTES'; } }
  function ticket(c){ return norm(c?.ticketDonacion || c?.ticket || ''); }
  function productName(c){ return norm(c?.producto?.nombre || producto(c?.productoId).nombre || c?.productoNombre || 'Producto'); }
  function storeName(c){
    const p = producto(c?.productoId);
    const id = c?.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    return norm(c?.tienda?.nombre || tienda(id).nombre || '') || 'Sin tienda asignada';
  }
  function units(c){ return num(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ const p = producto(c?.productoId); return num(c?.precio ?? c?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(c){ return num(c?.valor ?? c?.importe) || units(c) * price(c); }
  function setTip(el, text, bg = '#fff', layout = 'default'){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v21', text);
    el.setAttribute('data-tip-bg-v21', bg || '#fff');
    el.setAttribute('data-ce-tip-layout-v21', layout || 'default');
    el.removeAttribute('title');
    el.removeAttribute('data-tip');
    el.removeAttribute('data-ce-tip');
    el.removeAttribute('data-ce-tip-lazy-v250');
  }
  function lineCompra(c, label){
    return `${label || ticket(c) || 'PTE.COMPRA'} | ${storeName(c)} | ${productName(c)} | ${units(c).toLocaleString('es-ES',{maximumFractionDigits:2})} | ${money(price(c))} | ${money(value(c))}`;
  }
  function purchaseRows(kind){
    let list = compras().filter(c => !isDonation(ticket(c)));
    if(kind === 'realizadas') list = list.filter(c => ticket(c) && !isCurrent(ticket(c)));
    else if(kind === 'corrientes') list = list.filter(c => isCurrent(ticket(c)));
    else if(kind === 'pendientes') list = list.filter(c => !ticket(c));
    return list.slice().sort((a,b) => (ticket(a) || 'PTE.COMPRA').localeCompare(ticket(b) || 'PTE.COMPRA','es') || storeName(a).localeCompare(storeName(b),'es') || productName(a).localeCompare(productName(b),'es'));
  }
  function listLines(kind){
    const list = purchaseRows(kind);
    if(!list.length) return ['Sin registros'];
    return list.map(c => lineCompra(c, kind === 'corrientes' ? 'GASTOS CORRIENTES' : (ticket(c) || 'PTE.COMPRA')));
  }
  function operativeValues(b){
    const op = b?.operativa || {};
    const presupuesto = num(op.ingresos ?? op.ingresoDinero ?? b?.ingresosDinero?.totalComprometido);
    const gastoCompras = num(op.gastoCompras);
    const gastosOrganizacion = num(op.gastosOrganizacion);
    const pendiente = num(op.pendiente);
    const gastosPrevistos = num(op.gastosPrevistos) || gastoCompras + gastosOrganizacion + pendiente;
    const gastosRealizados = num(op.gastosRealizados) || gastoCompras + gastosOrganizacion;
    const saldoActual = Number.isFinite(Number(op.saldoActual)) ? num(op.saldoActual) : num(op.ingresoDinero) - gastosRealizados;
    const saldoOperativo = Number.isFinite(Number(op.saldoOperativo)) ? num(op.saldoOperativo) : presupuesto - gastosPrevistos;
    const valorDonado = num(b?.donacionProducto?.valorDonado);
    return {presupuesto,gastoCompras,gastosOrganizacion,pendiente,gastosPrevistos,gastosRealizados,saldoActual,saldoOperativo,valorDonado,valoracionEvento:gastosPrevistos + valorDonado, ingresoRealizado:num(op.ingresoDinero ?? b?.ingresosDinero?.totalIngresado), ingresoPendiente:num(b?.ingresosDinero?.pendiente)};
  }
  const previousBudgetSummary = (typeof budgetSummary === 'function') ? budgetSummary : window.budgetSummary;
  if(previousBudgetSummary && !previousBudgetSummary.__v251Wrapped){
    const wrappedBudgetSummary = function(){
      const b = previousBudgetSummary.apply(this, arguments) || {};
      const op = operativeValues(b);
      b.operativa = Object.assign({}, b.operativa || {}, op, {ingresos:op.presupuesto});
      return b;
    };
    wrappedBudgetSummary.__v251Wrapped = true;
    try{ budgetSummary = wrappedBudgetSummary; }catch(_){ }
    window.budgetSummary = wrappedBudgetSummary;
  }
  function operativeTip(label, op){
    const lines = {
      presupuesto: [`INGRESO TOTAL = ingresos realizados + pendiente de ingresar`, `${money(op.presupuesto)} = ${money(op.ingresoRealizado)} + ${money(op.ingresoPendiente)}`],
      gastosPrevistos: [`GASTOS PREVISTOS = gastos realizados + pte. compra u otros gastos`, `${money(op.gastosPrevistos)} = ${money(op.gastosRealizados)} + ${money(op.pendiente)}`, '', 'Detalle previsto', ...listLines('realizadas'), ...listLines('corrientes'), ...listLines('pendientes')],
      gastosRealizados: [`GASTOS REALIZADOS = tickets + gastos corrientes`, `${money(op.gastosRealizados)} = ${money(op.gastoCompras)} + ${money(op.gastosOrganizacion)}`, '', 'Tickets', ...listLines('realizadas'), '', 'Gastos corrientes', ...listLines('corrientes')],
      pendiente: [`PTE. COMPRA U OTROS GASTOS`, `TOTAL: ${money(op.pendiente)}`, '', 'Ticket | Tienda | Producto | Uds | Precio | Total', ...listLines('pendientes')],
      saldoActual: [`SALDO ACTUAL = ingresos realizados - gastos realizados`, `${money(op.saldoActual)} = ${money(op.ingresoRealizado)} - ${money(op.gastosRealizados)}`],
      saldoOperativo: [`SALDO OPERATIVO = ingreso total - gastos previstos`, `${money(op.saldoOperativo)} = ${money(op.presupuesto)} - ${money(op.gastosPrevistos)}`],
      valoracion: [`VALORACION DEL EVENTO = gastos previstos + valor producto donado`, `${money(op.valoracionEvento)} = ${money(op.gastosPrevistos)} + ${money(op.valorDonado)}`]
    };
    return `OPERATIVA / ${label}\n${(lines[label] || []).join('\n')}`;
  }
  function renderOperativeRows(op){
    const saldoColor = v => num(v) >= 0 ? '#047857' : '#b91c1c';
    const row = (label, value, key, cls, amountStyle = '') =>
      `<div class="budget-row ${cls || ''}" data-v251-op="${key}"><strong>${esc(label)}</strong><span style="${amountStyle}">${esc(money(value))}</span></div>`;
    return [
      row('INGRESO TOTAL', op.presupuesto, 'presupuesto', 'ce-v251-op-black'),
      row('GASTOS PREVISTOS', op.gastosPrevistos, 'gastosPrevistos', 'ce-v251-op-black'),
      row('GASTOS REALIZADOS', op.gastosRealizados, 'gastosRealizados', 'ce-v251-op-black'),
      row('PTE. COMPRA U OTROS GASTOS', op.pendiente, 'pendiente', 'ce-v251-op-pending'),
      row('SALDO ACTUAL', op.saldoActual, 'saldoActual', '', `color:${saldoColor(op.saldoActual)};font-weight:900`),
      row('SALDO OPERATIVO', op.saldoOperativo, 'saldoOperativo', '', `color:${saldoColor(op.saldoOperativo)};font-weight:900`),
      row('VALORACION DEL EVENTO', op.valoracionEvento, 'valoracion', 'ce-v251-op-black')
    ].join('');
  }
  function renderBudgetV251(){
    const wrap = $('budgetLayout');
    const b = (typeof budgetSummary === 'function') ? budgetSummary() : {};
    const op = operativeValues(b);
    if(wrap){
      const socios = b.ingresosDinero?.socios || {};
      const noSocios = b.ingresosDinero?.noSocios || b.ingresosDinero?.donantes || {};
      const don = b.donacionProducto || {};
      wrap.innerHTML = `
        <div class="budget-panel socios">
          <h3>INGRESOS</h3>
          <div class="budget-rows">
            <div class="budget-row budget-subgroup"><strong>SOCIOS</strong><span>${esc(money(socios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${esc(String(num(socios.count)))}</span></div>
              <div class="budget-subrow"><span>Importe socios</span><span>${esc(money(socios.importe))}</span></div>
              <div class="budget-subrow"><span>Ingresado socios</span><span>${esc(money(socios.ingresado))}</span></div>
              <div class="budget-subrow"><span>Pendiente socios</span><span>${esc(money(socios.pendiente))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>NO SOCIOS</strong><span>${esc(money(noSocios.ingresado))}</span></div>
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Personas</span><span>${esc(String(num(noSocios.count)))}</span></div>
              <div class="budget-subrow"><span>Importe no socios</span><span>${esc(money(noSocios.importe))}</span></div>
              <div class="budget-subrow"><span>Ingresado no socios</span><span>${esc(money(noSocios.ingresado))}</span></div>
              <div class="budget-subrow"><span>Pendiente no socios</span><span>${esc(money(noSocios.pendiente))}</span></div>
            </div>
          </div>
        </div>
        <div class="budget-panel donantes">
          <h3>DONACION DE PRODUCTO</h3>
          <div class="budget-rows">
            <div class="budget-subrows">
              <div class="budget-subrow"><span>Donacion de producto tiendas</span><span>${esc(money(don.donadoTienda))}</span></div>
              <div class="budget-subrow"><span>Donacion de producto socios</span><span>${esc(money(don.donadoSocio))}</span></div>
              <div class="budget-subrow"><span>Donacion de producto no socios</span><span>${esc(money(don.donadoOtros))}</span></div>
            </div>
            <div class="budget-row budget-subgroup"><strong>Valor producto donado</strong><span>${esc(money(don.valorDonado))}</span></div>
          </div>
        </div>
        <div class="budget-panel operativo">
          <h3>OPERATIVA</h3>
          <div class="budget-rows">${renderOperativeRows(op)}</div>
        </div>`;
    }
    try{ if(typeof renderSummaryList === 'function') renderSummaryList('summarySegmento', typeof summaryBySegmento === 'function' ? summaryBySegmento() : []); }catch(_){ }
    try{ if(typeof renderSummaryList === 'function') renderSummaryList('summaryDestino', typeof summaryByDestino === 'function' ? summaryByDestino() : []); }catch(_){ }
    try{ if(typeof renderSummaryList === 'function') renderSummaryList('summaryTiendaTicket', typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket() : []); }catch(_){ }
    try{ if(typeof renderGraficas === 'function') renderGraficas(); }catch(_){ }
    applyZoomColorsV251();
  }
  const previousRenderBudget = (typeof renderBudget === 'function') ? renderBudget : window.renderBudget;
  if(previousRenderBudget && !previousRenderBudget.__v251Wrapped){
    try{ renderBudget = renderBudgetV251; }catch(_){ }
    window.renderBudget = renderBudgetV251;
  }
  function applyZoomColorsV251(){
    const b = (typeof budgetSummary === 'function') ? budgetSummary() : {};
    const op = operativeValues(b);
    document.querySelectorAll('#budgetLayout .budget-panel.socios [data-ce-tip-v21]').forEach(el => el.setAttribute('data-tip-bg-v21', COLORS.income));
    document.querySelectorAll('#budgetLayout .budget-panel.donantes [data-ce-tip-v21]').forEach(el => el.setAttribute('data-tip-bg-v21', COLORS.donation));
    document.querySelectorAll('#summarySegmento [data-v24-kind],#summaryDestino [data-v24-kind]').forEach(el => {
      const kind = el.getAttribute('data-v24-kind');
      const color = kind === 'comprado' ? COLORS.bought : (kind === 'donado' ? COLORS.donated : COLORS.pending);
      if(el.hasAttribute('data-ce-tip-v21')) el.setAttribute('data-tip-bg-v21', color);
    });
    document.querySelectorAll('#summaryTiendaTicket .summary-item.red-row [data-ce-tip-v21],#summaryTiendaTicket .summary-item.red-row[data-ce-tip-v21]').forEach(el => {
      el.setAttribute('data-tip-bg-v21', COLORS.white);
      el.setAttribute('data-ce-tip-layout-v21', 'ticketpendingv251');
    });
    document.querySelectorAll('#budgetLayout [data-v251-op]').forEach(row => {
      const key = row.getAttribute('data-v251-op');
      const bg = key === 'pendiente' ? COLORS.white : COLORS.white;
      setTip(row, operativeTip(key, op), bg, key === 'pendiente' ? 'ticketpendingv251' : 'formulav251');
      row.querySelectorAll(':scope > strong,:scope > span').forEach(child => setTip(child, operativeTip(key, op), bg, key === 'pendiente' ? 'ticketpendingv251' : 'formulav251'));
    });
  }
  function cellText(value){
    if(value == null) return '';
    if(typeof value === 'object'){
      if(Array.isArray(value.richText)) return value.richText.map(x => x.text || '').join('');
      if(value.text) return String(value.text);
      if(value.result != null) return String(value.result);
    }
    return String(value);
  }
  function patchResumenSheetV251(workbook){
    if(!workbook || workbook.__ceV251ResumenPatched) return;
    const ws = workbook.getWorksheet && workbook.getWorksheet('RESUMEN');
    if(!ws) return;
    workbook.__ceV251ResumenPatched = true;
    let priceRow = 0;
    ws.eachRow((row, n) => {
      if(!priceRow && up(cellText(row.getCell(1).value)).includes('PRECIO EVENTO')) priceRow = n;
    });
    if(!priceRow) return;
    const b = (typeof budgetSummary === 'function') ? budgetSummary() : {};
    const op = operativeValues(b);
    const valueCol = [2,3,4,5].find(c => ws.getRow(priceRow).getCell(c).value !== null && ws.getRow(priceRow).getCell(c).value !== undefined) || 2;
    const rows = [
      null,
      ['Donacion de producto', op.valorDonado, 'white'],
      null,
      ['INGRESO TOTAL', op.presupuesto, 'white'],
      ['GASTOS PREVISTOS', op.gastosPrevistos, 'white'],
      ['GASTOS REALIZADOS', op.gastosRealizados, 'white'],
      ['PTE. COMPRA U OTROS GASTOS', op.pendiente, 'pending'],
      ['SALDO ACTUAL', op.saldoActual, op.saldoActual >= 0 ? 'ok' : 'bad'],
      ['SALDO OPERATIVO', op.saldoOperativo, op.saldoOperativo >= 0 ? 'ok' : 'bad'],
      ['VALORACION DEL EVENTO', op.valoracionEvento, 'white']
    ];
    const makeRow = item => {
      if(!item) return [];
      const arr = [];
      arr[1] = item[0];
      arr[valueCol] = Number(item[1] || 0);
      return arr;
    };
    ws.spliceRows(priceRow + 1, 0, ...rows.map(makeRow));
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fillFor = kind => kind === 'pending' ? 'FFFFE4EC' : (kind === 'ok' ? 'FFECFDF5' : (kind === 'bad' ? 'FFFEF2F2' : 'FFFFFFFF'));
    rows.forEach((item, i) => {
      if(!item) return;
      const r = ws.getRow(priceRow + 1 + i);
      for(let c = 1; c <= Math.max(valueCol, 3); c++){
        const cell = r.getCell(c);
        cell.border = border;
        cell.alignment = {vertical:'middle', wrapText:true};
        cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fillFor(item[2])}};
      }
      r.getCell(1).font = {bold:true, color:{argb:item[2] === 'pending' ? 'FFBE123C' : 'FF111827'}};
      const v = r.getCell(valueCol);
      v.numFmt = '#,##0.00 [$€-C0A]';
      v.font = {bold:true, color:{argb:item[2] === 'pending' ? 'FFBE123C' : 'FF111827'}};
    });
  }
  function patchExcelWriteBufferV251(){
    try{
      if(!window.ExcelJS || !ExcelJS.Workbook) return false;
      const probe = new ExcelJS.Workbook();
      const proto = probe.xlsx && probe.xlsx.constructor && probe.xlsx.constructor.prototype;
      if(!proto || !proto.writeBuffer || proto.writeBuffer.__v251Wrapped) return true;
      const prev = proto.writeBuffer;
      proto.writeBuffer = async function(){
        if(this.workbook && this.workbook.__ceModularStandaloneClean){
          return await prev.apply(this, arguments);
        }
        try{ patchResumenSheetV251(this.workbook); }catch(err){ console.warn('[v25.1] No se pudo reforzar RESUMEN', err); }
        return await prev.apply(this, arguments);
      };
      proto.writeBuffer.__v251Wrapped = true;
      return true;
    }catch(_){ return false; }
  }
  const previousExportExcel = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel;
  if(previousExportExcel && !previousExportExcel.__v251Wrapped){
    const wrappedExportExcel = async function(){
      try{ if(typeof ensureExcelJS === 'function') await ensureExcelJS(); }catch(_){ }
      patchExcelWriteBufferV251();
      return await previousExportExcel.apply(this, arguments);
    };
    wrappedExportExcel.__v251Wrapped = true;
    try{ exportExcel = wrappedExportExcel; }catch(_){ }
    window.exportExcel = wrappedExportExcel;
  }
  function applyVersionV251(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{
      window.emittedByTextV171 = function(date = new Date()){
        const p = n => String(n).padStart(2,'0');
        return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
      };
      emittedByTextV171 = window.emittedByTextV171;
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v251Wrapped){
        const prev = proto.click;
        const wrapped = function(){
          try{
            if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE);
          }catch(_){ }
          return prev.apply(this, arguments);
        };
        wrapped.__v251Wrapped = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }
  const previousRender = (typeof render === 'function') ? render : window.render;
  if(previousRender && !previousRender.__v251Wrapped){
    const wrappedRender = function(){
      const ret = previousRender.apply(this, arguments);
      [40, 180, 650, 1300, 3100].forEach(ms => setTimeout(() => {
        applyVersionV251();
        patchExcelWriteBufferV251();
        try{ applyZoomColorsV251(); }catch(_){ }
      }, ms));
      return ret;
    };
    wrappedRender.__v251Wrapped = true;
    try{ render = wrappedRender; }catch(_){ }
    window.render = wrappedRender;
  }
  applyVersionV251();
  patchExcelWriteBufferV251();
  [120, 500, 1400, 3200].forEach(ms => setTimeout(() => { applyVersionV251(); patchExcelWriteBufferV251(); try{ applyZoomColorsV251(); }catch(_){ } }, ms));
  window.__ceV251 = {version: VERSION, renderBudget: renderBudgetV251, applyZoomColors: applyZoomColorsV251, patchResumenSheet: patchResumenSheetV251};
})();

;/* ===== END legacy-inline-56-v251-core.js ===== */


;/* ===== BEGIN legacy-inline-57-v252-core.js ===== */

/* ControlEvent v45.1 - JS legacy extraido de public/index.html. Bloque inline #57. */
/* ==== v25.2: limpieza RESUMEN Excel, zooms donacion y barras ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.1';
  const VERSION_FILE = 'ControlEvent_v45_1';
  const CREAM = '#fff7e8';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(v); }catch(_){ }
    return num(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  };
  function st(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function rows(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function currentEventId(){ try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; return String(ev?.id || st().selectedEventId || ''); }catch(_){ return String(st().selectedEventId || ''); } }
  function byId(k,id){ return rows(k).find(x => String(x.id) === String(id)) || {}; }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id); }catch(_){ return byId('personas', id); } }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id); }catch(_){ return byId('productos', id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id); }catch(_){ return byId('tiendas', id); } }
  function compras(){
    try{ const r = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(r)) return r; }catch(_){ }
    const ev = currentEventId();
    return rows('compras').filter(c => String(c.eventId || '') === ev);
  }
  function ticket(c){ return norm(c?.ticketDonacion || c?.ticket || ''); }
  function units(c){ return num(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ const p = producto(c?.productoId); return num(c?.precio ?? c?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(c){ return num(c?.valor ?? c?.importe) || units(c) * price(c); }
  function productName(c){ return norm(c?.producto?.nombre || producto(c?.productoId).nombre || c?.productoNombre || 'Producto'); }
  function storeName(c){
    const p = producto(c?.productoId);
    const id = c?.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    return norm(c?.tienda?.nombre || tienda(id).nombre || '') || 'Sin tienda asignada';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const v = donorLabel(c.donorRef); if(norm(v)) return norm(v); } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return norm(persona(raw.slice(2)).nombre) || 'Sin donante';
    if(raw.startsWith('T:')) return norm(tienda(raw.slice(2)).nombre) || 'Sin donante';
    return raw || norm(c?.responsable?.nombre) || storeName(c) || 'Sin donante';
  }
  function setTip(el, text, bg = '#fff', layout = 'default'){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v21', text);
    el.setAttribute('data-tip-bg-v21', bg);
    el.setAttribute('data-ce-tip-layout-v21', layout);
    ['title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip-lazy-v250'].forEach(a => el.removeAttribute(a));
  }
  function donationRows(code){
    return compras().filter(c => ticket(c) === code).slice().sort((a,b) => donorName(a).localeCompare(donorName(b),'es') || productName(a).localeCompare(productName(b),'es'));
  }
  function donationTip(title, code){
    const list = donationRows(code);
    const total = list.reduce((a,c) => a + value(c), 0);
    const lines = list.map(c => `${donorName(c)} | ${productName(c)} | ${units(c).toLocaleString('es-ES',{maximumFractionDigits:2})} | ${money(price(c))} | ${money(value(c))}`);
    return `DONACION DE PRODUCTO / ${title}\nTOTAL ESTIMADO: ${money(total)}\n\nDonante | Producto | Uds | Precio estimado | Valor estimado\n${lines.length ? lines.join('\n') : 'Sin registros'}`;
  }
  function applyDonationTipsV252(){
    const panel = $('#budgetLayout')?.querySelector?.('.budget-panel.donantes');
    if(!panel) return;
    panel.querySelectorAll('.budget-subrow').forEach(row => {
      const label = up(row.querySelector('span')?.textContent || row.textContent || '');
      let code = '', title = '';
      if(label.includes('TIENDA')){ code = 'DONADO TIENDA'; title = 'TIENDAS'; }
      else if(label.includes('SOCIOS') && !label.includes('NO SOCIOS')){ code = 'DONADO SOCIO'; title = 'SOCIOS'; }
      else if(label.includes('NO SOCIOS') || label.includes('NO SOCIO')){ code = 'DONADO OTROS'; title = 'NO SOCIOS'; }
      if(!code) return;
      const tip = donationTip(title, code);
      setTip(row, tip, CREAM, 'budgetdonationv252');
      row.querySelectorAll('span,strong').forEach(el => setTip(el, tip, CREAM, 'budgetdonationv252'));
    });
    const totalRow = Array.from(panel.querySelectorAll('.budget-row')).find(row => up(row.textContent).includes('VALOR PRODUCTO DONADO'));
    if(totalRow){
      const tip = ['TIENDAS','SOCIOS','NO SOCIOS'].map((title, idx) => donationTip(title, ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'][idx])).join('\n\n');
      setTip(totalRow, tip, CREAM, 'budgetdonationv252');
      totalRow.querySelectorAll('span,strong').forEach(el => setTip(el, tip, CREAM, 'budgetdonationv252'));
    }
  }
  function patchTiendaTicketDonationLabels(){
    const prev = (typeof summaryByTiendaTicket === 'function') ? summaryByTiendaTicket : window.summaryByTiendaTicket;
    if(prev && !prev.__v252Wrapped){
      const wrapped = function(){
        return (prev.apply(this, arguments) || []).map(r => {
          if(r && r.donated) return Object.assign({}, r, {label: r.k || r.label});
          return r;
        });
      };
      wrapped.__v252Wrapped = true;
      try{ summaryByTiendaTicket = wrapped; }catch(_){ }
      window.summaryByTiendaTicket = wrapped;
    }
    document.querySelectorAll('#summaryTiendaTicket .summary-item > span:first-child').forEach(label => {
      const txt = label.textContent || '';
      if(txt.includes('·')) label.textContent = txt.split('·')[0].trim();
    });
  }
  function resizeGroupingBarsV252(){
    document.querySelectorAll('#summarySegmento .ce-v24-vbars-chart .vbar-stick,#summaryDestino .ce-v24-vbars-chart .vbar-stick').forEach(stick => {
      if(stick.dataset.v252Scaled === '1') return;
      const raw = parseFloat(stick.style.height || stick.getAttribute('style')?.match(/height:([0-9.]+)px/)?.[1] || '0');
      if(raw > 0) stick.style.height = Math.max(7, Math.min(122, raw * 0.70)) + 'px';
      stick.dataset.v252Scaled = '1';
    });
  }
  function cellText(value){
    if(value == null) return '';
    if(typeof value === 'object'){
      if(Array.isArray(value.richText)) return value.richText.map(x => x.text || '').join('');
      if(value.text) return String(value.text);
      if(value.result != null) return String(value.result);
    }
    return String(value);
  }
  function operativeValues(){
    const b = (typeof budgetSummary === 'function') ? budgetSummary() : {};
    const op = b.operativa || {};
    const presupuesto = num(op.ingresos ?? op.presupuesto ?? b.ingresosDinero?.totalComprometido);
    const gastosRealizados = num(op.gastosRealizados) || num(op.gastoCompras) + num(op.gastosOrganizacion);
    const gastosPrevistos = num(op.gastosPrevistos) || gastosRealizados + num(op.pendiente);
    const saldoActual = Number.isFinite(Number(op.saldoActual)) ? num(op.saldoActual) : num(op.ingresoDinero) - gastosRealizados;
    const saldoOperativo = Number.isFinite(Number(op.saldoOperativo)) ? num(op.saldoOperativo) : presupuesto - gastosPrevistos;
    const donado = num(b.donacionProducto?.valorDonado);
    return {donado,presupuesto,gastosPrevistos,gastosRealizados,pendiente:num(op.pendiente),saldoActual,saldoOperativo,valoracion:gastosPrevistos + donado};
  }
  function formatResumenCell(cell, kind){
    cell.border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    cell.alignment = {vertical:'middle', wrapText:true};
    const fill = kind === 'pending' ? 'FFFFE4EC' : (kind === 'ok' ? 'FFECFDF5' : (kind === 'bad' ? 'FFFEF2F2' : 'FFFFFFFF'));
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fill}};
  }
  function cleanResumenSheetV252(workbook){
    if(!workbook || workbook.__ceV252ResumenPatched) return;
    const ws = workbook.getWorksheet && workbook.getWorksheet('RESUMEN');
    if(!ws) return;
    workbook.__ceV252ResumenPatched = true;
    const deleteLabels = new Set([
      'DONACION DE PRODUCTO','DONACIONES DE PRODUCTO','INGRESO TOTAL','GASTOS PREVISTOS','GASTOS REALIZADOS',
      'PTE. COMPRA U OTROS GASTOS','SALDO ACTUAL','SALDO OPERATIVO','VALORACION DEL EVENTO',
      'INGRESOS','GASTOS'
    ]);
    for(let r = ws.rowCount; r >= 1; r--){
      const label = up(cellText(ws.getRow(r).getCell(1).value));
      if(deleteLabels.has(label)) ws.spliceRows(r, 1);
    }
    let priceRow = 0;
    ws.eachRow((row, n) => {
      if(!priceRow && up(cellText(row.getCell(1).value)).includes('PRECIO EVENTO')) priceRow = n;
    });
    if(!priceRow) return;
    const valueCol = [2,3,4,5].find(c => ws.getRow(priceRow).getCell(c).value !== null && ws.getRow(priceRow).getCell(c).value !== undefined) || 2;
    const op = operativeValues();
    const insert = [
      null,
      ['Donacion de producto', op.donado, 'white'],
      null,
      ['INGRESO TOTAL', op.presupuesto, 'white'],
      ['GASTOS PREVISTOS', op.gastosPrevistos, 'white'],
      ['GASTOS REALIZADOS', op.gastosRealizados, 'white'],
      ['PTE. COMPRA U OTROS GASTOS', op.pendiente, 'pending'],
      ['SALDO ACTUAL', op.saldoActual, op.saldoActual >= 0 ? 'ok' : 'bad'],
      ['SALDO OPERATIVO', op.saldoOperativo, op.saldoOperativo >= 0 ? 'ok' : 'bad'],
      ['VALORACION DEL EVENTO', op.valoracion, 'white']
    ];
    ws.spliceRows(priceRow + 1, 0, ...insert.map(item => {
      if(!item) return [];
      const row = [];
      row[1] = item[0];
      row[valueCol] = Number(item[1] || 0);
      return row;
    }));
    insert.forEach((item, i) => {
      if(!item) return;
      const row = ws.getRow(priceRow + 1 + i);
      for(let c = 1; c <= Math.max(valueCol, 3); c++) formatResumenCell(row.getCell(c), item[2]);
      row.getCell(1).font = {bold:true, color:{argb:item[2] === 'pending' ? 'FFBE123C' : 'FF111827'}};
      row.getCell(valueCol).numFmt = '#,##0.00 [$€-C0A]';
      row.getCell(valueCol).font = {bold:true, color:{argb:item[2] === 'pending' ? 'FFBE123C' : 'FF111827'}};
    });
    for(let r = 1; r <= ws.rowCount; r++){
      for(let c = 6; c <= 30; c++) ws.getRow(r).getCell(c).value = null;
    }
  }
  function patchExcelWriteBufferV252(){
    try{
      if(!window.ExcelJS || !ExcelJS.Workbook) return false;
      const probe = new ExcelJS.Workbook();
      const proto = probe.xlsx && probe.xlsx.constructor && probe.xlsx.constructor.prototype;
      if(!proto || !proto.writeBuffer || proto.writeBuffer.__v252Wrapped) return true;
      const prev = proto.writeBuffer;
      proto.writeBuffer = async function(){
        if(this.workbook && this.workbook.__ceModularStandaloneClean){
          return await prev.apply(this, arguments);
        }
        try{
          if(this.workbook) this.workbook.__ceV251ResumenPatched = true;
          cleanResumenSheetV252(this.workbook);
        }catch(err){ console.warn('[v25.2] No se pudo limpiar RESUMEN', err); }
        return await prev.apply(this, arguments);
      };
      proto.writeBuffer.__v252Wrapped = true;
      return true;
    }catch(_){ return false; }
  }
  const previousExportExcelV252 = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel;
  if(previousExportExcelV252 && !previousExportExcelV252.__v252Wrapped){
    const wrappedExportExcelV252 = async function(){
      try{ if(typeof ensureExcelJS === 'function') await ensureExcelJS(); }catch(_){ }
      patchExcelWriteBufferV252();
      return await previousExportExcelV252.apply(this, arguments);
    };
    wrappedExportExcelV252.__v252Wrapped = true;
    try{ exportExcel = wrappedExportExcelV252; }catch(_){ }
    window.exportExcel = wrappedExportExcelV252;
  }
  function applyVersionV252(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{
      window.emittedByTextV171 = function(date = new Date()){
        const p = n => String(n).padStart(2,'0');
        return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
      };
      emittedByTextV171 = window.emittedByTextV171;
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v252Wrapped){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__v252Wrapped = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }
  function applyV252(){
    applyVersionV252();
    patchTiendaTicketDonationLabels();
    applyDonationTipsV252();
    resizeGroupingBarsV252();
    patchExcelWriteBufferV252();
  }
  const oldRender = (typeof render === 'function') ? render : window.render;
  if(oldRender && !oldRender.__v252Wrapped){
    const wrapped = function(){
      const ret = oldRender.apply(this, arguments);
      [60, 220, 800, 1600, 3200].forEach(ms => setTimeout(applyV252, ms));
      return ret;
    };
    wrapped.__v252Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  const oldRenderBudget = (typeof renderBudget === 'function') ? renderBudget : window.renderBudget;
  if(oldRenderBudget && !oldRenderBudget.__v252Wrapped){
    const wrappedBudget = function(){
      const ret = oldRenderBudget.apply(this, arguments);
      [30, 180, 700].forEach(ms => setTimeout(applyV252, ms));
      return ret;
    };
    wrappedBudget.__v252Wrapped = true;
    try{ renderBudget = wrappedBudget; }catch(_){ }
    window.renderBudget = wrappedBudget;
  }
  applyV252();
  [120, 600, 1400, 3000].forEach(ms => setTimeout(applyV252, ms));
  window.__ceV252 = {version: VERSION, apply: applyV252, cleanResumenSheet: cleanResumenSheetV252};
})();

;/* ===== END legacy-inline-57-v252-core.js ===== */


;/* ===== BEGIN legacy-inline-58-v253-core.js ===== */

/* ControlEvent v45.1 - JS legacy extraido de public/index.html. Bloque inline #58. */
/* ==== v25.9: cabeceras RESUMEN, donaciones especificas y foto+ticket ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.1';
  const VERSION_FILE = 'ControlEvent_v45_1';
  const CREAM = '#fff7e8';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(v); }catch(_){ }
    return num(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  };
  function st(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function rows(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function currentEventId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; return String(ev?.id || st().selectedEventId || ''); }
    catch(_){ return String(st().selectedEventId || ''); }
  }
  function byId(k,id){ return rows(k).find(x => String(x.id) === String(id)) || {}; }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id); }catch(_){ return byId('personas', id); } }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id); }catch(_){ return byId('productos', id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id); }catch(_){ return byId('tiendas', id); } }
  function compras(){
    try{ const r = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(r)) return r; }catch(_){ }
    const ev = currentEventId();
    return rows('compras').filter(c => String(c.eventId || '') === ev);
  }
  function ticket(c){ return norm(c?.ticketDonacion || c?.ticket || ''); }
  function units(c){ return num(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ const p = producto(c?.productoId); return num(c?.precio ?? c?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(c){ return num(c?.valor ?? c?.importe) || units(c) * price(c); }
  function productName(c){ return norm(c?.producto?.nombre || producto(c?.productoId).nombre || c?.productoNombre || 'Producto'); }
  function storeName(c){
    const p = producto(c?.productoId);
    const id = c?.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    return norm(c?.tienda?.nombre || tienda(id).nombre || '') || 'Sin tienda asignada';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const v = donorLabel(c.donorRef); if(norm(v)) return norm(v); } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return norm(persona(raw.slice(2)).nombre) || 'Sin donante';
    if(raw.startsWith('T:')) return norm(tienda(raw.slice(2)).nombre) || 'Sin donante';
    return raw || norm(c?.responsable?.nombre) || storeName(c) || 'Sin donante';
  }
  function clearTip(el){
    if(!el) return;
    ['title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip-v21','data-tip-bg-v21','data-ce-tip-layout-v21','data-ce-tip-lazy-v250'].forEach(a => el.removeAttribute(a));
  }
  function setTip(el, text, bg = '#fff', layout = 'default'){
    if(!el || !norm(text)) return;
    clearTip(el);
    el.setAttribute('data-ce-tip-v21', text);
    el.setAttribute('data-tip-bg-v21', bg);
    el.setAttribute('data-ce-tip-layout-v21', layout);
  }
  function setTipDeep(el, text, bg = '#fff', layout = 'default'){
    if(!el) return;
    [el, ...el.querySelectorAll('*')].forEach(node => setTip(node, text, bg, layout));
  }
  function donationRows(code){
    return compras().filter(c => ticket(c) === code).slice().sort((a,b) => donorName(a).localeCompare(donorName(b),'es') || productName(a).localeCompare(productName(b),'es'));
  }
  function donationTip(title, code){
    const list = donationRows(code);
    const total = list.reduce((a,c) => a + value(c), 0);
    const lines = list.map(c => `${donorName(c)} | ${productName(c)} | ${units(c).toLocaleString('es-ES',{maximumFractionDigits:2})} | ${money(price(c))} | ${money(value(c))}`);
    return `DONACION DE PRODUCTO / ${title}\nTOTAL ESTIMADO: ${money(total)}\n\nDonante | Producto | Uds | Precio estimado | Valor estimado\n${lines.length ? lines.join('\n') : 'Sin registros'}`;
  }
  function donationTotalTip(){
    const groups = [
      ['TIENDAS','DONADO TIENDA'],
      ['SOCIOS','DONADO SOCIO'],
      ['NO SOCIOS','DONADO OTROS']
    ];
    const lines = groups.map(([title, code]) => `${title} | ${money(donationRows(code).reduce((a,c) => a + value(c), 0))}`);
    const total = groups.reduce((a, item) => a + donationRows(item[1]).reduce((s,c) => s + value(c), 0), 0);
    return `DONACION DE PRODUCTO / TOTAL\n\nTipo | Valor estimado\n${lines.join('\n')}\n\nTOTAL ESTIMADO: ${money(total)}`;
  }
  function applyDonationTipsV253(){
    const panel = $('#budgetLayout')?.querySelector?.('.budget-panel.donantes');
    if(panel){
      panel.querySelectorAll('.budget-subrow').forEach(row => {
        const label = up(row.querySelector('span')?.textContent || row.textContent || '');
        let code = '', title = '';
        if(label.includes('TIENDA')){ code = 'DONADO TIENDA'; title = 'TIENDAS'; }
        else if(label.includes('NO SOCIO')){ code = 'DONADO OTROS'; title = 'NO SOCIOS'; }
        else if(label.includes('SOCIO')){ code = 'DONADO SOCIO'; title = 'SOCIOS'; }
        if(!code) return;
        row.dataset.v253DonationCode = code;
        setTipDeep(row, donationTip(title, code), CREAM, 'budgetdonationv253');
      });
      const totalRow = Array.from(panel.querySelectorAll('.budget-row')).find(row => up(row.textContent).includes('VALOR PRODUCTO DONADO'));
      if(totalRow) setTipDeep(totalRow, donationTotalTip(), CREAM, 'budgetdonationv253');
    }
    try{
      const segs = $('#eventChartWrap')?.querySelectorAll?.('.chart-row:nth-child(2) .chart-seg') || [];
      [
        ['DONADO TIENDA','Donado por tiendas'],
        ['DONADO SOCIO','Donado por socios'],
        ['DONADO OTROS','Donado por no socios']
      ].forEach((item, idx) => {
        const seg = segs[idx];
        if(seg) setTipDeep(seg, donationTip(item[1], item[0]), getComputedStyle(seg).backgroundColor || CREAM, 'graphdonationv253');
      });
    }catch(_){ }
  }
  function cellText(value){
    if(value == null) return '';
    if(typeof value === 'object'){
      if(Array.isArray(value.richText)) return value.richText.map(x => x.text || '').join('');
      if(value.text) return String(value.text);
      if(value.result != null) return String(value.result);
    }
    return String(value);
  }
  function rowText(ws, r, cols = 10){
    const row = ws.getRow(r);
    const out = [];
    for(let c = 1; c <= cols; c++) out.push(cellText(row.getCell(c).value));
    return out.filter(Boolean).join(' ');
  }
  function emittedByText(date = new Date()){
    const p = n => String(n).padStart(2,'0');
    return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
  }
  function styleHeader(row, text, cols = 7){
    row.getCell(1).value = text;
    row.height = 26;
    for(let c = 1; c <= cols; c++){
      const cell = row.getCell(c);
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
      cell.font = {bold:true, color:{argb:'FFFFFFFF'}, size:13};
      cell.alignment = {vertical:'middle', horizontal:c === 1 ? 'center' : 'left', wrapText:true};
      cell.border = {top:{style:'thin', color:{argb:'FF111827'}},left:{style:'thin', color:{argb:'FF111827'}},bottom:{style:'thin', color:{argb:'FF111827'}},right:{style:'thin', color:{argb:'FF111827'}}};
    }
  }
  function styleSoft(row, cols = 7){
    row.height = Math.max(row.height || 0, 23);
    for(let c = 1; c <= cols; c++){
      const cell = row.getCell(c);
      cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFEFF6FF'}};
      cell.font = {bold:c === 1, color:{argb:'FF111827'}};
      cell.alignment = {vertical:'middle', horizontal:c === 1 ? 'center' : 'left', wrapText:true};
    }
  }
  function formatResumenCell(cell, kind){
    cell.border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    cell.alignment = {vertical:'middle', wrapText:true};
    const fill = kind === 'pending' ? 'FFFFE4EC' : (kind === 'ok' ? 'FFECFDF5' : (kind === 'bad' ? 'FFFEF2F2' : 'FFFFFFFF'));
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fill}};
  }
  function operativeValues(){
    const b = (typeof budgetSummary === 'function') ? budgetSummary() : {};
    const op = b.operativa || {};
    const presupuesto = num(op.ingresos ?? op.presupuesto ?? b.ingresosDinero?.totalComprometido);
    const gastosRealizados = num(op.gastosRealizados) || num(op.gastoCompras) + num(op.gastosOrganizacion);
    const gastosPrevistos = num(op.gastosPrevistos) || gastosRealizados + num(op.pendiente);
    const saldoActual = Number.isFinite(Number(op.saldoActual)) ? num(op.saldoActual) : num(op.ingresoDinero) - gastosRealizados;
    const saldoOperativo = Number.isFinite(Number(op.saldoOperativo)) ? num(op.saldoOperativo) : presupuesto - gastosPrevistos;
    const donado = num(b.donacionProducto?.valorDonado);
    return {donado,presupuesto,gastosPrevistos,gastosRealizados,pendiente:num(op.pendiente),saldoActual,saldoOperativo,valoracion:gastosPrevistos + donado};
  }
  function ensureResumenHeadersV253(ws){
    if(!ws) return;
    const cols = Math.max(7, ws.columnCount || 7);
    if(!up(rowText(ws, 1, cols)).includes('EMITIDO POR')) ws.spliceRows(1, 0, []);
    ws.getRow(1).getCell(1).value = emittedByText(new Date());
    styleSoft(ws.getRow(1), cols);
    let summaryRow = 0;
    const scanTop = Math.min(ws.rowCount, 12);
    for(let r = 1; r <= scanTop; r++){
      if(up(rowText(ws, r, cols)).includes('RESUMEN DEL EVENTO')){ summaryRow = r; break; }
    }
    if(!summaryRow){ ws.spliceRows(2, 0, []); summaryRow = 2; }
    styleHeader(ws.getRow(summaryRow), 'RESUMEN DEL EVENTO', cols);
    let segmentRow = 0;
    for(let r = 1; r <= ws.rowCount; r++){
      const txt = up(rowText(ws, r, cols));
      if(txt.includes('POR SEGMENTO') && !txt.includes('GRAFICAS')){ segmentRow = r; break; }
    }
    if(segmentRow){
      const prev = Math.max(1, segmentRow - 1);
      if(up(rowText(ws, prev, cols)).includes('GRAFICAS')){
        styleHeader(ws.getRow(prev), 'GRAFICAS DEL CALCULOS POR AGRUPACION', cols);
      }else{
        ws.spliceRows(segmentRow, 0, []);
        styleHeader(ws.getRow(segmentRow), 'GRAFICAS DEL CALCULOS POR AGRUPACION', cols);
      }
    }
  }
  function cleanResumenSheetV253(workbook){
    if(!workbook || workbook.__ceV253ResumenPatched) return;
    const ws = workbook.getWorksheet && workbook.getWorksheet('RESUMEN');
    if(!ws) return;
    workbook.__ceV253ResumenPatched = true;
    ensureResumenHeadersV253(ws);
    const deleteLabels = new Set([
      'DONACION DE PRODUCTO','DONACIONES DE PRODUCTO','INGRESO TOTAL','GASTOS PREVISTOS','GASTOS REALIZADOS',
      'PTE. COMPRA U OTROS GASTOS','SALDO ACTUAL','SALDO OPERATIVO','VALORACION DEL EVENTO',
      'INGRESOS','GASTOS'
    ]);
    for(let r = ws.rowCount; r >= 1; r--){
      const label = up(cellText(ws.getRow(r).getCell(1).value));
      if(deleteLabels.has(label)) ws.spliceRows(r, 1);
    }
    let priceRow = 0;
    ws.eachRow((row, n) => {
      if(!priceRow && up(cellText(row.getCell(1).value)).includes('PRECIO EVENTO')) priceRow = n;
    });
    if(priceRow){
      const valueCol = [2,3,4,5].find(c => ws.getRow(priceRow).getCell(c).value !== null && ws.getRow(priceRow).getCell(c).value !== undefined) || 2;
      const op = operativeValues();
      const insert = [
        null,
        ['Donacion de producto', op.donado, 'white'],
        null,
        ['INGRESO TOTAL', op.presupuesto, 'white'],
        ['GASTOS PREVISTOS', op.gastosPrevistos, 'white'],
        ['GASTOS REALIZADOS', op.gastosRealizados, 'white'],
        ['PTE. COMPRA U OTROS GASTOS', op.pendiente, 'pending'],
        ['SALDO ACTUAL', op.saldoActual, op.saldoActual >= 0 ? 'ok' : 'bad'],
        ['SALDO OPERATIVO', op.saldoOperativo, op.saldoOperativo >= 0 ? 'ok' : 'bad'],
        ['VALORACION DEL EVENTO', op.valoracion, 'white']
      ];
      ws.spliceRows(priceRow + 1, 0, ...insert.map(item => {
        if(!item) return [];
        const row = [];
        row[1] = item[0];
        row[valueCol] = Number(item[1] || 0);
        return row;
      }));
      insert.forEach((item, i) => {
        if(!item) return;
        const row = ws.getRow(priceRow + 1 + i);
        for(let c = 1; c <= Math.max(valueCol, 3); c++) formatResumenCell(row.getCell(c), item[2]);
        row.getCell(1).font = {bold:true, color:{argb:item[2] === 'pending' ? 'FFBE123C' : 'FF111827'}};
        row.getCell(valueCol).numFmt = '#,##0.00 [$€-C0A]';
        row.getCell(valueCol).font = {bold:true, color:{argb:item[2] === 'pending' ? 'FFBE123C' : 'FF111827'}};
      });
    }
    ensureResumenHeadersV253(ws);
    for(let r = 1; r <= ws.rowCount; r++){
      for(let c = 6; c <= 30; c++) ws.getRow(r).getCell(c).value = null;
    }
  }
  function patchExcelWriteBufferV253(){
    try{
      if(!window.ExcelJS || !ExcelJS.Workbook) return false;
      const probe = new ExcelJS.Workbook();
      const proto = probe.xlsx && probe.xlsx.constructor && probe.xlsx.constructor.prototype;
      if(!proto || !proto.writeBuffer || proto.writeBuffer.__v253Wrapped) return true;
      const prev = proto.writeBuffer;
      proto.writeBuffer = async function(){
        if(this.workbook && this.workbook.__ceModularStandaloneClean){
          return await prev.apply(this, arguments);
        }
        try{
          if(this.workbook){
            this.workbook.__ceV251ResumenPatched = true;
            this.workbook.__ceV252ResumenPatched = true;
          }
          cleanResumenSheetV253(this.workbook);
        }catch(err){ console.warn('[v25.9] No se pudo reforzar RESUMEN', err); }
        return await prev.apply(this, arguments);
      };
      proto.writeBuffer.__v253Wrapped = true;
      return true;
    }catch(_){ return false; }
  }
  const previousExportExcelV253 = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel;
  if(previousExportExcelV253 && !previousExportExcelV253.__v253Wrapped){
    const wrappedExportExcelV253 = async function(){
      try{ if(typeof ensureExcelJS === 'function') await ensureExcelJS(); }catch(_){ }
      patchExcelWriteBufferV253();
      return await previousExportExcelV253.apply(this, arguments);
    };
    wrappedExportExcelV253.__v253Wrapped = true;
    try{ exportExcel = wrappedExportExcelV253; }catch(_){ }
    window.exportExcel = wrappedExportExcelV253;
  }
  function applyVersionV253(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{ window.__ceVersion = VERSION; }catch(_){ }
    try{
      window.emittedByTextV171 = function(date = new Date()){ return emittedByText(date); };
      emittedByTextV171 = window.emittedByTextV171;
    }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v253Wrapped){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__v253Wrapped = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }
  function applyV253(){
    applyVersionV253();
    applyDonationTipsV253();
    patchExcelWriteBufferV253();
  }
  ['pointerdown','mousedown','touchstart','focusin'].forEach(type => {
    document.addEventListener(type, ev => {
      if(ev.target?.closest?.('#budgetLayout .budget-panel.donantes,#eventChartWrap')) applyDonationTipsV253();
    }, true);
  });
  const oldRender = (typeof render === 'function') ? render : window.render;
  if(oldRender && !oldRender.__v253Wrapped){
    const wrapped = function(){
      const ret = oldRender.apply(this, arguments);
      [40, 160, 520, 1200, 2400].forEach(ms => setTimeout(applyV253, ms));
      return ret;
    };
    wrapped.__v253Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  ['renderBudget','renderGraficas','renderResumen'].forEach(name => {
    const old = (typeof window[name] === 'function') ? window[name] : null;
    if(!old || old.__v253Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      [30, 180, 700].forEach(ms => setTimeout(applyV253, ms));
      return ret;
    };
    wrapped.__v253Wrapped = true;
    try{ window[name] = wrapped; eval(name + ' = window[name]'); }catch(_){ window[name] = wrapped; }
  });
  applyV253();
  [120, 600, 1500, 3200].forEach(ms => setTimeout(applyV253, ms));
  window.__ceV253 = {version: VERSION, apply: applyV253, cleanResumenSheet: cleanResumenSheetV253, applyDonationTips: applyDonationTipsV253};
})();

;/* ===== END legacy-inline-58-v253-core.js ===== */


;/* ===== BEGIN legacy-inline-59-v253-final-clean.js ===== */

/* ControlEvent v45.1 - JS legacy extraido de public/index.html. Bloque inline #59. */
/* ==== v25.9 hotfix: RESUMEN Excel limpio y DONACION DE PRODUCTO separada ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.1';
  const VERSION_FILE = 'ControlEvent_v45_1';
  const CREAM = '#fff7e8';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(v); }catch(_){ }
    return num(v).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
  };
  function st(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function rows(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function currentEvent(){
    try{ return (typeof selectedEvent === 'function' ? selectedEvent() : null) || rows('eventos').find(e => String(e.id) === String(st().selectedEventId)) || {}; }
    catch(_){ return rows('eventos').find(e => String(e.id) === String(st().selectedEventId)) || {}; }
  }
  function currentEventId(){ const ev = currentEvent(); return String(ev?.id || st().selectedEventId || ''); }
  function byId(k,id){ return rows(k).find(x => String(x.id) === String(id)) || {}; }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id); }catch(_){ return byId('personas', id); } }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id); }catch(_){ return byId('productos', id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id); }catch(_){ return byId('tiendas', id); } }
  function compras(){
    try{ const r = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(r)) return r; }catch(_){ }
    const ev = currentEventId();
    return rows('compras').filter(c => String(c.eventId || '') === ev);
  }
  function ticket(c){ return norm(c?.ticketDonacion || c?.ticket || ''); }
  function units(c){ return num(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ const p = producto(c?.productoId); return num(c?.precio ?? c?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(c){
    try{ if(typeof valueCompraV171 === 'function') return num(valueCompraV171(c)); }catch(_){ }
    return num(c?.valor ?? c?.importe) || units(c) * price(c);
  }
  function productName(c){ return norm(c?.producto?.nombre || producto(c?.productoId).nombre || c?.productoNombre || 'Producto'); }
  function storeName(c){
    const p = producto(c?.productoId);
    const id = c?.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    return norm(c?.tienda?.nombre || tienda(id).nombre || '') || 'Sin tienda asignada';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const v = donorLabel(c.donorRef); if(norm(v)) return norm(v); } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return norm(persona(raw.slice(2)).nombre) || 'Sin donante';
    if(raw.startsWith('T:')) return norm(tienda(raw.slice(2)).nombre) || 'Sin donante';
    return raw || norm(c?.responsable?.nombre) || storeName(c) || 'Sin donante';
  }
  function clearTip(el){
    if(!el) return;
    ['title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip-v21','data-tip-bg-v21','data-ce-tip-layout-v21','data-ce-tip-lazy-v250'].forEach(a => el.removeAttribute(a));
  }
  function setTip(el, text, bg = CREAM, layout = 'budgetdonationv253final'){
    if(!el || !norm(text)) return;
    clearTip(el);
    el.setAttribute('data-ce-tip-v21', text);
    el.setAttribute('data-tip-bg-v21', bg);
    el.setAttribute('data-ce-tip-layout-v21', layout);
  }
  function setTipDeep(el, text, bg = CREAM, layout = 'budgetdonationv253final'){
    if(!el) return;
    [el, ...el.querySelectorAll('*')].forEach(node => setTip(node, text, bg, layout));
  }
  function donationRows(code){
    return compras().filter(c => ticket(c) === code).slice().sort((a,b) =>
      donorName(a).localeCompare(donorName(b),'es') || productName(a).localeCompare(productName(b),'es')
    );
  }
  function donationTip(title, code){
    const list = donationRows(code);
    const total = list.reduce((a,c) => a + value(c), 0);
    const lines = list.map(c => `Producto | ${donorName(c)} | ${productName(c)} | ${units(c).toLocaleString('es-ES',{maximumFractionDigits:2})} | ${money(price(c))} | ${money(value(c))}`);
    return `DONACION DE PRODUCTO / ${title}\nTOTAL ESTIMADO: ${money(total)}\n\nPRODUCTOS | Donante | Producto | Uds | Precio estimado | Valor estimado\n${lines.length ? lines.join('\n') : 'Sin registros'}`;
  }
  function donationTotalTip(){
    const groups = [
      ['TIENDAS','DONADO TIENDA'],
      ['SOCIOS','DONADO SOCIO'],
      ['NO SOCIOS','DONADO OTROS']
    ];
    const lines = groups.map(([title, code]) => `TOTAL | ${title} |  |  |  | ${money(donationRows(code).reduce((a,c) => a + value(c), 0))}`);
    const total = groups.reduce((a, item) => a + donationRows(item[1]).reduce((s,c) => s + value(c), 0), 0);
    return `DONACION DE PRODUCTO / TOTAL\nTOTAL ESTIMADO: ${money(total)}\n\nPRODUCTOS | Tipo | Producto | Uds | Precio estimado | Valor estimado\n${lines.join('\n')}`;
  }
  function applyDonationTipsFinal(){
    const panel = $('#budgetLayout')?.querySelector?.('.budget-panel.donantes');
    if(panel){
      panel.querySelectorAll('.budget-subrow').forEach(row => {
        const label = up(row.querySelector('span')?.textContent || row.textContent || '');
        let code = '', title = '';
        if(label.includes('TIENDA')){ code = 'DONADO TIENDA'; title = 'TIENDAS'; }
        else if(label.includes('NO SOCIO')){ code = 'DONADO OTROS'; title = 'NO SOCIOS'; }
        else if(label.includes('SOCIO')){ code = 'DONADO SOCIO'; title = 'SOCIOS'; }
        if(!code) return;
        row.dataset.v253DonationCode = code;
        setTipDeep(row, donationTip(title, code));
      });
      const totalRow = Array.from(panel.querySelectorAll('.budget-row')).find(row => up(row.textContent).includes('VALOR PRODUCTO DONADO'));
      if(totalRow) setTipDeep(totalRow, donationTotalTip());
    }
    const chartRows = $('#eventChartWrap')?.querySelectorAll?.('.chart-row') || [];
    const donationSegs = chartRows[1]?.querySelectorAll?.('.chart-seg') || [];
    [
      ['DONADO TIENDA','TIENDAS'],
      ['DONADO SOCIO','SOCIOS'],
      ['DONADO OTROS','NO SOCIOS']
    ].forEach(([code, title], idx) => {
      const seg = donationSegs[idx];
      if(seg) setTipDeep(seg, donationTip(title, code), getComputedStyle(seg).backgroundColor || CREAM, 'graphdonationv253final');
    });
  }
  function emittedByText(date = new Date()){
    const p = n => String(n).padStart(2,'0');
    return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
  }
  function operativeValues(){
    const b = (typeof budgetSummary === 'function') ? budgetSummary() : {};
    const op = b.operativa || {};
    let graph = {};
    try{ graph = typeof graphPartsV171 === 'function' ? graphPartsV171() : {}; }catch(_){ graph = {}; }
    const presupuesto = num(op.presupuesto ?? op.ingresos ?? b.ingresosDinero?.totalComprometido ?? graph.totalIncome ?? 0);
    const gastosRealizados = num(op.gastosRealizados) || num(op.gastoCompras) + num(op.gastosOrganizacion);
    const pendiente = num(op.pendiente);
    const gastosPrevistos = num(op.gastosPrevistos) || gastosRealizados + pendiente;
    const ingresoDinero = num(op.ingresoDinero ?? b.ingresosDinero?.totalIngresado ?? 0);
    const saldoActual = Number.isFinite(Number(op.saldoActual)) ? num(op.saldoActual) : ingresoDinero - gastosRealizados;
    const saldoOperativo = Number.isFinite(Number(op.saldoOperativo)) ? num(op.saldoOperativo) : presupuesto - gastosPrevistos;
    const donado = num(b.donacionProducto?.valorDonado ?? graph.totalDon ?? 0);
    return {donado,presupuesto,gastosPrevistos,gastosRealizados,pendiente,saldoActual,saldoOperativo,valoracion:gastosPrevistos + donado};
  }
  function clearWorksheet(ws){
    try{ Object.keys(ws._merges || {}).forEach(key => { try{ ws.unMergeCells(key); }catch(_){ } }); }catch(_){ }
    try{ ws._merges = {}; }catch(_){ }
    try{ ws._media = []; }catch(_){ }
    const rows = Math.max(ws.rowCount || 0, 1);
    try{ ws.spliceRows(1, rows); }catch(_){ }
  }
  function paintCell(cell, fill = 'FFFFFFFF', bold = false, color = 'FF111827'){
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fill}};
    cell.border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    cell.font = {bold:!!bold, color:{argb:color}};
    cell.alignment = {vertical:'middle', horizontal:'left', wrapText:false};
  }
  function paintRange(ws, r, c1, c2, fill = 'FFFFFFFF', bold = false, color = 'FF111827'){
    for(let c = c1; c <= c2; c++) paintCell(ws.getCell(r,c), fill, bold, color);
  }
  function writeLabelValue(ws, r, label, value, opts = {}){
    const fill = opts.fill || 'FFFFFFFF';
    const color = opts.color || 'FF111827';
    paintRange(ws, r, 1, 5, fill, !!opts.bold, color);
    ws.getCell(r,1).value = label;
    ws.getCell(r,1).font = {bold:true, color:{argb:color}};
    ws.getCell(r,2).value = opts.money ? Number(value || 0) : (value ?? '');
    if(opts.money) ws.getCell(r,2).numFmt = '#,##0.00 [$€-C0A]';
    ws.getCell(r,2).font = {bold:true, color:{argb:color}};
    ws.getCell(r,2).alignment = {vertical:'middle', horizontal:opts.money ? 'right' : 'left', wrapText:false};
  }
  function header(ws, r, text){
    ws.mergeCells(r,1,r,5);
    const cell = ws.getCell(r,1);
    cell.value = text;
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    cell.font = {bold:true, color:{argb:'FFFFFFFF'}, size:13};
    cell.alignment = {vertical:'middle', horizontal:'center', wrapText:false};
    ws.getRow(r).height = 24;
  }
  function addImage(workbook, ws, dataUrl, r, c, width, height){
    if(!dataUrl || !String(dataUrl).startsWith('data:image/')) return false;
    const ext = String(dataUrl).slice(5, 30).includes('png') ? 'png' : 'jpeg';
    const id = workbook.addImage({base64:dataUrl, extension:ext});
    ws.addImage(id, {tl:{col:c-1+0.05,row:r-1+0.05}, ext:{width,height}, editAs:'oneCell'});
    return true;
  }
  async function rebuildResumenSheet(workbook){
    if(!workbook || workbook.__ceV253FinalResumenPatched) return;
    workbook.__ceV253FinalResumenPatched = true;
    const ws = (workbook.getWorksheet && workbook.getWorksheet('RESUMEN')) || workbook.addWorksheet('RESUMEN');
    clearWorksheet(ws);
    ws.properties.defaultRowHeight = 21;
    ws.columns = [30,42,18,18,18,4,4].map(width => ({width}));
    const ev = currentEvent();
    const op = operativeValues();
    let r = 1;
    ws.mergeCells(r,1,r,5);
    ws.getCell(r,1).value = emittedByText(new Date());
    ws.getCell(r,1).font = {bold:true, color:{argb:'FF111827'}};
    ws.getCell(r,1).alignment = {vertical:'middle', horizontal:'left', wrapText:false};
    ws.getCell(r,1).fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFEFF6FF'}};
    ws.getRow(r++).height = 22;
    header(ws, r++, 'RESUMEN DEL EVENTO');
    ws.getRow(r++).height = 8;
    writeLabelValue(ws, r++, 'Titulo del evento', ev.titulo || '', {bold:true});
    const desc = norm(ev.descripcion || '');
    const descRows = Math.max(2, Math.min(6, Math.ceil(desc.length / 95) || 2));
    paintRange(ws, r, 1, 5, 'FFFFFFFF', false);
    ws.getCell(r,1).value = 'Descripcion del evento';
    ws.getCell(r,1).font = {bold:true, color:{argb:'FF111827'}};
    ws.mergeCells(r,2,r + descRows - 1,5);
    ws.getCell(r,2).value = desc;
    ws.getCell(r,2).fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FFF8FAFC'}};
    ws.getCell(r,2).alignment = {vertical:'top', horizontal:'left', wrapText:true};
    ws.getCell(r,2).border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    for(let rr = r; rr < r + descRows; rr++) ws.getRow(rr).height = 22;
    r += descRows + 1;
    writeLabelValue(ws, r++, 'Situacion del evento', ev.situacion || ev.estado || 'En curso');
    writeLabelValue(ws, r++, 'Fecha inicio', ev.fechaIni || '');
    writeLabelValue(ws, r++, 'Fecha fin', ev.fechaFin || '');
    writeLabelValue(ws, r++, 'Precio evento', num(ev.precio), {money:true});
    ws.getRow(r++).height = 8;
    writeLabelValue(ws, r++, 'Donacion de producto', op.donado, {money:true, bold:true});
    ws.getRow(r++).height = 8;
    writeLabelValue(ws, r++, 'INGRESO TOTAL', op.presupuesto, {money:true, bold:true});
    writeLabelValue(ws, r++, 'GASTOS PREVISTOS', op.gastosPrevistos, {money:true, bold:true});
    writeLabelValue(ws, r++, 'GASTOS REALIZADOS', op.gastosRealizados, {money:true, bold:true});
    writeLabelValue(ws, r++, 'PTE. COMPRA U OTROS GASTOS', op.pendiente, {money:true, bold:true, fill:'FFFFE4EC', color:'FFBE123C'});
    writeLabelValue(ws, r++, 'SALDO ACTUAL', op.saldoActual, {money:true, bold:true, fill:op.saldoActual >= 0 ? 'FFECFDF5' : 'FFFEF2F2', color:'FF111827'});
    writeLabelValue(ws, r++, 'SALDO OPERATIVO', op.saldoOperativo, {money:true, bold:true, fill:op.saldoOperativo >= 0 ? 'FFECFDF5' : 'FFFEF2F2', color:'FF111827'});
    writeLabelValue(ws, r++, 'VALORACION DEL EVENTO', op.valoracion, {money:true, bold:true});
    r += 2;
    header(ws, r++, 'GRAFICAS DEL CALCULOS POR AGRUPACION');
    ws.getRow(r++).height = 8;
    const imgWidth = 980;
    const imgHeight = 360;
    try{
      const seg = typeof makeGroupingChartImageV171 === 'function' ? await makeGroupingChartImageV171('segmento') : '';
      if(addImage(workbook, ws, seg, r, 1, imgWidth, imgHeight)){
        for(let rr = r; rr < r + 17; rr++) ws.getRow(rr).height = 20;
        r += 19;
      }else{
        writeLabelValue(ws, r++, 'Por segmento', 'Grafica no disponible', {bold:true});
      }
    }catch(_){ writeLabelValue(ws, r++, 'Por segmento', 'Grafica no disponible', {bold:true}); }
    try{
      const dest = typeof makeGroupingChartImageV171 === 'function' ? await makeGroupingChartImageV171('destino') : '';
      if(addImage(workbook, ws, dest, r, 1, imgWidth, imgHeight)){
        for(let rr = r; rr < r + 17; rr++) ws.getRow(rr).height = 20;
      }else{
        writeLabelValue(ws, r++, 'Por destino', 'Grafica no disponible', {bold:true});
      }
    }catch(_){ writeLabelValue(ws, r++, 'Por destino', 'Grafica no disponible', {bold:true}); }
    for(let rr = 1; rr <= Math.max(ws.rowCount, 70); rr++){
      for(let cc = 6; cc <= 30; cc++){
        const cell = ws.getRow(rr).getCell(cc);
        cell.value = null;
        cell.style = {};
      }
    }
  }
  function patchExcelWriteBufferFinal(){
    try{
      if(!window.ExcelJS || !ExcelJS.Workbook) return false;
      const probe = new ExcelJS.Workbook();
      const proto = probe.xlsx && probe.xlsx.constructor && probe.xlsx.constructor.prototype;
      if(!proto || !proto.writeBuffer || proto.writeBuffer.__v253FinalWrapped) return true;
      const prev = proto.writeBuffer;
      proto.writeBuffer = async function(){
        if(this.workbook && this.workbook.__ceModularStandaloneClean){
          return await prev.apply(this, arguments);
        }
        try{
          if(this.workbook){
            this.workbook.__ceV251ResumenPatched = true;
            this.workbook.__ceV252ResumenPatched = true;
            this.workbook.__ceV253ResumenPatched = true;
          }
          await rebuildResumenSheet(this.workbook);
        }catch(err){ console.warn('[v25.9] No se pudo reconstruir RESUMEN limpio', err); }
        return await prev.apply(this, arguments);
      };
      proto.writeBuffer.__v253FinalWrapped = true;
      return true;
    }catch(_){ return false; }
  }
  const previousExportExcel = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel;
  if(previousExportExcel && !previousExportExcel.__v253FinalWrapped){
    const wrappedExportExcel = async function(){
      try{ if(typeof ensureExcelJS === 'function') await ensureExcelJS(); }catch(_){ }
      patchExcelWriteBufferFinal();
      return await previousExportExcel.apply(this, arguments);
    };
    wrappedExportExcel.__v253FinalWrapped = true;
    try{ exportExcel = wrappedExportExcel; }catch(_){ }
    window.exportExcel = wrappedExportExcel;
  }
  function applyFinal(){
    applyDonationTipsFinal();
    patchExcelWriteBufferFinal();
  }
  ['pointerdown','mousedown','touchstart','mouseover','mousemove','focusin'].forEach(type => {
    document.addEventListener(type, ev => {
      if(ev.target?.closest?.('#budgetLayout .budget-panel.donantes,#eventChartWrap')) applyDonationTipsFinal();
    }, true);
  });
  const oldRender = (typeof render === 'function') ? render : window.render;
  if(oldRender && !oldRender.__v253FinalWrapped){
    const wrapped = function(){
      const ret = oldRender.apply(this, arguments);
      [20, 120, 420, 1000, 2200].forEach(ms => setTimeout(applyFinal, ms));
      return ret;
    };
    wrapped.__v253FinalWrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  applyFinal();
  [100, 600, 1500, 3200].forEach(ms => setTimeout(applyFinal, ms));
  setInterval(applyDonationTipsFinal, window.ControlEventLowResource?.interval?.(1800) || 1800);
  window.__ceV253Final = {apply: applyFinal, applyDonationTips: applyDonationTipsFinal, rebuildResumenSheet};
})();

;/* ===== END legacy-inline-59-v253-final-clean.js ===== */


;/* ===== BEGIN legacy-inline-60-v254-fixes.js ===== */

/* ControlEvent v45.1 - JS legacy extraido de public/index.html. Bloque inline #60. */
/* ==== v25.9: graficas con VALORACION y donacion de producto por categoria ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.1';
  const VERSION_FILE = 'ControlEvent_v45_1';
  const CREAM = '#fff7e8';
  const previousGraphPartsV254 = (typeof window.graphPartsV171 === 'function') ? window.graphPartsV171 : null;
  const previousGraphDataV254 = (typeof window.graphData === 'function') ? window.graphData : null;
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const sum = (arr, fn) => arr.reduce((a,x) => a + num(fn ? fn(x) : x), 0);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(v); }catch(_){ }
    return num(v).toLocaleString('es-ES', {style:'currency', currency:'EUR'});
  };
  function st(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function rows(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function currentEvent(){
    try{ return (typeof selectedEvent === 'function' ? selectedEvent() : null) || rows('eventos').find(e => String(e.id) === String(st().selectedEventId)) || {}; }
    catch(_){ return rows('eventos').find(e => String(e.id) === String(st().selectedEventId)) || {}; }
  }
  function currentEventId(){ const ev = currentEvent(); return String(ev?.id || st().selectedEventId || ''); }
  function byId(k,id){ return rows(k).find(x => String(x.id) === String(id)) || {}; }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id); }catch(_){ return byId('personas', id); } }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id); }catch(_){ return byId('productos', id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id); }catch(_){ return byId('tiendas', id); } }
  function compras(){
    try{ const r = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(r)) return r; }catch(_){ }
    const ev = currentEventId();
    return rows('compras').filter(c => String(c.eventId || '') === ev);
  }
  function ticket(c){ return norm(c?.ticketDonacion || c?.ticket || ''); }
  function isDonation(t){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(t)); }
  function isCurrent(t){ return up(t) === 'GASTOS CORRIENTES'; }
  function units(c){ return num(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ const p = producto(c?.productoId); return num(c?.precio ?? c?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(c){
    try{ if(typeof valueCompraV171 === 'function') return num(valueCompraV171(c)); }catch(_){ }
    return num(c?.valor ?? c?.importe) || units(c) * price(c);
  }
  function productName(c){ return norm(c?.producto?.nombre || producto(c?.productoId).nombre || c?.productoNombre || 'Producto'); }
  function storeName(c){
    const p = producto(c?.productoId);
    const id = c?.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    return norm(c?.tienda?.nombre || tienda(id).nombre || '') || 'Sin tienda asignada';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const v = donorLabel(c.donorRef); if(norm(v)) return norm(v); } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return norm(persona(raw.slice(2)).nombre) || 'Sin donante';
    if(raw.startsWith('T:')) return norm(tienda(raw.slice(2)).nombre) || 'Sin donante';
    return raw || norm(c?.responsable?.nombre) || storeName(c) || 'Sin donante';
  }
  function graphDataBase(){
    try{ if(previousGraphDataV254) return previousGraphDataV254() || {}; }catch(_){ }
    return {};
  }
  function graphPartsBase(){
    try{ if(previousGraphPartsV254) return previousGraphPartsV254() || {}; }catch(_){ }
    return {};
  }
  function operativeValuesV254(){
    const b = (typeof budgetSummary === 'function') ? (budgetSummary() || {}) : {};
    const op = b.operativa || {};
    const gd = graphDataBase();
    const presupuesto = num(op.presupuesto ?? op.ingresos ?? b.ingresosDinero?.totalComprometido ?? gd.incomes?.total ?? 0);
    const gastosRealizados = num(op.gastosRealizados) || num(op.gastoCompras) + num(op.gastosOrganizacion) || num(gd.expenses?.realizado);
    const pendiente = num(op.pendiente ?? gd.expenses?.pendiente);
    const gastosPrevistos = num(op.gastosPrevistos) || gastosRealizados + pendiente || num(gd.expenses?.total);
    const ingresoDinero = num(op.ingresoDinero ?? b.ingresosDinero?.totalIngresado ?? gd.incomes?.realizado);
    const saldoActual = Number.isFinite(Number(op.saldoActual)) ? num(op.saldoActual) : ingresoDinero - gastosRealizados;
    const saldoOperativo = Number.isFinite(Number(op.saldoOperativo)) ? num(op.saldoOperativo) : presupuesto - gastosPrevistos;
    const donado = num(b.donacionProducto?.valorDonado ?? gd.donations?.total ?? 0);
    const valoracion = num(op.valoracionEvento ?? op.valoracion) || gastosPrevistos + donado;
    return {presupuesto,gastosRealizados,pendiente,gastosPrevistos,ingresoDinero,saldoActual,saldoOperativo,donado,valoracion};
  }
  function donationRows(code){
    return compras().filter(c => up(ticket(c)) === up(code)).slice().sort((a,b) =>
      donorName(a).localeCompare(donorName(b),'es') || productName(a).localeCompare(productName(b),'es')
    );
  }
  function donationTip(title, code){
    const list = donationRows(code);
    const total = sum(list, value);
    const lines = list.map(c => `Producto | ${donorName(c)} | ${productName(c)} | ${units(c).toLocaleString('es-ES',{maximumFractionDigits:2})} | ${money(price(c))} | ${money(value(c))}`);
    return `DONACION DE PRODUCTO / ${title}\nTOTAL ESTIMADO: ${money(total)}\n\nPRODUCTOS | Donante | Producto | Uds | Precio estimado | Valor estimado\n${lines.length ? lines.join('\n') : 'Sin registros'}`;
  }
  function donationTotalTip(){
    const groups = [
      ['TIENDAS','DONADO TIENDA'],
      ['SOCIOS','DONADO SOCIO'],
      ['NO SOCIOS','DONADO OTROS']
    ];
    const lines = groups.map(([title, code]) => `TOTAL | ${title} |  |  |  | ${money(sum(donationRows(code), value))}`);
    return `DONACION DE PRODUCTO / TOTAL\nTOTAL ESTIMADO: ${money(groups.reduce((a, item) => a + sum(donationRows(item[1]), value), 0))}\n\nPRODUCTOS | Tipo | Producto | Uds | Precio estimado | Valor estimado\n${lines.join('\n')}`;
  }
  function clearTip(el){
    if(!el) return;
    ['title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952','data-ce-tip-v21','data-tip-bg-v21','data-ce-tip-layout-v21','data-ce-tip-lazy-v250'].forEach(a => el.removeAttribute(a));
  }
  function setTip(el, text, bg = CREAM, layout = 'budgetdonationv254'){
    if(!el || !norm(text)) return;
    clearTip(el);
    el.setAttribute('data-ce-tip-v21', text);
    el.setAttribute('data-tip-bg-v21', bg);
    el.setAttribute('data-ce-tip-layout-v21', layout);
  }
  function setTipDeep(el, text, bg = CREAM, layout = 'budgetdonationv254'){
    if(!el) return;
    [el, ...el.querySelectorAll('*')].forEach(node => setTip(node, text, bg, layout));
  }
  function makeIncomeItems(gd, base){
    const inc = gd.incomes || {};
    if(base.incomeItems && base.incomeItems.length) return base.incomeItems;
    return [
      {label:'Socios Banco', value:inc.socioBanco, color:'#2563eb'},
      {label:'Socios Bizum', value:inc.socioBizum, color:'#16a34a'},
      {label:'Socios Efectivo', value:inc.socioEfectivo, color:'#84cc16'},
      {label:'No socios Banco', value:inc.noSocioBanco, color:'#60a5fa'},
      {label:'No socios Bizum', value:inc.noSocioBizum, color:'#34d399'},
      {label:'No socios Efectivo', value:inc.noSocioEfectivo, color:'#bef264'},
      {label:'Pendiente de ingresar', value:inc.pendiente, color:'#f59e0b'}
    ];
  }
  function makeExpenseItems(gd, base){
    const ex = gd.expenses || {};
    if(base.expenseItems && base.expenseItems.length) return base.expenseItems;
    return [
      {label:'Gastado por ticket', value:ex.tk, color:'#dc2626'},
      {label:'Gastos corrientes', value:ex.corrientes, color:'#ef4444'},
      {label:'Pte. Compra u otros gastos', value:ex.pendiente, color:'#fb7185'}
    ];
  }
  function graphPartsV254(){
    const b = (typeof budgetSummary === 'function') ? (budgetSummary() || {}) : {};
    const d = b.donacionProducto || {};
    const op = operativeValuesV254();
    const gd = graphDataBase();
    const base = graphPartsBase();
    const incomeItems = makeIncomeItems(gd, base).map(it => Object.assign({}, it, {value:num(it.value), displayValue:num(it.displayValue ?? it.value)}));
    const expenseItems = makeExpenseItems(gd, base).map(it => Object.assign({}, it, {value:num(it.value), displayValue:num(it.displayValue ?? it.value)}));
    const donationItems = [
      {label:'Donado producto tiendas', value:num(d.donadoTienda ?? gd.donations?.tiendas), color:'#fcd34d', tip:donationTip('TIENDAS','DONADO TIENDA'), layout:'graphdonationv254'},
      {label:'Donado producto socios', value:num(d.donadoSocio ?? gd.donations?.socios), color:'#f59e0b', tip:donationTip('SOCIOS','DONADO SOCIO'), layout:'graphdonationv254'},
      {label:'Donado producto no socios', value:num(d.donadoOtros ?? gd.donations?.noSocios), color:'#b45309', tip:donationTip('NO SOCIOS','DONADO OTROS'), layout:'graphdonationv254'}
    ];
    const saldoActualItems = [{label:'Saldo actual', value:Math.abs(op.saldoActual), displayValue:op.saldoActual, color:op.saldoActual >= 0 ? '#0f766e' : '#b91c1c', lines:[`SALDO ACTUAL = ingresos realizados - gastos realizados`, `${money(op.saldoActual)} = ${money(op.ingresoDinero)} - ${money(op.gastosRealizados)}`]}];
    const saldoOperativoItems = [{label:'Saldo operativo', value:Math.abs(op.saldoOperativo), displayValue:op.saldoOperativo, color:op.saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[`SALDO OPERATIVO = ingreso total - gastos previstos`, `${money(op.saldoOperativo)} = ${money(op.presupuesto)} - ${money(op.gastosPrevistos)}`]}];
    const valoracionItems = [{label:'Gastos previstos + valor producto donado', value:Math.abs(op.valoracion), displayValue:op.valoracion, color:'#111827', lines:[`VALORACION DEL EVENTO = gastos previstos + valor producto donado`, `${money(op.valoracion)} = ${money(op.gastosPrevistos)} + ${money(op.donado)}`]}];
    const totalIncome = num(gd.incomes?.total ?? base.totalIncome ?? sum(incomeItems, x => x.value));
    const totalIncomeRaw = num(base.totalIncomeRaw ?? totalIncome);
    const totalDon = num(d.valorDonado ?? gd.donations?.total ?? sum(donationItems, x => x.value));
    const totalExp = num(gd.expenses?.total ?? base.totalExp ?? op.gastosPrevistos ?? sum(expenseItems, x => x.value));
    return {incomeItems, donationItems, expenseItems, saldoActualItems, saldoOperativoItems, valoracionItems, saldoItems:saldoOperativoItems, totalIncome, totalIncomeRaw, totalDon, totalExp, saldoActual:op.saldoActual, saldoOperativo:op.saldoOperativo, valoracionEvento:op.valoracion};
  }
  function legend(items){
    const html = items.filter(x => num(x.value) !== 0 || x.displayValue != null).map(x => `<span><span class="legend-dot" style="background:${esc(x.color)}"></span>${esc(x.label)}: ${esc(money(x.displayValue ?? x.value))}</span>`).join('');
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${html}</div>`;
  }
  function seg(item, maxVal){
    const amount = item.displayValue ?? item.value;
    const detail = item.tip || ((item.lines && item.lines.length) ? `${item.label}: ${money(amount)}\n${item.lines.join('\n')}` : `${item.label}: ${money(amount)}`);
    const w = Math.max(0, num(item.value)) / Math.max(1, maxVal) * 100;
    const layout = item.layout || 'default';
    return `<div class="chart-seg" data-ce-tip-v21="${esc(detail)}" data-tip-bg-v21="${esc(item.color || CREAM)}" data-ce-tip-layout-v21="${esc(layout)}" style="width:${w}%;background:${esc(item.color)};"></div>`;
  }
  function renderGraficasV254(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = graphPartsV254();
    const maxVal = Math.max(1, g.totalIncomeRaw || g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoActual), Math.abs(g.saldoOperativo), Math.abs(g.valoracionEvento));
    function row(key, label, total, items){
      return `<div class="chart-row" data-v254-row="${esc(key)}"><div class="chart-label">${esc(label)}: ${esc(money(total))}</div><div><div class="chart-track">${items.map(it => seg(it, maxVal)).join('')}</div>${legend(items)}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">
      ${row('ingresos','INGRESOS', g.totalIncome, g.incomeItems)}
      ${row('donacion','DONACION DE PRODUCTO', g.totalDon, g.donationItems)}
      ${row('gastos','GASTOS', g.totalExp, g.expenseItems)}
      ${row('saldo-actual','SALDO ACTUAL', g.saldoActual, g.saldoActualItems)}
      ${row('saldo-operativo','SALDO OPERATIVO', g.saldoOperativo, g.saldoOperativoItems)}
      ${row('valoracion','VALORACION DEL EVENTO', g.valoracionEvento, g.valoracionItems)}
    </div></div>`;
    setTimeout(applyDonationTipsV254, 20);
  }
  async function makeChartImageDataUrlV254(){
    const g = graphPartsV254();
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 930;
    const ctx = canvas.getContext('2d');
    const maxVal = Math.max(1, g.totalIncomeRaw || g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoActual), Math.abs(g.saldoOperativo), Math.abs(g.valoracionEvento));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 34px Arial';
    ctx.fillText('GRAFICAS DEL EVENTO', 42, 54);
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`${label}: ${money(total)}`, 42, y);
      const x = 620, w = 1060, h = 34;
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(x, y - 27, w, h);
      let cx = x;
      items.forEach(it => {
        const segW = Math.max(0, num(it.value)) / maxVal * w;
        if(segW > 0){
          ctx.fillStyle = it.color || '#111827';
          ctx.fillRect(cx, y - 27, segW, h);
          cx += segW;
        }
      });
      ctx.font = '16px Arial';
      let lx = x, ly = y + 34;
      items.filter(it => num(it.value) !== 0 || it.displayValue != null).forEach(it => {
        const txt = `${it.label}: ${money(it.displayValue ?? it.value)}`;
        const tw = ctx.measureText(txt).width;
        if(lx + tw + 42 > x + w){ lx = x; ly += 24; }
        ctx.fillStyle = it.color || '#111827';
        ctx.fillRect(lx, ly - 13, 13, 13);
        ctx.fillStyle = '#374151';
        ctx.fillText(txt, lx + 18, ly);
        lx += tw + 52;
      });
      return y + 135;
    }
    let y = 112;
    y = drawRow(y, 'INGRESOS', g.totalIncome, g.incomeItems);
    y = drawRow(y, 'DONACION DE PRODUCTO', g.totalDon, g.donationItems);
    y = drawRow(y, 'GASTOS', g.totalExp, g.expenseItems);
    y = drawRow(y, 'SALDO ACTUAL', g.saldoActual, g.saldoActualItems);
    y = drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, g.saldoOperativoItems);
    drawRow(y, 'VALORACION DEL EVENTO', g.valoracionEvento, g.valoracionItems);
    return canvas.toDataURL('image/png');
  }
  function applyDonationTipsV254(){
    const panel = $('#budgetLayout')?.querySelector?.('.budget-panel.donantes');
    if(panel){
      panel.querySelectorAll('.budget-subrow').forEach(row => {
        const label = up(row.querySelector('span')?.textContent || row.textContent || '');
        let code = '', title = '';
        if(label.includes('TIENDA')){ code = 'DONADO TIENDA'; title = 'TIENDAS'; }
        else if(label.includes('NO SOCIO')){ code = 'DONADO OTROS'; title = 'NO SOCIOS'; }
        else if(label.includes('SOCIO')){ code = 'DONADO SOCIO'; title = 'SOCIOS'; }
        if(!code) return;
        setTipDeep(row, donationTip(title, code), CREAM, 'budgetdonationv254');
      });
      const totalRow = Array.from(panel.querySelectorAll('.budget-row')).find(row => up(row.textContent).includes('VALOR PRODUCTO DONADO'));
      if(totalRow) setTipDeep(totalRow, donationTotalTip(), CREAM, 'budgetdonationv254');
    }
    const donationRow = $('#eventChartWrap')?.querySelector?.('.chart-row[data-v254-row="donacion"]') ||
      Array.from($('#eventChartWrap')?.querySelectorAll?.('.chart-row') || []).find(row => up(row.textContent).includes('DONACION'));
    const segs = donationRow?.querySelectorAll?.('.chart-seg') || [];
    [
      ['DONADO TIENDA','TIENDAS','#fcd34d'],
      ['DONADO SOCIO','SOCIOS','#f59e0b'],
      ['DONADO OTROS','NO SOCIOS','#b45309']
    ].forEach(([code, title, color], idx) => {
      const segEl = segs[idx];
      if(segEl) setTipDeep(segEl, donationTip(title, code), color, 'graphdonationv254');
    });
  }
  function clearWorksheet(ws){
    try{ Object.keys(ws._merges || {}).forEach(key => { try{ ws.unMergeCells(key); }catch(_){ } }); }catch(_){ }
    try{ ws._merges = {}; }catch(_){ }
    try{ ws._media = []; }catch(_){ }
    try{ ws.spliceRows(1, Math.max(ws.rowCount || 0, 1)); }catch(_){ }
  }
  function paintCell(cell, fill = 'FFFFFFFF', bold = false, color = 'FF111827'){
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fill}};
    cell.border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    cell.font = {bold:!!bold, color:{argb:color}};
    cell.alignment = {vertical:'middle', horizontal:'left', wrapText:false};
  }
  function paintRange(ws, r, c1, c2, fill = 'FFFFFFFF', bold = false, color = 'FF111827'){
    for(let c = c1; c <= c2; c++) paintCell(ws.getCell(r,c), fill, bold, color);
  }
  function addImage(workbook, ws, dataUrl, r, c, width, height){
    if(!dataUrl || !String(dataUrl).startsWith('data:image/')) return false;
    const ext = String(dataUrl).slice(5, 30).includes('png') ? 'png' : 'jpeg';
    const id = workbook.addImage({base64:dataUrl, extension:ext});
    ws.addImage(id, {tl:{col:c - 1 + 0.05, row:r - 1 + 0.05}, ext:{width,height}, editAs:'oneCell'});
    return true;
  }
  async function rebuildGraficasSheetV254(workbook){
    if(!workbook || workbook.__ceV254GraficasPatched) return;
    workbook.__ceV254GraficasPatched = true;
    const ws = (workbook.getWorksheet && workbook.getWorksheet('GRAFICAS')) || workbook.addWorksheet('GRAFICAS');
    clearWorksheet(ws);
    ws.properties.defaultRowHeight = 21;
    ws.columns = [28,28,28,28,28,28,28].map(width => ({width}));
    ws.mergeCells(1,1,1,7);
    const h = ws.getCell(1,1);
    h.value = 'GRAFICAS DEL EVENTO';
    h.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    h.font = {bold:true, color:{argb:'FFFFFFFF'}, size:15};
    h.alignment = {vertical:'middle', horizontal:'center'};
    ws.getRow(1).height = 26;
    const ev = currentEvent();
    paintRange(ws, 2, 1, 7, 'FFEFF6FF', false);
    ws.getCell(2,1).value = 'Evento';
    ws.getCell(2,1).font = {bold:true, color:{argb:'FF111827'}};
    ws.mergeCells(2,2,2,7);
    ws.getCell(2,2).value = ev.titulo || '';
    ws.getCell(2,2).alignment = {vertical:'middle', horizontal:'left', wrapText:false};
    const dataUrl = await makeChartImageDataUrlV254();
    if(addImage(workbook, ws, dataUrl, 4, 1, 1500, 775)){
      for(let r = 4; r <= 40; r++) ws.getRow(r).height = 21;
    }
    const op = operativeValuesV254();
    const r = 43;
    paintRange(ws, r, 1, 3, 'FFFFFFFF', true);
    ws.getCell(r,1).value = 'VALORACION DEL EVENTO';
    ws.getCell(r,2).value = op.valoracion;
    ws.getCell(r,2).numFmt = '#,##0.00 [$EUR]';
    ws.getCell(r,2).alignment = {vertical:'middle', horizontal:'right'};
  }
  function patchExcelWriteBufferV254(){
    try{
      if(!window.ExcelJS || !ExcelJS.Workbook) return false;
      const probe = new ExcelJS.Workbook();
      const proto = probe.xlsx && probe.xlsx.constructor && probe.xlsx.constructor.prototype;
      if(!proto || !proto.writeBuffer || proto.writeBuffer.__v254Wrapped) return true;
      const prev = proto.writeBuffer;
      proto.writeBuffer = async function(){
        if(this.workbook && this.workbook.__ceModularStandaloneClean){
          return await prev.apply(this, arguments);
        }
        try{ await rebuildGraficasSheetV254(this.workbook); }catch(err){ console.warn('[v25.9] No se pudo reconstruir GRAFICAS', err); }
        return await prev.apply(this, arguments);
      };
      proto.writeBuffer.__v254Wrapped = true;
      return true;
    }catch(_){ return false; }
  }
  const previousExportExcelV254 = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel;
  if(previousExportExcelV254 && !previousExportExcelV254.__v254Wrapped){
    const wrappedExportExcelV254 = async function(){
      try{ if(typeof ensureExcelJS === 'function') await ensureExcelJS(); }catch(_){ }
      patchExcelWriteBufferV254();
      return await previousExportExcelV254.apply(this, arguments);
    };
    wrappedExportExcelV254.__v254Wrapped = true;
    try{ exportExcel = wrappedExportExcelV254; }catch(_){ }
    window.exportExcel = wrappedExportExcelV254;
  }
  function emittedByText(date = new Date()){
    const p = n => String(n).padStart(2,'0');
    return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
  }
  function applyVersionV254(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{ window.__ceVersion = VERSION; }catch(_){ }
    try{ window.emittedByTextV171 = emittedByText; emittedByTextV171 = emittedByText; }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v254Wrapped){
        const oldClick = proto.click;
        const wrappedClick = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return oldClick.apply(this, arguments);
        };
        wrappedClick.__v254Wrapped = true;
        proto.click = wrappedClick;
      }
    }catch(_){ }
  }
  function installGraphOverridesV254(){
    if(window.__ceDisableLegacyBarGraficas) return;
    try{ window.graphPartsV171 = graphPartsV254; graphPartsV171 = graphPartsV254; }catch(_){ window.graphPartsV171 = graphPartsV254; }
    try{ window.graphPartsV164 = graphPartsV254; graphPartsV164 = graphPartsV254; }catch(_){ window.graphPartsV164 = graphPartsV254; }
    try{ window.renderGraficas = renderGraficasV254; renderGraficas = renderGraficasV254; }catch(_){ window.renderGraficas = renderGraficasV254; }
    try{ window.makeChartImageDataUrl = makeChartImageDataUrlV254; window.makeChartImageDataUrlV160 = makeChartImageDataUrlV254; window.makeChartImageDataUrlV164 = makeChartImageDataUrlV254; window.makeChartImageDataUrlV171 = makeChartImageDataUrlV254; makeChartImageDataUrl = makeChartImageDataUrlV254; makeChartImageDataUrlV160 = makeChartImageDataUrlV254; makeChartImageDataUrlV164 = makeChartImageDataUrlV254; makeChartImageDataUrlV171 = makeChartImageDataUrlV254; }catch(_){ window.makeChartImageDataUrl = makeChartImageDataUrlV254; }
    try{ window.graphDataV254 = graphPartsV254; }catch(_){ }
  }
  function applyV254(){
    applyVersionV254();
    installGraphOverridesV254();
    applyDonationTipsV254();
    patchExcelWriteBufferV254();
  }
  ['pointerdown','mousedown','touchstart','mouseover','mousemove','focusin'].forEach(type => {
    document.addEventListener(type, ev => {
      if(ev.target?.closest?.('#budgetLayout .budget-panel.donantes,#eventChartWrap')) applyDonationTipsV254();
    }, true);
  });
  const oldRender = (typeof render === 'function') ? render : window.render;
  if(oldRender && !oldRender.__v254Wrapped){
    const wrappedRender = function(){
      const ret = oldRender.apply(this, arguments);
      [20, 120, 420, 1000, 2200].forEach(ms => setTimeout(applyV254, ms));
      return ret;
    };
    wrappedRender.__v254Wrapped = true;
    try{ render = wrappedRender; }catch(_){ }
    window.render = wrappedRender;
  }
  ['renderBudget','renderResumen'].forEach(name => {
    const old = (typeof window[name] === 'function') ? window[name] : null;
    if(!old || old.__v254Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      [30, 180, 700].forEach(ms => setTimeout(applyV254, ms));
      return ret;
    };
    wrapped.__v254Wrapped = true;
    try{ window[name] = wrapped; eval(name + ' = window[name]'); }catch(_){ window[name] = wrapped; }
  });
  applyV254();
  [100, 600, 1500, 3200].forEach(ms => setTimeout(() => {
    applyV254();
    try{
      if(!window.__ceDisableLegacyBarGraficas && ((typeof currentMainTab !== 'undefined' && currentMainTab === 'graficas') || !$('tabGraficas')?.classList.contains('hidden'))) renderGraficasV254();
    }catch(_){ }
  }, ms));
  setInterval(applyDonationTipsV254, window.ControlEventLowResource?.interval?.(1800) || 1800);
  window.__ceV254 = {version: VERSION, apply: applyV254, graphParts: graphPartsV254, renderGraficas: renderGraficasV254, makeChartImageDataUrl: makeChartImageDataUrlV254, rebuildGraficasSheet: rebuildGraficasSheetV254, applyDonationTips: applyDonationTipsV254};
})();

;/* ===== END legacy-inline-60-v254-fixes.js ===== */


;/* ===== BEGIN legacy-inline-61-v255-fixes.js ===== */

/* ControlEvent v45.1 - JS legacy extraido de public/index.html. Bloque inline #61. */
/* ==== v25.9: cierre modal foto, RESUMEN/GRAFICAS Excel limpios y VALORACION en pantalla ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.1';
  const VERSION_FILE = 'ControlEvent_v45_1';
  const previousGraphPartsV255 = (window.__ceV254 && typeof window.__ceV254.graphParts === 'function')
    ? window.__ceV254.graphParts
    : ((typeof window.graphPartsV171 === 'function') ? window.graphPartsV171 : null);
  const previousMakeChartImageV255 = (window.__ceV254 && typeof window.__ceV254.makeChartImageDataUrl === 'function')
    ? window.__ceV254.makeChartImageDataUrl
    : ((typeof window.makeChartImageDataUrlV171 === 'function') ? window.makeChartImageDataUrlV171 : null);
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(v); }catch(_){ }
    return num(v).toLocaleString('es-ES', {style:'currency', currency:'EUR'});
  };
  function st(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function rows(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function currentEvent(){
    try{ return (typeof selectedEvent === 'function' ? selectedEvent() : null) || rows('eventos').find(e => String(e.id) === String(st().selectedEventId)) || {}; }
    catch(_){ return rows('eventos').find(e => String(e.id) === String(st().selectedEventId)) || {}; }
  }
  function operativeValuesV255(){
    const b = (typeof budgetSummary === 'function') ? (budgetSummary() || {}) : {};
    const op = b.operativa || {};
    const presupuesto = num(op.presupuesto ?? op.ingresos ?? b.ingresosDinero?.totalComprometido ?? 0);
    const gastosRealizados = num(op.gastosRealizados) || num(op.gastoCompras) + num(op.gastosOrganizacion);
    const pendiente = num(op.pendiente);
    const gastosPrevistos = num(op.gastosPrevistos) || gastosRealizados + pendiente;
    const ingresoDinero = num(op.ingresoDinero ?? b.ingresosDinero?.totalIngresado ?? 0);
    const saldoActual = Number.isFinite(Number(op.saldoActual)) ? num(op.saldoActual) : ingresoDinero - gastosRealizados;
    const saldoOperativo = Number.isFinite(Number(op.saldoOperativo)) ? num(op.saldoOperativo) : presupuesto - gastosPrevistos;
    const donado = num(b.donacionProducto?.valorDonado ?? 0);
    const valoracion = num(op.valoracionEvento ?? op.valoracion) || gastosPrevistos + donado;
    return {presupuesto,gastosRealizados,pendiente,gastosPrevistos,ingresoDinero,saldoActual,saldoOperativo,donado,valoracion};
  }
  function closePhotoModalsV255(){
    document.querySelectorAll('#ceTicketModalV234,#ceTicketImageModalV225,.ce-ticket-modal-v234,.ce-ticket-modal-v225').forEach(modal => {
      modal.classList.remove('visible','open','show');
      modal.setAttribute('aria-hidden','true');
      if(modal.style) modal.style.display = '';
    });
  }
  function preparePhotoModalV255(){
    document.querySelectorAll('.ce-ticket-modal-v234-close,.ce-ticket-modal-v225-close,#ceTicketModalV234 button,#ceTicketImageModalV225 button').forEach(btn => {
      const txt = (btn.textContent || '').trim();
      const isClose = btn.classList.contains('ce-ticket-modal-v234-close') || btn.classList.contains('ce-ticket-modal-v225-close') || txt === '×' || txt === 'x' || /cerrar/i.test(btn.getAttribute('title') || '');
      if(!isClose) return;
      btn.type = 'button';
      btn.textContent = '×';
      btn.title = 'Cerrar foto';
      btn.setAttribute('data-ce-photo-close-v255','1');
      btn.setAttribute('aria-label','Cerrar foto');
    });
  }
  function graphPartsV255(){
    let g = {};
    try{ g = previousGraphPartsV255 ? (previousGraphPartsV255() || {}) : {}; }catch(_){ g = {}; }
    const op = operativeValuesV255();
    if(!Array.isArray(g.saldoActualItems) || !g.saldoActualItems.length){
      g.saldoActualItems = [{label:'Saldo actual', value:Math.abs(op.saldoActual), displayValue:op.saldoActual, color:op.saldoActual >= 0 ? '#0f766e' : '#b91c1c'}];
    }
    if(!Array.isArray(g.saldoOperativoItems) || !g.saldoOperativoItems.length){
      g.saldoOperativoItems = g.saldoItems && g.saldoItems.length ? g.saldoItems : [{label:'Saldo operativo', value:Math.abs(op.saldoOperativo), displayValue:op.saldoOperativo, color:op.saldoOperativo >= 0 ? '#155e75' : '#7f1d1d'}];
    }
    g.valoracionEvento = num(g.valoracionEvento) || op.valoracion;
    g.valoracionItems = [{label:'Gastos previstos + valor producto donado', value:Math.abs(g.valoracionEvento), displayValue:g.valoracionEvento, color:'#111827', lines:[`VALORACION DEL EVENTO = gastos previstos + valor producto donado`, `${money(g.valoracionEvento)} = ${money(op.gastosPrevistos)} + ${money(op.donado)}`]}];
    g.totalIncome = num(g.totalIncome);
    g.totalIncomeRaw = num(g.totalIncomeRaw || g.totalIncome);
    g.totalDon = num(g.totalDon);
    g.totalExp = num(g.totalExp || op.gastosPrevistos);
    g.saldoActual = Number.isFinite(Number(g.saldoActual)) ? num(g.saldoActual) : op.saldoActual;
    g.saldoOperativo = Number.isFinite(Number(g.saldoOperativo)) ? num(g.saldoOperativo) : op.saldoOperativo;
    return g;
  }
  function legendV255(items){
    const html = (items || []).filter(x => num(x.value) !== 0 || x.displayValue != null).map(x => `<span><span class="legend-dot" style="background:${esc(x.color)}"></span>${esc(x.label)}: ${esc(money(x.displayValue ?? x.value))}</span>`).join('');
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${html}</div>`;
  }
  function segV255(item, maxVal){
    const amount = item.displayValue ?? item.value;
    const detail = item.tip || ((item.lines && item.lines.length) ? `${item.label}: ${money(amount)}\n${item.lines.join('\n')}` : `${item.label}: ${money(amount)}`);
    const w = Math.max(0, num(item.value)) / Math.max(1, maxVal) * 100;
    return `<div class="chart-seg" data-ce-tip-v21="${esc(detail)}" data-tip-bg-v21="${esc(item.color || '#fff')}" data-ce-tip-layout-v21="${esc(item.layout || 'default')}" style="width:${w}%;background:${esc(item.color || '#111827')};"></div>`;
  }
  function renderGraficasV255(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = graphPartsV255();
    const maxVal = Math.max(1, g.totalIncomeRaw || g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoActual), Math.abs(g.saldoOperativo), Math.abs(g.valoracionEvento));
    function row(key, label, total, items){
      return `<div class="chart-row" data-v255-row="${esc(key)}"><div class="chart-label">${esc(label)}: ${esc(money(total))}</div><div><div class="chart-track">${(items || []).map(it => segV255(it, maxVal)).join('')}</div>${legendV255(items || [])}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">
      ${row('ingresos','INGRESOS', g.totalIncome, g.incomeItems || [])}
      ${row('donacion','DONACION DE PRODUCTO', g.totalDon, g.donationItems || [])}
      ${row('gastos','GASTOS', g.totalExp, g.expenseItems || [])}
      ${row('saldo-actual','SALDO ACTUAL', g.saldoActual, g.saldoActualItems || [])}
      ${row('saldo-operativo','SALDO OPERATIVO', g.saldoOperativo, g.saldoOperativoItems || g.saldoItems || [])}
      ${row('valoracion','VALORACION DEL EVENTO', g.valoracionEvento, g.valoracionItems || [])}
    </div></div>`;
    try{ window.__ceV254?.applyDonationTips?.(); }catch(_){ }
  }
  async function makeChartImageDataUrlV255(){
    if(previousMakeChartImageV255){
      try{ return await previousMakeChartImageV255(); }catch(_){ }
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1800; canvas.height = 930;
    const ctx = canvas.getContext('2d');
    const g = graphPartsV255();
    const maxVal = Math.max(1, g.totalIncomeRaw || g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoActual), Math.abs(g.saldoOperativo), Math.abs(g.valoracionEvento));
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 34px Arial'; ctx.fillText('GRAFICAS DEL EVENTO', 42, 54);
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827'; ctx.font = 'bold 22px Arial'; ctx.fillText(`${label}: ${money(total)}`, 42, y);
      const x = 620, w = 1060, h = 34; ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, y - 27, w, h);
      let cx = x;
      (items || []).forEach(it => { const segW = Math.max(0, num(it.value)) / maxVal * w; if(segW > 0){ ctx.fillStyle = it.color || '#111827'; ctx.fillRect(cx, y - 27, segW, h); cx += segW; } });
      ctx.font = '16px Arial'; let lx = x, ly = y + 34;
      (items || []).filter(it => num(it.value) !== 0 || it.displayValue != null).forEach(it => {
        const txt = `${it.label}: ${money(it.displayValue ?? it.value)}`;
        const tw = ctx.measureText(txt).width;
        if(lx + tw + 42 > x + w){ lx = x; ly += 24; }
        ctx.fillStyle = it.color || '#111827'; ctx.fillRect(lx, ly - 13, 13, 13);
        ctx.fillStyle = '#374151'; ctx.fillText(txt, lx + 18, ly); lx += tw + 52;
      });
      return y + 135;
    }
    let y = 112;
    y = drawRow(y, 'INGRESOS', g.totalIncome, g.incomeItems);
    y = drawRow(y, 'DONACION DE PRODUCTO', g.totalDon, g.donationItems);
    y = drawRow(y, 'GASTOS', g.totalExp, g.expenseItems);
    y = drawRow(y, 'SALDO ACTUAL', g.saldoActual, g.saldoActualItems);
    y = drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, g.saldoOperativoItems || g.saldoItems);
    drawRow(y, 'VALORACION DEL EVENTO', g.valoracionEvento, g.valoracionItems);
    return canvas.toDataURL('image/png');
  }
  function cellText(value){
    if(value == null) return '';
    if(typeof value === 'object'){
      if(Array.isArray(value.richText)) return value.richText.map(x => x.text || '').join('');
      if(value.text) return String(value.text);
      if(value.result != null) return String(value.result);
    }
    return String(value);
  }
  function labelAt(row){
    return norm(cellText(row.getCell(1).value)).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  }
  function dedupeResumenV255(ws){
    if(!ws) return;
    const labels = new Set(['SALDO OPERATIVO','VALORACION DEL EVENTO']);
    const seen = new Set();
    for(let r = 1; r <= ws.rowCount; r++){
      const label = labelAt(ws.getRow(r));
      if(!labels.has(label)) continue;
      if(seen.has(label)){
        const row = ws.getRow(r);
        for(let c = 1; c <= 30; c++){
          const cell = row.getCell(c);
          cell.value = null;
          cell.style = {};
        }
        row.height = 8;
        continue;
      }
      seen.add(label);
    }
  }
  function styleResumenGraphHeaderV255(ws, r){
    if(!ws || !r) return;
    try{ ws.unMergeCells(r, 1, r, 5); }catch(_){ }
    try{ ws.mergeCells(r, 1, r, 5); }catch(_){ }
    const cell = ws.getCell(r, 1);
    cell.value = 'GRAFICAS DEL CALCULOS POR AGRUPACION';
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    cell.font = {bold:true, color:{argb:'FFFFFFFF'}, size:13};
    cell.alignment = {vertical:'middle', horizontal:'center', wrapText:false};
    ws.getRow(r).height = 24;
    for(let c = 6; c <= 30; c++){
      const extra = ws.getRow(r).getCell(c);
      extra.value = null;
      extra.style = {};
    }
  }
  function polishResumenV255(ws){
    if(!ws) return;
    dedupeResumenV255(ws);
    ws.columns = [30,42,18,18,18,4,4].map(width => ({width}));
    const graphRows = [];
    for(let r = 1; r <= ws.rowCount; r++){
      const label = labelAt(ws.getRow(r));
      if(label.includes('GRAFICAS DEL CALCULOS')) graphRows.push(r);
      for(let c = 6; c <= 30; c++){
        const cell = ws.getRow(r).getCell(c);
        cell.value = null;
        cell.style = {};
      }
    }
    graphRows.forEach((r, idx) => {
      if(idx === graphRows.length - 1) styleResumenGraphHeaderV255(ws, r);
      else{
        const row = ws.getRow(r);
        for(let c = 1; c <= 30; c++){
          const cell = row.getCell(c);
          cell.value = null;
          cell.style = {};
        }
        row.height = 8;
      }
    });
  }
  async function rebuildResumenSheetV255(workbook){
    if(!workbook) return;
    try{ delete workbook.__ceV253FinalResumenPatched; }catch(_){ }
    if(window.__ceV253Final && typeof window.__ceV253Final.rebuildResumenSheet === 'function'){
      await window.__ceV253Final.rebuildResumenSheet(workbook);
    }
    const ws = workbook.getWorksheet && workbook.getWorksheet('RESUMEN');
    polishResumenV255(ws);
    workbook.__ceV251ResumenPatched = true;
    workbook.__ceV252ResumenPatched = true;
    workbook.__ceV253ResumenPatched = true;
    workbook.__ceV253FinalResumenPatched = true;
  }
  function clearWorksheetV255(ws){
    try{ Object.keys(ws._merges || {}).forEach(key => { try{ ws.unMergeCells(key); }catch(_){ } }); }catch(_){ }
    try{ ws._merges = {}; }catch(_){ }
    try{ ws._media = []; }catch(_){ }
    try{ ws.spliceRows(1, Math.max(ws.rowCount || 0, 1)); }catch(_){ }
    for(let r = 1; r <= 80; r++){
      const row = ws.getRow(r);
      row.height = undefined;
      row.hidden = false;
    }
  }
  function paintCellV255(cell, fill = 'FFFFFFFF', bold = false, color = 'FF111827'){
    cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fill}};
    cell.border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    cell.font = {bold:!!bold, color:{argb:color}};
    cell.alignment = {vertical:'middle', horizontal:'left', wrapText:false};
  }
  function paintRangeV255(ws, r, c1, c2, fill = 'FFFFFFFF', bold = false, color = 'FF111827'){
    for(let c = c1; c <= c2; c++) paintCellV255(ws.getCell(r,c), fill, bold, color);
  }
  function addImageV255(workbook, ws, dataUrl, r, c, width, height){
    if(!dataUrl || !String(dataUrl).startsWith('data:image/')) return false;
    const ext = String(dataUrl).slice(5, 30).includes('png') ? 'png' : 'jpeg';
    const id = workbook.addImage({base64:dataUrl, extension:ext});
    ws.addImage(id, {tl:{col:c - 1 + 0.05, row:r - 1 + 0.05}, ext:{width,height}, editAs:'oneCell'});
    return true;
  }
  async function rebuildGraficasSheetV255(workbook){
    if(!workbook) return;
    const ws = (workbook.getWorksheet && workbook.getWorksheet('GRAFICAS')) || workbook.addWorksheet('GRAFICAS');
    clearWorksheetV255(ws);
    ws.properties.defaultRowHeight = 20;
    ws.columns = [28,28,28,28,28,28,28].map(width => ({width}));
    ws.mergeCells(1,1,1,7);
    const h = ws.getCell(1,1);
    h.value = 'GRAFICAS DEL EVENTO';
    h.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    h.font = {bold:true, color:{argb:'FFFFFFFF'}, size:15};
    h.alignment = {vertical:'middle', horizontal:'center'};
    ws.getRow(1).height = 26;
    paintRangeV255(ws, 2, 1, 7, 'FFEFF6FF', false);
    ws.getCell(2,1).value = 'Evento';
    ws.getCell(2,1).font = {bold:true, color:{argb:'FF111827'}};
    ws.mergeCells(2,2,2,7);
    ws.getCell(2,2).value = currentEvent().titulo || '';
    ws.getCell(2,2).alignment = {vertical:'middle', horizontal:'left', wrapText:false};
    const dataUrl = await makeChartImageDataUrlV255();
    addImageV255(workbook, ws, dataUrl, 3, 1, 1500, 775);
    for(let r = 3; r <= 40; r++) ws.getRow(r).height = 20;
    for(let r = 41; r <= 80; r++){
      const row = ws.getRow(r);
      row.height = 18;
      for(let c = 1; c <= 7; c++){
        const cell = row.getCell(c);
        cell.value = null;
        cell.style = {};
      }
    }
    workbook.__ceV254GraficasPatched = true;
    workbook.__ceV255GraficasPatched = true;
  }
  function patchExcelWriteBufferV255(){
    try{
      if(!window.ExcelJS || !ExcelJS.Workbook) return false;
      const probe = new ExcelJS.Workbook();
      const proto = probe.xlsx && probe.xlsx.constructor && probe.xlsx.constructor.prototype;
      if(!proto || !proto.writeBuffer || proto.writeBuffer.__v255Wrapped) return true;
      const prev = proto.writeBuffer;
      proto.writeBuffer = async function(){
        if(this.workbook && this.workbook.__ceModularStandaloneClean){
          return await prev.apply(this, arguments);
        }
        try{
          if(this.workbook){
            await rebuildResumenSheetV255(this.workbook);
            await rebuildGraficasSheetV255(this.workbook);
            this.workbook.__ceV254GraficasPatched = true;
          }
        }catch(err){ console.warn('[v25.9] No se pudo limpiar Excel final', err); }
        return await prev.apply(this, arguments);
      };
      proto.writeBuffer.__v255Wrapped = true;
      return true;
    }catch(_){ return false; }
  }
  const previousExportExcelV255 = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel;
  if(previousExportExcelV255 && !previousExportExcelV255.__v255Wrapped){
    const wrappedExportExcelV255 = async function(){
      try{ if(typeof ensureExcelJS === 'function') await ensureExcelJS(); }catch(_){ }
      patchExcelWriteBufferV255();
      return await previousExportExcelV255.apply(this, arguments);
    };
    wrappedExportExcelV255.__v255Wrapped = true;
    try{ exportExcel = wrappedExportExcelV255; }catch(_){ }
    window.exportExcel = wrappedExportExcelV255;
  }
  function emittedByTextV255(date = new Date()){
    const p = n => String(n).padStart(2,'0');
    return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
  }
  function installGraphV255(){
    if(window.__ceDisableLegacyBarGraficas) return;
    try{ window.graphPartsV171 = graphPartsV255; graphPartsV171 = graphPartsV255; }catch(_){ window.graphPartsV171 = graphPartsV255; }
    try{ window.graphPartsV164 = graphPartsV255; graphPartsV164 = graphPartsV255; }catch(_){ window.graphPartsV164 = graphPartsV255; }
    try{ window.renderGraficas = renderGraficasV255; renderGraficas = renderGraficasV255; }catch(_){ window.renderGraficas = renderGraficasV255; }
    try{ window.makeChartImageDataUrl = makeChartImageDataUrlV255; window.makeChartImageDataUrlV160 = makeChartImageDataUrlV255; window.makeChartImageDataUrlV164 = makeChartImageDataUrlV255; window.makeChartImageDataUrlV171 = makeChartImageDataUrlV255; makeChartImageDataUrl = makeChartImageDataUrlV255; makeChartImageDataUrlV160 = makeChartImageDataUrlV255; makeChartImageDataUrlV164 = makeChartImageDataUrlV255; makeChartImageDataUrlV171 = makeChartImageDataUrlV255; }catch(_){ window.makeChartImageDataUrl = makeChartImageDataUrlV255; }
  }
  function applyVersionV255(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{ window.__ceVersion = VERSION; }catch(_){ }
    try{ window.emittedByTextV171 = emittedByTextV255; emittedByTextV171 = emittedByTextV255; }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v255Wrapped){
        const oldClick = proto.click;
        const wrappedClick = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return oldClick.apply(this, arguments);
        };
        wrappedClick.__v255Wrapped = true;
        proto.click = wrappedClick;
      }
    }catch(_){ }
  }
  function isGraficasVisibleV255(){
    try{ return (typeof currentMainTab !== 'undefined' && currentMainTab === 'graficas') || !$('tabGraficas')?.classList.contains('hidden'); }catch(_){ return false; }
  }
  function applyV255(){
    applyVersionV255();
    preparePhotoModalV255();
    installGraphV255();
    patchExcelWriteBufferV255();
    if(!window.__ceDisableLegacyBarGraficas && isGraficasVisibleV255()) renderGraficasV255();
  }
  ['pointerdown','touchstart','click'].forEach(type => {
    document.addEventListener(type, ev => {
      const close = ev.target?.closest?.('[data-ce-photo-close-v255],.ce-ticket-modal-v234-close,.ce-ticket-modal-v225-close');
      const modal = ev.target?.closest?.('#ceTicketModalV234,#ceTicketImageModalV225,.ce-ticket-modal-v234,.ce-ticket-modal-v225');
      if(close || (modal && ev.target === modal)){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        closePhotoModalsV255();
        return false;
      }
    }, true);
  });
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closePhotoModalsV255(); }, true);
  document.addEventListener('click', ev => {
    const tab = ev.target?.closest?.('#tabGraficasBtn,.mobile-menu-action[data-target="tabGraficasBtn"]');
    if(tab) [60,160,420].forEach(ms => setTimeout(() => { if(!window.__ceDisableLegacyBarGraficas){ installGraphV255(); renderGraficasV255(); } }, ms));
  }, true);
  const oldRender = (typeof render === 'function') ? render : window.render;
  if(oldRender && !oldRender.__v255Wrapped){
    const wrappedRender = function(){
      const ret = oldRender.apply(this, arguments);
      [20,80,180,520,1200].forEach(ms => setTimeout(applyV255, ms));
      return ret;
    };
    wrappedRender.__v255Wrapped = true;
    try{ render = wrappedRender; }catch(_){ }
    window.render = wrappedRender;
  }
  applyV255();
  [100,600,1500,3200].forEach(ms => setTimeout(applyV255, ms));
  setInterval(() => {
    preparePhotoModalV255();
    installGraphV255();
    if(isGraficasVisibleV255()){
      const hasValoracion = !!document.querySelector('#eventChartWrap .chart-row[data-v255-row="valoracion"],#eventChartWrap .chart-row[data-v254-row="valoracion"]');
      if(!window.__ceDisableLegacyBarGraficas && !hasValoracion) renderGraficasV255();
    }
  }, window.ControlEventLowResource?.interval?.(1200) || 1200);
  window.__ceV255 = {version:VERSION, apply:applyV255, closePhotoModals:closePhotoModalsV255, graphParts:graphPartsV255, renderGraficas:renderGraficasV255, rebuildResumenSheet:rebuildResumenSheetV255, rebuildGraficasSheet:rebuildGraficasSheetV255};
})();

;/* ===== END legacy-inline-61-v255-fixes.js ===== */


;/* ===== BEGIN legacy-inline-62-v257-fixes.js ===== */

/* ControlEvent v45.1 - JS legacy extraido de public/index.html. Bloque inline #62. */
/* ==== v25.9: exportadores Excel aislados y precio referencia editable ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.1';
  const VERSION_FILE = 'ControlEvent_v45_1';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(v); }catch(_){ }
    return num(v).toLocaleString('es-ES', {style:'currency', currency:'EUR'});
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function st(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function rows(k){ const s = st(); return Array.isArray(s[k]) ? s[k] : []; }
  function role(){ try{ return up((typeof authUser !== 'undefined' && authUser && authUser.nivel) || window.authUser?.nivel || ''); }catch(_){ return ''; } }
  const isGD = () => role() === 'GD';
  function byId(k,id){ return rows(k).find(x => String(x.id) === String(id)) || {}; }
  function currentEvent(){
    try{ return (typeof selectedEvent === 'function' ? selectedEvent() : null) || rows('eventos').find(e => String(e.id) === String(st().selectedEventId)) || {}; }
    catch(_){ return rows('eventos').find(e => String(e.id) === String(st().selectedEventId)) || {}; }
  }
  function currentEventId(){ const ev = currentEvent(); return String(ev?.id || st().selectedEventId || ''); }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id); }catch(_){ return byId('personas', id); } }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id); }catch(_){ return byId('productos', id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id); }catch(_){ return byId('tiendas', id); } }
  function personName(id){ return norm(persona(id).nombre) || norm(id); }
  function productName(c){ const p = c?.producto || producto(c?.productoId); return norm(p.nombre || c?.productoNombre || 'Producto'); }
  function storeName(c){
    const p = c?.producto || producto(c?.productoId);
    const id = c?.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    return norm(c?.tienda?.nombre || tienda(id).nombre || '') || 'Sin tienda asignada';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const v = donorLabel(c.donorRef); if(norm(v)) return norm(v); } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personName(raw.slice(2)) || 'Sin donante';
    if(raw.startsWith('T:')) return norm(tienda(raw.slice(2)).nombre) || 'Sin donante';
    return raw || personName(c?.responsableId) || storeName(c) || 'Sin donante';
  }
  function ticket(c){ return norm(c?.ticketDonacion || c?.ticket || ''); }
  function isDonation(t){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(t)); }
  function isCurrent(t){ return up(t) === 'GASTOS CORRIENTES'; }
  function units(c){ return num(c?.unidades ?? c?.uds ?? 0); }
  function price(c){ const p = c?.producto || producto(c?.productoId); return num(c?.precio ?? c?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(c){ return num(c?.valor ?? c?.importe) || units(c) * price(c); }
  function compras(){
    let out = [];
    try{ if(typeof comprasForEvent === 'function') out = comprasForEvent() || []; }catch(_){ out = []; }
    if(!Array.isArray(out) || !out.length){
      const ev = currentEventId();
      out = rows('compras').filter(c => String(c.eventId || '') === ev);
    }
    return out.map(c => {
      const p = c.producto || producto(c.productoId);
      const t = c.tienda || tienda(c.tiendaId || p.tiendaId || p.defaultTiendaId || '');
      const r = c.responsable || persona(c.responsableId);
      return Object.assign({}, c, {producto:p, tienda:t, responsable:r, precio:price(Object.assign({}, c, {producto:p})), valor:value(Object.assign({}, c, {producto:p}))});
    });
  }
  function collabs(){
    let out = [];
    try{ if(typeof collabsForEvent === 'function') out = collabsForEvent() || []; }catch(_){ out = []; }
    if(!Array.isArray(out) || !out.length){
      const ev = currentEventId();
      out = rows('colaboradores').filter(c => String(c.eventId || '') === ev);
    }
    const ev = currentEvent();
    return out.map(c => {
      const p = c.persona || persona(c.personaId);
      const numero = num(c.numero ?? c.num ?? 0);
      const base = num(c.base ?? c.importeObligatorio ?? (up(p.rango) === 'SOCIO' ? numero * num(ev.precio) : 0));
      const donation = num(c.donation ?? c.importe ?? c.importeVoluntario ?? c.voluntario ?? 0);
      const total = num(c.total) || base + donation;
      return Object.assign({}, c, {persona:p, numero, base, donation, total, situacion:c.situacion || c.ingreso || c.tipoIngreso || ''});
    });
  }
  function budget(){
    try{ if(typeof budgetSummary === 'function') return budgetSummary() || {}; }catch(_){ }
    return {};
  }
  function opValues(){
    const b = budget();
    const op = b.operativa || {};
    const donation = num(b.donacionProducto?.valorDonado ?? sum(compras().filter(c => isDonation(ticket(c))).map(value)));
    const hasOpValue = v => v !== undefined && v !== null && String(v).trim() !== '';
    const gastosRealizados = hasOpValue(op.gastosRealizados) ? num(op.gastosRealizados)
      : ((hasOpValue(op.gastoCompras) || hasOpValue(op.gastosOrganizacion)) ? num(op.gastoCompras) + num(op.gastosOrganizacion)
        : sum(compras().filter(c => !isDonation(ticket(c)) && ticket(c)).map(value)));
    const pendiente = hasOpValue(op.pendiente) ? num(op.pendiente)
      : sum(compras().filter(c => !isDonation(ticket(c)) && !ticket(c)).map(value));
    const gastosPrevistos = num(op.gastosPrevistos) || gastosRealizados + pendiente;
    const presupuesto = num(op.presupuesto ?? op.ingresos ?? b.ingresosDinero?.totalComprometido ?? sum(collabs().map(c => c.total)));
    const ingresoDinero = num(op.ingresoDinero ?? b.ingresosDinero?.totalIngresado ?? sum(collabs().filter(c => up(c.situacion) !== 'PENDIENTE').map(c => c.total)));
    const saldoActual = Number.isFinite(Number(op.saldoActual)) ? num(op.saldoActual) : ingresoDinero - gastosRealizados;
    const saldoOperativo = Number.isFinite(Number(op.saldoOperativo)) ? num(op.saldoOperativo) : presupuesto - gastosPrevistos;
    return {donation,presupuesto,gastosRealizados,pendiente,gastosPrevistos,ingresoDinero,saldoActual,saldoOperativo,valoracion:gastosPrevistos + donation};
  }
  function sum(arr){ return (arr || []).reduce((a,x) => a + num(x), 0); }
  function grouping(kind){
    try{
      if(kind === 'segmento' && typeof summaryBySegmento === 'function') return summaryBySegmento() || [];
      if(kind === 'destino' && typeof summaryByDestino === 'function') return summaryByDestino() || [];
    }catch(_){ }
    const field = kind === 'segmento' ? 'segmento' : 'destino';
    const map = new Map();
    compras().forEach(c => {
      const p = c.producto || producto(c.productoId);
      const label = norm(p[field] || c.producto?.[field] || `Sin ${field}`) || `Sin ${field}`;
      if(!map.has(label)) map.set(label, {label, comprado:0, donado:0, pendiente:0, total:0});
      const row = map.get(label), v = value(c), tk = ticket(c);
      if(isDonation(tk)) row.donado += v;
      else if(!tk) row.pendiente += v;
      else row.comprado += v;
      row.total += v;
    });
    return Array.from(map.values()).sort((a,b) => a.label.localeCompare(b.label,'es'));
  }
  function tiendaTicketRows(){
    let out = [];
    try{ if(typeof summaryByTiendaTicket === 'function') out = summaryByTiendaTicket() || []; }catch(_){ out = []; }
    if(Array.isArray(out) && out.length) return out;
    const map = new Map();
    compras().filter(c => !isDonation(ticket(c))).forEach(c => {
      const tk = ticket(c) || 'Pte. Compra u otros gastos';
      const label = `${storeName(c)} | ${tk}`;
      if(!map.has(label)) map.set(label, {k:label, label, v:0, pending:!ticket(c), donated:false, rawTicket:tk});
      map.get(label).v += value(c);
    });
    return Array.from(map.values()).sort((a,b) => norm(a.label || a.k).localeCompare(norm(b.label || b.k),'es'));
  }
  function imageKey(candidate){
    const id = currentEventId();
    try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(candidate, id); }catch(_){ }
    return `${id}|${candidate}`;
  }
  function imageForRow(row){
    if(row?.image) return row.image;
    const imgs = st().ticketImages || {};
    const ev = currentEventId();
    const candidates = [];
    const add = v => { v = norm(v).split('·')[0].trim(); if(v && !candidates.includes(v)) candidates.push(v); };
    [row?.k,row?.label,row?.key,row?.rawTicket,row?.concepto].forEach(add);
    const src = norm(row?.k || row?.label || '');
    const parts = src.split('|').map(x => norm(x)).filter(Boolean);
    if(parts.length >= 2){
      add(`${parts[0]} | ${parts[1]}`); add(`${parts[0]}|${parts[1]}`);
      add(`${parts[1]} | ${parts[0]}`); add(`${parts[1]}|${parts[0]}`); add(parts[1]);
    }
    for(const c of candidates){
      for(const k of [c, imageKey(c), `${ev}|${c}`]){
        if(imgs[k]) return imgs[k];
      }
    }
    const needleA = up(parts[0] || '');
    const needleB = up(parts[1] || row?.rawTicket || '');
    for(const [k,v] of Object.entries(imgs)){
      const ks = String(k);
      if(ev && !ks.startsWith(`${ev}|`)) continue;
      const rest = up(ks.slice(ev ? ev.length + 1 : 0));
      if((!needleA || rest.includes(needleA)) && (!needleB || rest.includes(needleB))) return v;
    }
    return '';
  }
  async function compactInfoEventoImageDataUrl(dataUrl){
    const val = norm(dataUrl);
    if(!/^data:image\//i.test(val)) return val;
    return await new Promise(resolve => {
      try{
        const img = new Image();
        img.onload = () => {
          try{
            const w = img.naturalWidth || img.width || 0;
            const h = img.naturalHeight || img.height || 0;
            if(!w || !h) return resolve(val);
            const maxSide = 1200;
            const maxPixels = 1200 * 900;
            const ratio = Math.min(1, maxSide / Math.max(w, h), Math.sqrt(maxPixels / Math.max(1, w * h)));
            if(ratio >= 0.98 && val.length < 900000) return resolve(val);
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(w * ratio));
            canvas.height = Math.max(1, Math.round(h * ratio));
            const ctx = canvas.getContext('2d');
            if(!ctx) return resolve(val);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.78));
          }catch(_){ resolve(val); }
        };
        img.onerror = () => resolve(val);
        img.src = val;
      }catch(_){ resolve(val); }
    });
  }

  async function sourceToData(src){
    const val = norm(src);
    if(!val) return '';
    if(/^data:image\//i.test(val)) return await compactInfoEventoImageDataUrl(val);
    try{ if(typeof sourceToDataUrl === 'function') return await sourceToDataUrl(val); }catch(_){ }
    try{
      const res = await fetch(val, {cache:'no-store'});
      if(!res.ok) return '';
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => { const out = String(reader.result || ''); compactInfoEventoImageDataUrl(out).then(resolve).catch(() => resolve(out)); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }catch(_){ return ''; }
  }
  let cleanExcelPromise = null;
  async function cleanExcelJS(){
    if(cleanExcelPromise) return cleanExcelPromise;
    cleanExcelPromise = (async () => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;border:0;';
      iframe.setAttribute('aria-hidden','true');
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument;
      doc.open();
      doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
      doc.close();
      const urls = ['/vendor/exceljs.min.js', 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'];
      let code = '';
      for(const url of urls){
        try{
          const res = await fetch(url, {cache:'no-store'});
          if(res.ok){ code = await res.text(); break; }
        }catch(_){ }
      }
      if(!code) throw new Error('No se pudo cargar ExcelJS limpio');
      iframe.contentWindow.eval(code);
      if(!iframe.contentWindow.ExcelJS) throw new Error('ExcelJS limpio no disponible');
      return iframe.contentWindow.ExcelJS;
    })();
    return cleanExcelPromise;
  }
  function cleanFilePart(v){
    return norm(v || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
  }
  function stamp(date = new Date()){
    const p = n => String(n).padStart(2,'0');
    return {dd:p(date.getDate()), mm:p(date.getMonth()+1), yyyy:date.getFullYear(), hh:p(date.getHours()), mi:p(date.getMinutes()), ss:p(date.getSeconds())};
  }
  function emitted(date = new Date()){
    const t = stamp(date);
    return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${t.dd}${t.mm}${t.yyyy}_${t.hh}:${t.mi}:${t.ss}"`;
  }
  function infoFileName(ev){
    const t = stamp();
    return `${VERSION_FILE}_INFOEVENTO-${cleanFilePart(ev?.titulo || 'evento')}_${t.yyyy}${t.mm}${t.dd}.xlsx`;
  }
  function backupFileName(scope = 'TODOS', eventTitle = 'TODOS'){
    const t = stamp();
    const name = scope === 'TODOS' ? 'TODOS' : cleanFilePart(eventTitle || 'EVENTO');
    return `${VERSION_FILE}_BACKUP_${name}_${t.yyyy}${t.mm}${t.dd}-${t.hh}_${t.mi}_${t.ss}.xlsx`;
  }
  function makeEventChart(){
    const canvas = document.createElement('canvas');
    canvas.width = 1800; canvas.height = 930;
    const ctx = canvas.getContext('2d');
    const op = opValues();
    const cs = collabs();
    const buys = compras();
    const incomeItems = [
      {label:'Banco', value:sum(cs.filter(c => up(c.situacion) === 'BANCO').map(c => c.total)), color:'#2563eb'},
      {label:'Bizum', value:sum(cs.filter(c => up(c.situacion) === 'BIZUM').map(c => c.total)), color:'#16a34a'},
      {label:'Efectivo', value:sum(cs.filter(c => up(c.situacion) === 'EFECTIVO').map(c => c.total)), color:'#84cc16'},
      {label:'Pendiente', value:sum(cs.filter(c => up(c.situacion) === 'PENDIENTE').map(c => c.total)), color:'#f59e0b'}
    ];
    const donationItems = [
      {label:'Donado tiendas', value:sum(buys.filter(c => up(ticket(c)) === 'DONADO TIENDA').map(value)), color:'#fcd34d'},
      {label:'Donado socios', value:sum(buys.filter(c => up(ticket(c)) === 'DONADO SOCIO').map(value)), color:'#f59e0b'},
      {label:'Donado no socios', value:sum(buys.filter(c => up(ticket(c)) === 'DONADO OTROS').map(value)), color:'#b45309'}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(buys.filter(c => !isDonation(ticket(c)) && ticket(c) && !isCurrent(ticket(c))).map(value)), color:'#dc2626'},
      {label:'Gastos corrientes', value:sum(buys.filter(c => isCurrent(ticket(c))).map(value)), color:'#ef4444'},
      {label:'Pendiente de compra', value:sum(buys.filter(c => !isDonation(ticket(c)) && !ticket(c)).map(value)), color:'#fb7185'}
    ];
    const rows = [
      ['INGRESOS', op.presupuesto || sum(incomeItems.map(x => x.value)), incomeItems],
      ['DONACION DE PRODUCTO', op.donation, donationItems],
      ['GASTOS', op.gastosPrevistos, expenseItems],
      ['SALDO ACTUAL', op.saldoActual, [{label:'Saldo actual', value:Math.abs(op.saldoActual), displayValue:op.saldoActual, color:op.saldoActual >= 0 ? '#0f766e' : '#b91c1c'}]],
      ['SALDO OPERATIVO', op.saldoOperativo, [{label:'Saldo operativo', value:Math.abs(op.saldoOperativo), displayValue:op.saldoOperativo, color:op.saldoOperativo >= 0 ? '#155e75' : '#7f1d1d'}]],
      ['VALORACION DEL EVENTO', op.valoracion, [{label:'Gastos previstos + valor producto donado', value:Math.abs(op.valoracion), displayValue:op.valoracion, color:'#111827'}]]
    ];
    const maxVal = Math.max(1, ...rows.map(r => Math.abs(num(r[1]))), ...rows.flatMap(r => r[2].map(x => Math.abs(num(x.value)))));
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 34px Arial'; ctx.fillText('GRAFICAS DEL EVENTO', 42, 54);
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827'; ctx.font = 'bold 22px Arial'; ctx.fillText(`${label}: ${money(total)}`, 42, y);
      const x = 620, w = 1060, h = 34; ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, y - 27, w, h);
      let cx = x;
      items.forEach(it => { const segW = Math.max(0, num(it.value)) / maxVal * w; if(segW > 0){ ctx.fillStyle = it.color; ctx.fillRect(cx, y - 27, segW, h); cx += segW; } });
      ctx.font = '16px Arial'; let lx = x, ly = y + 34;
      items.filter(it => num(it.value) !== 0 || it.displayValue != null).forEach(it => {
        const txt = `${it.label}: ${money(it.displayValue ?? it.value)}`;
        const tw = ctx.measureText(txt).width;
        if(lx + tw + 42 > x + w){ lx = x; ly += 24; }
        ctx.fillStyle = it.color; ctx.fillRect(lx, ly - 13, 13, 13);
        ctx.fillStyle = '#374151'; ctx.fillText(txt, lx + 18, ly);
        lx += tw + 52;
      });
      return y + 135;
    }
    let y = 112;
    rows.forEach(row => { y = drawRow(y, row[0], row[1], row[2]); });
    return canvas.toDataURL('image/png');
  }
  function makeGroupingChart(kind){
    const data = grouping(kind);
    const canvas = document.createElement('canvas');
    canvas.width = 1500; canvas.height = Math.max(520, 125 + data.length * 96);
    const ctx = canvas.getContext('2d');
    const title = kind === 'segmento' ? 'POR SEGMENTO' : 'POR DESTINO';
    const total = sum(data.map(r => r.total));
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 30px Arial'; ctx.fillText(`${title} - TOTAL GENERAL: ${money(total)}`, 35, 48);
    const legends = [['#dc2626','Comprado'],['#f59e0b','Donado'],['#fb7185','Pte. Compra u otros gastos']];
    ctx.font = '16px Arial'; let lx = 35;
    legends.forEach(([color,label]) => { ctx.fillStyle = color; ctx.fillRect(lx,75,14,14); ctx.fillStyle = '#374151'; ctx.fillText(label,lx+20,88); lx += ctx.measureText(label).width + 70; });
    const max = Math.max(1, ...data.flatMap(r => [num(r.comprado), num(r.donado), num(r.pendiente)]));
    let y = 126;
    data.forEach(r => {
      ctx.fillStyle = '#111827'; ctx.font = 'bold 18px Arial'; ctx.fillText(`${r.label} · ${money(r.total)}`, 35, y);
      const x = 360, w = 930, h = 16;
      [[r.comprado,'#dc2626','Comprado'],[r.donado,'#f59e0b','Donado'],[r.pendiente,'#fb7185','Pte. Compra u otros gastos']].forEach((v, i) => {
        const yy = y - 4 + i*24;
        ctx.fillStyle = '#64748b'; ctx.font = '14px Arial'; ctx.fillText(v[2], 190, yy + 13);
        ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, yy, w, h);
        const bw = Math.max(0, num(v[0]) / max * w);
        if(bw > 0){ ctx.fillStyle = v[1]; ctx.fillRect(x, yy, bw, h); }
        ctx.fillStyle = '#111827'; ctx.font = '14px Arial'; ctx.fillText(money(v[0]), x + w + 18, yy + 13);
      });
      y += 92;
    });
    return canvas.toDataURL('image/png');
  }
  function addImage(wb, ws, dataUrl, r, c, width, height){
    if(!dataUrl || !String(dataUrl).startsWith('data:image/')) return false;
    const ext = String(dataUrl).slice(5, 30).includes('png') ? 'png' : 'jpeg';
    const id = wb.addImage({base64:dataUrl, extension:ext});
    ws.addImage(id, {tl:{col:c - 1 + 0.05, row:r - 1 + 0.05}, ext:{width,height}, editAs:'oneCell'});
    return true;
  }
  async function downloadWorkbook(wb, filename){
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1200);
  }
  function setupWorkbook(ExcelJS){
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB '26`;
    wb.created = new Date();
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fills = {title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFE4EC', soft:'FFF8FAFC', white:'FFFFFFFF'};
    const moneyFmt = '#,##0.00 [$€-C0A]';
    function sheet(name, widths){ const ws = wb.addWorksheet(name); ws.properties.defaultRowHeight = 21; ws.columns = widths.map(width => ({width})); return ws; }
    function paint(cell, fill='white', bold=false, color='FF111827'){
      cell.border = border;
      cell.alignment = {vertical:'middle', horizontal:'left', wrapText:true};
      if(fills[fill]) cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills[fill]}};
      cell.font = {bold:!!bold, color:{argb:color}};
    }
    function title(ws, r, text, cols){ ws.mergeCells(r,1,r,cols); const c = ws.getCell(r,1); c.value = text; paint(c,'title',true,'FFFFFFFF'); c.alignment = {vertical:'middle', horizontal:'center', wrapText:false}; ws.getRow(r).height = 25; }
    function headers(ws, r, list){ list.forEach((h,i) => { const c = ws.getCell(r,i+1); c.value = h; paint(c,'title',true,'FFFFFFFF'); c.alignment = {vertical:'middle', horizontal:'center', wrapText:true}; }); ws.getRow(r).height = 24; }
    function text(ws,r,c,v,fill='white',bold=false,color='FF111827'){ const cell = ws.getCell(r,c); cell.value = v == null ? '' : String(v); paint(cell,fill,bold,color); return cell; }
    function number(ws,r,c,v,fill='white',bold=false){ const cell = ws.getCell(r,c); cell.value = num(v); cell.numFmt = '0.00'; paint(cell,fill,bold); return cell; }
    function euro(ws,r,c,v,fill='white',bold=false){ const cell = ws.getCell(r,c); cell.value = num(v); cell.numFmt = moneyFmt; paint(cell,fill,bold); cell.alignment = {vertical:'middle', horizontal:'right', wrapText:false}; return cell; }
    return {wb, sheet, title, headers, text, number, euro};
  }
  function makeCodes(items, prefix){
    const out = {};
    (items || []).forEach((item, i) => { out[item.id] = prefix + String(i + 1).padStart(prefix === 'EV' ? 3 : 4, '0'); });
    return out;
  }
  function ticketEventIdFromKey(fullKey){ return String(fullKey || '').split('|')[0] || ''; }
  function ticketInnerKeyFromKey(fullKey){ const parts = String(fullKey || '').split('|'); return parts.slice(1).join('|').trim(); }
  function splitLongText(text, size = 30000){
    const value = String(text || '');
    const out = [];
    for(let i = 0; i < value.length; i += size) out.push(value.slice(i, i + size));
    return out.length ? out : [''];
  }
  function chooseBackupScope(){
    return new Promise(resolve => {
      const events = rows('eventos');
      const overlay = document.createElement('div');
      overlay.className = 'ce-backup-overlay-v181';
      overlay.innerHTML = `<div class="ce-backup-modal-v181"><h3>Descarga de datos</h3><p>Elige si quieres descargar todos los datos o solo los vinculados a un evento concreto.</p><div class="field"><label>Evento a descargar</label><select id="ceBackupScopeV257"><option value="TODOS">TODOS los eventos</option>${events.map(e => `<option value="${esc(e.id)}" ${String(e.id)===String(st().selectedEventId||'')?'selected':''}>${esc(e.titulo || e.id)}</option>`).join('')}</select></div><div class="ce-backup-actions-v181"><button type="button" class="outline" id="ceBackupCancelV257">Cancelar</button><button type="button" id="ceBackupOkV257">Descargar</button></div></div>`;
      document.body.appendChild(overlay);
      const done = value => { overlay.remove(); resolve(value); };
      overlay.querySelector('#ceBackupCancelV257')?.addEventListener('click', () => done(null));
      overlay.querySelector('#ceBackupOkV257')?.addEventListener('click', () => done(overlay.querySelector('#ceBackupScopeV257')?.value || 'TODOS'));
      overlay.addEventListener('click', ev => { if(ev.target === overlay) done(null); });
    });
  }
  function scopedBackupState(scope){
    const all = scope === 'TODOS';
    const base = st();
    const eventos = all ? [...rows('eventos')] : rows('eventos').filter(e => String(e.id) === String(scope));
    const eventIds = new Set(eventos.map(e => String(e.id)));
    const colaboradores = rows('colaboradores').filter(c => all || eventIds.has(String(c.eventId)));
    const comprasRows = rows('compras').filter(c => all || eventIds.has(String(c.eventId)));
    const personIds = new Set();
    colaboradores.forEach(c => { if(c.personaId) personIds.add(String(c.personaId)); });
    comprasRows.forEach(c => {
      if(c.responsableId) personIds.add(String(c.responsableId));
      const donor = String(c.donorRef || '');
      if(donor.startsWith('P:')) personIds.add(donor.slice(2));
    });
    const storeIds = new Set();
    comprasRows.forEach(c => {
      if(c.tiendaId) storeIds.add(String(c.tiendaId));
      const donor = String(c.donorRef || '');
      if(donor.startsWith('T:')) storeIds.add(donor.slice(2));
    });
    const productIds = new Set(comprasRows.map(c => String(c.productoId || '')).filter(Boolean));
    const personas = all ? [...rows('personas')] : rows('personas').filter(p => personIds.has(String(p.id)));
    const tiendas = all ? [...rows('tiendas')] : rows('tiendas').filter(t => storeIds.has(String(t.id)));
    const productos = all ? [...rows('productos')] : rows('productos').filter(p => productIds.has(String(p.id)));
    const ticketImages = {};
    Object.entries(base.ticketImages || {}).forEach(([key, value]) => {
      if(all || eventIds.has(String(ticketEventIdFromKey(key)))) ticketImages[key] = value;
    });
    return {eventos, personas, tiendas, productos, colaboradores, compras:comprasRows, ticketImages};
  }
  async function exportSeedWorkbookV257(){
    if(!isGD()){ alert('Solo GD puede realizar descarga de datos.'); return; }
    const scope = await chooseBackupScope();
    if(!scope) return;
    const ExcelJS = await cleanExcelJS();
    const x = setupWorkbook(ExcelJS), wb = x.wb;
    const scoped = scopedBackupState(scope);
    const eventCode = makeCodes(scoped.eventos, 'EV');
    const personCode = makeCodes(scoped.personas, 'PE');
    const storeCode = makeCodes(scoped.tiendas, 'TI');
    const productCode = makeCodes(scoped.productos, 'PR');
    const selectedEvent = scope === 'TODOS' ? null : scoped.eventos.find(e => String(e.id) === String(scope));
    const selectedCode = scope === 'TODOS' ? 'TODOS' : (eventCode[scope] || 'EV001');
    const selectedTitle = scope === 'TODOS' ? 'TODOS' : (selectedEvent?.titulo || selectedCode || 'EVENTO');
    function make(name, headers, rowsData){
      const ws = x.sheet(name, headers.map(h => Math.max(14, Math.min(42, String(h).length + 4))));
      x.headers(ws, 1, headers);
      rowsData.forEach(row => ws.addRow(row.map(v => v == null ? '' : v)));
      ws.views = [{state:'frozen', ySplit:1}];
      ws.columns.forEach((col, idx) => {
        let width = col.width || 14;
        col.eachCell({includeEmpty:true}, cell => { width = Math.max(width, Math.min(70, String(cell.value ?? '').length + 3)); });
        col.width = headers[idx] === 'IMAGEN_BASE64_PARTE' ? 72 : Math.min(70, width);
      });
      return ws;
    }
    const downloadedAt = stamp();
    make('METADATOS', ['CAMPO','VALOR'], [
      ['VERSION', VERSION],
      ['ALCANCE', scope === 'TODOS' ? 'TODOS' : selectedTitle],
      ['EVENTO_CODIGO', scope === 'TODOS' ? 'TODOS' : selectedCode],
      ['FECHA_DESCARGA', `${downloadedAt.yyyy}${downloadedAt.mm}${downloadedAt.dd}-${downloadedAt.hh}_${downloadedAt.mi}_${downloadedAt.ss}`],
      ['PROTECCION', 'Hojas protegidas para evitar cambios accidentales en la descarga.'],
      ['NOTA', 'Las imagenes grandes de tickets se dividen en TICKETS_PARTES para evitar ficheros Excel corruptos.']
    ]);
    make('EVENTOS', ['EVENTO_CODIGO','EVENTO_ID','EVENTO_TITULO','EVENTO_PRECIO','EVENTO_FECHAINI','EVENTO_FECHAFIN','EVENTO_SITUACION','EVENTO_DESCRIPCION'], scoped.eventos.map(e => [eventCode[e.id], e.id, e.titulo || '', num(e.precio), e.fechaIni || '', e.fechaFin || '', e.situacion || 'En curso', e.descripcion || '']));
    make('PERSONAS', ['PERSONA_CODIGO','PERSONA_ID','PERSONA_NOMBRE','PERSONA_RANGO'], scoped.personas.map(p => [personCode[p.id], p.id, p.nombre || '', p.rango || 'SOCIO']));
    make('TIENDAS', ['TIENDA_CODIGO','TIENDA_ID','TIENDA_NOMBRE'], scoped.tiendas.map(t => [storeCode[t.id], t.id, t.nombre || '']));
    const wsProductos = make('PRODUCTOS', ['PRODUCTO_CODIGO','PRODUCTO_ID','PRODUCTO_NOMBRE','PRODUCTO_SEGMENTO','PRODUCTO_DESTINO','PRODUCTO_PRECIO'], scoped.productos.map(p => [productCode[p.id], p.id, p.nombre || '', p.segmento || '', p.destino || '', num(p.defaultPrecio ?? p.precio)]));
    try{ wsProductos.getColumn(6).numFmt = '#,##0.00 [$€-C0A]'; }catch(_){ }
    make('INGRESOS', ['EVENTO_CODIGO','PERSONA_CODIGO','NUMERO','INGRESO','IMPORTE_VOLUNTARIO'], scoped.colaboradores.map(c => [eventCode[c.eventId] || '', personCode[c.personaId] || '', num(c.numero), c.situacion || c.ingreso || 'Pendiente', num(c.importe ?? c.importeVoluntario)]));
    make('COMPRAS', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TICKET_U_OTROS_GASTOS','TIENDA_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => !isDonation(ticket(c))).map(c => [eventCode[c.eventId] || '', productCode[c.productoId] || '', num(c.unidades), price(c), ticket(c), storeCode[c.tiendaId] || '', personCode[c.responsableId] || '']));
    make('DONACIONES', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TIPO_DONACION','DONANTE_TIPO','DONANTE_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => isDonation(ticket(c))).map(c => { const parts = String(c.donorRef || '').split(':'); const kind = parts[0], id = parts[1]; return [eventCode[c.eventId] || '', productCode[c.productoId] || '', num(c.unidades), price(c), ticket(c), kind === 'P' ? 'PERSONA' : (kind === 'T' ? 'TIENDA' : ''), kind === 'P' ? (personCode[id] || '') : (kind === 'T' ? (storeCode[id] || '') : ''), personCode[c.responsableId] || '']; }));
    const ticketRows = [], partRows = [];
    Object.entries(scoped.ticketImages || {}).forEach(([fullKey, image]) => {
      const evCode = eventCode[ticketEventIdFromKey(fullKey)] || '';
      const key = ticketInnerKeyFromKey(fullKey);
      const data = String(image || '');
      const parts = splitLongText(data, 30000);
      ticketRows.push([evCode, key, '', data.length <= 30000 ? data : '', data.length > 30000 ? 'DIVIDIDA_EN_TICKETS_PARTES' : '']);
      parts.forEach((part, idx) => partRows.push([evCode, key, idx + 1, parts.length, part]));
    });
    make('TICKETS', ['EVENTO_CODIGO','CLAVE_RESUMEN','ARCHIVO_IMAGEN','IMAGEN_BASE64','OBSERVACIONES'], ticketRows);
    make('TICKETS_PARTES', ['EVENTO_CODIGO','CLAVE_RESUMEN','PARTE','TOTAL_PARTES','IMAGEN_BASE64_PARTE'], partRows);
    for(const ws of wb.worksheets){
      try{
        ws.eachRow(row => row.eachCell(cell => { cell.protection = {locked:true}; }));
        await ws.protect('open_excel_arrastre', {
          selectLockedCells:true, selectUnlockedCells:true,
          formatCells:false, formatColumns:false, formatRows:false,
          insertColumns:false, insertRows:false, deleteColumns:false, deleteRows:false,
          sort:false, autoFilter:false, pivotTables:false, objects:false, scenarios:false
        });
      }catch(_){ }
    }
    await downloadWorkbook(wb, backupFileName(scope, selectedTitle));
  }
  async function exportExcelV257(){
    const ev = currentEvent();
    if(!ev || !ev.id){ alert('Elige un evento antes de sacar INFOEVENTO.'); return; }
    const ExcelJS = await cleanExcelJS();
    const x = setupWorkbook(ExcelJS), wb = x.wb;
    const op = opValues();
    let r = 1;
    const wsRes = x.sheet('RESUMEN', [30,42,18,18,18,4,4]);
    wsRes.mergeCells(r,1,r,5); x.text(wsRes,r,1,emitted(new Date()),'soft',true); wsRes.getRow(r++).height = 22;
    x.title(wsRes,r++,'RESUMEN DEL EVENTO',5); wsRes.getRow(r++).height = 8;
    x.text(wsRes,r,1,'Titulo del evento','white',true); wsRes.mergeCells(r,2,r,5); x.text(wsRes,r++,2,ev.titulo || '','white',true);
    const descRows = Math.max(2, Math.min(7, Math.ceil(norm(ev.descripcion).length / 95) || 2));
    x.text(wsRes,r,1,'Descripcion del evento','white',true); wsRes.mergeCells(r,2,r + descRows - 1,5); x.text(wsRes,r,2,ev.descripcion || '','soft'); wsRes.getCell(r,2).alignment = {vertical:'top', horizontal:'left', wrapText:true};
    for(let rr = r; rr < r + descRows; rr++) wsRes.getRow(rr).height = 22; r += descRows + 1;
    x.text(wsRes,r,1,'Situacion del evento','white',true); x.text(wsRes,r++,2,ev.situacion || 'En curso');
    x.text(wsRes,r,1,'Fecha inicio','white',true); x.text(wsRes,r++,2,ev.fechaIni || '');
    x.text(wsRes,r,1,'Fecha fin','white',true); x.text(wsRes,r++,2,ev.fechaFin || '');
    x.text(wsRes,r,1,'Precio evento','white',true); x.euro(wsRes,r++,2,ev.precio || 0);
    wsRes.getRow(r++).height = 8;
    x.text(wsRes,r,1,'Donacion de producto','white',true); x.euro(wsRes,r++,2,op.donation,'white',true);
    wsRes.getRow(r++).height = 8;
    [['INGRESO TOTAL',op.presupuesto,'white'],['GASTOS PREVISTOS',op.gastosPrevistos,'white'],['GASTOS REALIZADOS',op.gastosRealizados,'white'],['PTE. COMPRA U OTROS GASTOS',op.pendiente,'warn'],['SALDO ACTUAL',op.saldoActual,op.saldoActual >= 0 ? 'ok' : 'bad'],['SALDO OPERATIVO',op.saldoOperativo,op.saldoOperativo >= 0 ? 'ok' : 'bad'],['VALORACION DEL EVENTO',op.valoracion,'white']].forEach(([label,val,fill]) => { x.text(wsRes,r,1,label,fill,true,fill==='warn'?'FFBE123C':'FF111827'); x.euro(wsRes,r++,2,val,fill,true); });
    r += 2; x.title(wsRes,r++,'GRAFICAS DEL CALCULOS POR AGRUPACION',5); wsRes.getRow(r++).height = 8;
    if(addImage(wb, wsRes, makeGroupingChart('segmento'), r, 1, 980, 360)){ for(let rr=r; rr<r+17; rr++) wsRes.getRow(rr).height = 20; r += 19; }
    if(addImage(wb, wsRes, makeGroupingChart('destino'), r, 1, 980, 360)){ for(let rr=r; rr<r+17; rr++) wsRes.getRow(rr).height = 20; }
    const wsIng = x.sheet('INGRESOS', [34,12,18,18,18,18]);
    x.title(wsIng,1,'INGRESOS',6); x.headers(wsIng,3,['Colaborador/a','Numero','Ingreso','Importe obligatorio','Importe voluntario','Total']);
    const ingresoRows = collabs();
    r = 4; ingresoRows.forEach(c => { x.text(wsIng,r,1,c.persona?.nombre || ''); x.number(wsIng,r,2,c.numero); x.text(wsIng,r,3,c.situacion || ''); x.euro(wsIng,r,4,c.base); x.euro(wsIng,r,5,c.donation); x.euro(wsIng,r++,6,c.total, up(c.situacion)==='PENDIENTE'?'warn':'white'); });
    x.text(wsIng,r,1,'TOTAL','soft',true); x.number(wsIng,r,2,sum(ingresoRows.map(c => c.numero)),'soft',true); x.text(wsIng,r,3,'','soft',true); x.euro(wsIng,r,4,sum(ingresoRows.map(c => c.base)),'soft',true); x.euro(wsIng,r,5,sum(ingresoRows.map(c => c.donation)),'soft',true); x.euro(wsIng,r,6,sum(ingresoRows.map(c => c.total)),'soft',true); wsIng.getRow(r).height = 24;
    const wsCom = x.sheet('COMPRAS Y OTROS GASTOS', [30,12,16,16,26,28,28]);
    x.title(wsCom,1,'COMPRAS Y OTROS GASTOS',7); x.headers(wsCom,3,['Producto','Unidades','Precio','Importe','Ticket u otros gastos','Tienda','Responsable']);
    const compraRows = compras().filter(c => !isDonation(ticket(c))).sort((a,b) => productName(a).localeCompare(productName(b),'es'));
    r = 4; compraRows.forEach(c => { x.text(wsCom,r,1,productName(c)); x.number(wsCom,r,2,units(c)); x.euro(wsCom,r,3,price(c)); x.euro(wsCom,r,4,value(c), !ticket(c)?'warn':'white'); x.text(wsCom,r,5,ticket(c)); x.text(wsCom,r,6,storeName(c)); x.text(wsCom,r++,7,c.responsable?.nombre || personName(c.responsableId)); });
    x.text(wsCom,r,1,'TOTAL','soft',true); x.number(wsCom,r,2,sum(compraRows.map(c => units(c))),'soft',true); x.text(wsCom,r,3,'','soft',true); x.euro(wsCom,r,4,sum(compraRows.map(c => value(c))),'soft',true); x.text(wsCom,r,5,'','soft',true); x.text(wsCom,r,6,'','soft',true); x.text(wsCom,r,7,'','soft',true); wsCom.getRow(r).height = 24;
    const wsDon = x.sheet('DONACIONES DE PRODUCTO', [30,12,16,18,22,28,28]);
    x.title(wsDon,1,'DONACIONES DE PRODUCTO',7); x.headers(wsDon,3,['Producto','Unidades','Precio','Valor estimado','Tipo de donacion','Donante','Responsable']);
    const donacionRows = compras().filter(c => isDonation(ticket(c))).sort((a,b) => donorName(a).localeCompare(donorName(b),'es') || productName(a).localeCompare(productName(b),'es'));
    r = 4; donacionRows.forEach(c => { x.text(wsDon,r,1,productName(c)); x.number(wsDon,r,2,units(c)); x.euro(wsDon,r,3,price(c)); x.euro(wsDon,r,4,value(c)); x.text(wsDon,r,5,ticket(c)); x.text(wsDon,r,6,donorName(c)); x.text(wsDon,r++,7,c.responsable?.nombre || personName(c.responsableId)); });
    x.text(wsDon,r,1,'TOTAL','soft',true); x.number(wsDon,r,2,sum(donacionRows.map(c => units(c))),'soft',true); x.text(wsDon,r,3,'','soft',true); x.euro(wsDon,r,4,sum(donacionRows.map(c => value(c))),'soft',true); x.text(wsDon,r,5,'','soft',true); x.text(wsDon,r,6,'','soft',true); x.text(wsDon,r,7,'','soft',true); wsDon.getRow(r).height = 24;
    function groupingSheet(name, title, data){
      const ws = x.sheet(name, [32,16,16,22,16]);
      x.title(ws,1,title,5); x.headers(ws,3,[title.includes('SEGMENTO')?'Segmento':'Destino','Comprado','Donado','Pte. Compra u otros gastos','Total']);
      let rr = 4; data.forEach(it => { x.text(ws,rr,1,it.label || ''); x.euro(ws,rr,2,it.comprado); x.euro(ws,rr,3,it.donado); x.euro(ws,rr,4,it.pendiente, num(it.pendiente)?'warn':'white'); x.euro(ws,rr++,5,it.total); });
      x.text(ws,rr,1,'TOTAL GENERAL','soft',true); x.euro(ws,rr,2,sum(data.map(it => it.comprado)),'soft',true); x.euro(ws,rr,3,sum(data.map(it => it.donado)),'soft',true); x.euro(ws,rr,4,sum(data.map(it => it.pendiente)),'soft',true); x.euro(ws,rr,5,sum(data.map(it => it.total)),'soft',true); ws.getRow(rr).height = 24;
    }
    groupingSheet('CALCULOS_SEGMENTO','CALCULOS POR SEGMENTO', grouping('segmento'));
    groupingSheet('CALCULOS_DESTINO','CALCULOS POR DESTINO', grouping('destino'));
    const wsTT = x.sheet('CALCULOS_TIENDA_TICKET', [48,18,28]);
    x.title(wsTT,1,'CALCULOS POR TIENDA Y TICKET',3); x.headers(wsTT,3,['Tienda/Ticket/Donacion/Otros gastos','Importe','Imagen']);
    const tiendaTicketData = tiendaTicketRows();
    r = 4;
    for(const row of tiendaTicketData){
      const label = norm(row.label || row.k || row.concepto || '');
      x.text(wsTT,r,1,label,row.pending?'warn':'white',!!row.pending);
      x.euro(wsTT,r,2,row.v ?? row.total ?? row.importe ?? 0,row.pending?'warn':'white');
      const img = await sourceToData(imageForRow(row));
      if(img && addImage(wb, wsTT, img, r, 3, 170, 95)) wsTT.getRow(r).height = 76;
      r++;
    }
    x.text(wsTT,r,1,'TOTAL GENERAL','soft',true); x.euro(wsTT,r,2,sum(tiendaTicketData.map(row => row.v ?? row.total ?? row.importe ?? 0)),'soft',true); x.text(wsTT,r,3,'','soft',true); wsTT.getRow(r).height = 24;
    const wsGraf = x.sheet('GRAFICAS', [28,28,28,28,28,28,28]);
    x.title(wsGraf,1,'GRAFICAS DEL EVENTO',7);
    x.text(wsGraf,2,1,'Evento','soft',true); wsGraf.mergeCells(2,2,2,7); x.text(wsGraf,2,2,ev.titulo || '','soft');
    addImage(wb, wsGraf, makeEventChart(), 3, 1, 1500, 775);
    for(let rr = 3; rr <= 40; rr++) wsGraf.getRow(rr).height = 20;
    // v27.7: las hojas RESUMEN_MODULAR y GRAFICAS_MODULAR fueron útiles para auditoría,
    // pero ya no se añaden al INFOEVENTO por defecto porque ensuciaban el libro final.
    // Se mantienen disponibles sólo como herramientas standalone desde consola.
    try{
      if(window.ControlEventExcel && typeof window.ControlEventExcel.protectWorkbook === 'function'){
        await window.ControlEventExcel.protectWorkbook(wb, {source:'infoevento-v27.7'});
      }else{
        for(const ws of wb.worksheets){
          try{
            ws.eachRow(row => row.eachCell(cell => { cell.protection = {...(cell.protection || {}), locked:true}; }));
            await ws.protect('open_excel_arrastre', {
              selectLockedCells:true, selectUnlockedCells:true,
              formatCells:false, formatColumns:false, formatRows:false,
              insertColumns:false, insertRows:false, insertHyperlinks:false,
              deleteColumns:false, deleteRows:false,
              sort:false, autoFilter:false, pivotTables:false, objects:false, scenarios:false
            });
          }catch(protectError){
            console.warn('[ControlEvent v45.1] No se pudo proteger hoja INFOEVENTO', ws?.name, protectError);
          }
        }
      }
    }catch(error){
      console.warn('[ControlEvent v45.1] No se pudo aplicar protección final al INFOEVENTO.', error);
    }
    await downloadWorkbook(wb, infoFileName(ev));
  }
  function runSafe(fn, label){
    return (async () => {
      try{ await fn(); }
      catch(err){
        console.error(`[v25.9] ${label}`, err);
        alert(`No se pudo descargar ${label}.\n\n${err?.name || 'Error'}: ${err?.message || err}`);
      }
    })();
  }
  function exportExcelSafe(){ return runSafe(exportExcelV257, 'INFOEVENTO'); }
  function exportSeedSafe(){
    try{
      const excel = window.ControlEventExcel;
      if(excel && typeof excel.run === 'function' && !exportSeedSafe.__legacyFallback){
        return excel.run('backup', {source:'legacy-click-v272', calledAt:new Date().toISOString()});
      }
    }catch(_){ }
    return runSafe(exportSeedWorkbookV257, 'Descarga de datos');
  }
  function unlockProductPrice(){
    document.body.classList.toggle('ce-v257-gd', isGD());
    if(!isGD()) return;
    document.querySelectorAll('#mtProductos input,#mtProductos select,#mtProductos button,#newProductoPrecio').forEach(el => {
      el.disabled = false;
      el.readOnly = false;
      el.classList.remove('locked','ce-v225-ro-disabled');
      el.removeAttribute('aria-disabled');
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
    });
  }
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; });
    try{ window.__ceVersion = VERSION; }catch(_){ }
    try{ window.emittedByTextV171 = emitted; emittedByTextV171 = emitted; }catch(_){ }
  }
  function install(){
    applyVersion();
    unlockProductPrice();
    try{ exportExcel = exportExcelSafe; }catch(_){ }
    window.exportExcel = exportExcelSafe;
    try{ exportSeedWorkbook = exportSeedSafe; }catch(_){ }
    window.exportSeedWorkbook = exportSeedSafe;
  }
  document.addEventListener('pointerdown', ev => {
    if(ev.target?.closest?.('#mtProductos input,#mtProductos select,#mtProductos button,#newProductoPrecio')) unlockProductPrice();
  }, true);
  document.addEventListener('click', ev => {
    const excel = ev.target?.closest?.('#btnExportExcel,.mobile-menu-action[data-target="btnExportExcel"]');
    if(excel){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); exportExcelSafe(); return false; }
    const seed = ev.target?.closest?.('#btnExportSeed,.mobile-menu-action[data-target="btnExportSeed"]');
    if(seed && isGD()){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); exportSeedSafe(); return false; }
  }, true);
  const prevRender = (typeof render === 'function') ? render : window.render;
  if(prevRender && !prevRender.__v257Wrapped){
    const wrapped = function(){ const ret = prevRender.apply(this, arguments); [30,160,600].forEach(ms => setTimeout(install, ms)); return ret; };
    wrapped.__v257Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  install();
  [100,600,1600].forEach(ms => setTimeout(install, ms));
  window.__ceV257 = {version:VERSION, exportExcel:exportExcelSafe, exportSeedWorkbook:exportSeedSafe, unlockProductPrice};
})();

;/* ===== END legacy-inline-62-v257-fixes.js ===== */


;/* ===== BEGIN legacy-inline-63-v259-app-facade.js ===== */

/* ControlEvent v45.1 - JS legacy extraido de public/index.html. Bloque inline #63. */
/* ==== v25.9: fachada estable para modularizacion progresiva ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.1';
  const VERSION_FILE = 'ControlEvent_v45_1';
  const call = fn => typeof fn === 'function' ? (...args) => fn(...args) : undefined;
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{ window.__ceVersion = VERSION; }catch(_){ }
  }
  function buildApp(){
    const navigation = {
      get currentMainTab(){ try{ return currentMainTab; }catch(_){ return 'ingresos'; } },
      set currentMainTab(value){ try{ currentMainTab = value; }catch(_){ } },
      get currentMaintTab(){ try{ return currentMaintTab; }catch(_){ return 'personas'; } },
      set currentMaintTab(value){ try{ currentMaintTab = value; }catch(_){ } },
      get currentProductSort(){ try{ return currentProductSort; }catch(_){ return 'nombre'; } },
      set currentProductSort(value){ try{ currentProductSort = value; }catch(_){ } }
    };
    const app = {
      version: VERSION,
      versionFile: VERSION_FILE,
      get state(){ try{ return state; }catch(_){ return {}; } },
      get authUser(){ try{ return authUser; }catch(_){ return window.authUser || null; } },
      set authUser(value){ try{ authUser = value; }catch(_){ } window.authUser = value; },
      get accessUsers(){ try{ return accessUsers; }catch(_){ return []; } },
      navigation,
      selectors: {
        selectedEvent: call(typeof selectedEvent === 'function' ? selectedEvent : undefined),
        personaById: call(typeof personaById === 'function' ? personaById : undefined),
        productoById: call(typeof productoById === 'function' ? productoById : undefined),
        tiendaById: call(typeof tiendaById === 'function' ? tiendaById : undefined),
        personasForSelectedEvent: call(typeof personasForSelectedEvent === 'function' ? personasForSelectedEvent : undefined),
        tiendasForSelectedEvent: call(typeof tiendasForSelectedEvent === 'function' ? tiendasForSelectedEvent : undefined),
        productosForSelectedEvent: call(typeof productosForSelectedEvent === 'function' ? productosForSelectedEvent : undefined),
        collabsForEvent: call(typeof collabsForEvent === 'function' ? collabsForEvent : undefined),
        comprasForEvent: call(typeof comprasForEvent === 'function' ? comprasForEvent : undefined)
      },
      calculations: {
        ingresoSummary: call(typeof ingresoSummary === 'function' ? ingresoSummary : undefined),
        budgetSummary: call(typeof budgetSummary === 'function' ? budgetSummary : undefined),
        summaryBySegmento: call(typeof summaryBySegmento === 'function' ? summaryBySegmento : undefined),
        summaryByDestino: call(typeof summaryByDestino === 'function' ? summaryByDestino : undefined),
        summaryByTiendaTicket: call(typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : undefined)
      },
      actions: {
        render: call(typeof render === 'function' ? render : undefined),
        saveState: call(typeof saveState === 'function' ? saveState : undefined),
        pushStateToServer: call(typeof pushStateToServer === 'function' ? pushStateToServer : undefined),
        changeSelectedEvent: call(typeof changeSelectedEvent === 'function' ? changeSelectedEvent : undefined),
        renderHeader: call(typeof renderHeader === 'function' ? renderHeader : undefined),
        renderTabVisibility: call(typeof renderTabVisibility === 'function' ? renderTabVisibility : undefined),
        renderMainSelectors: call(typeof renderMainSelectors === 'function' ? renderMainSelectors : undefined),
        renderIngresosSummary: call(typeof renderIngresosSummary === 'function' ? renderIngresosSummary : undefined),
        renderColabs: call(typeof renderColabs === 'function' ? renderColabs : undefined),
        renderBudget: call(typeof renderBudget === 'function' ? renderBudget : undefined),
        renderCompras: call(typeof renderCompras === 'function' ? renderCompras : undefined),
        renderDonaciones: call(typeof renderDonaciones === 'function' ? renderDonaciones : undefined),
        renderMaintenance: call(typeof renderMaintenance === 'function' ? renderMaintenance : undefined),
        renderPermissions: call(typeof renderPermissions === 'function' ? renderPermissions : undefined),
        renderLockState: call(typeof renderLockState === 'function' ? renderLockState : undefined),
        renderGraficas: call(typeof renderGraficas === 'function' ? renderGraficas : undefined),
        fetchAccessUsers: call(typeof fetchAccessUsers === 'function' ? fetchAccessUsers : undefined),
        doLogin: call(typeof doLogin === 'function' ? doLogin : undefined),
        doLogout: call(typeof doLogout === 'function' ? doLogout : undefined),
        exportExcel: (...args) => {
          const fn = window.exportExcel || (typeof exportExcel === 'function' ? exportExcel : null);
          return typeof fn === 'function' ? fn(...args) : undefined;
        },
        exportSeedWorkbook: (...args) => {
          const fn = window.exportSeedWorkbook || (typeof exportSeedWorkbook === 'function' ? exportSeedWorkbook : null);
          return typeof fn === 'function' ? fn(...args) : undefined;
        }
      },
      modules: {
        get registry(){ return window.ControlEventModules || null; }
      }
    };
    window.ControlEventApp = app;
    window.__ceV258 = {version:VERSION, app};
    window.dispatchEvent(new CustomEvent('controlevent:app-ready', {detail:{app}}));
    return app;
  }
  applyVersion();
  buildApp();
})();

;/* ===== END legacy-inline-63-v259-app-facade.js ===== */

