/* ControlEvent v45.5 - DONACION operativa, quesos SALDO ACTUAL/DONACION y barra INFOEVENTO.
   Cambio ligero: no toca el flujo de cambio de evento ni la carga de datos. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.5';
  const VERSION_FILE = 'ControlEvent_v45_5';
  const DARK_BLUE = '#0b1f3a';
  const SALDO_OK = '#0f766e';
  const SALDO_BAD = '#7f1d1d';
  const DONACION_COLOR = DARK_BLUE;
  const EPS = 0.004;
  const $ = id => document.getElementById(id);
  const st = () => { try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ } return window.state || {}; };
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const norm = v => String(v ?? '').trim();
  const fold = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s); return Number.isFinite(n) ? n : 0;
  };
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(num(v)); }catch(_){ }
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(num(v)); }catch(_){ return num(v).toFixed(2)+' €'; }
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function eventId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ }
    return String(st().selectedEventId || '');
  }
  function persona(id){
    try{ if(typeof personaById === 'function') return personaById(id) || {}; }catch(_){ }
    return arr('personas').find(p => String(p.id || '') === String(id || '')) || {};
  }
  function personName(row){ return norm(row?.persona?.nombre || persona(row?.personaId).nombre || row?.nombre || ''); }
  function ingresos(){
    try{ const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : null; if(Array.isArray(rows)) return rows; }catch(_){ }
    const id = eventId();
    return arr('colaboradores').filter(r => String(r.eventId || '') === id).map(r => ({...r, persona: persona(r.personaId)}));
  }
  function incomeTotal(row){
    if(row?.total != null) return num(row.total);
    const ev = (()=>{ try{ return typeof selectedEvent === 'function' ? selectedEvent() : {}; }catch(_){ return {}; } })() || {};
    const p = row?.persona || persona(row?.personaId);
    const numero = num(row?.numero);
    const base = row?.base != null ? num(row.base) : (fold(p?.rango) === 'SOCIO' ? numero * num(ev.precio) : 0);
    const voluntario = num(row?.donation ?? row?.importe ?? row?.importeVoluntario ?? row?.voluntario ?? 0);
    return base + voluntario;
  }
  function isIrpfEla(row){
    const n = fold(personName(row));
    return n === 'Z_DEV_IRPF ELA' || n.includes('Z_DEV_IRPF ELA') || n.includes('Z DEV IRPF ELA');
  }
  function irpfElaAmount(){
    return ingresos().filter(r => isIrpfEla(r) && fold(r.situacion || r.ingreso || r.tipoIngreso || '') !== 'PENDIENTE').reduce((a,r)=>a+incomeTotal(r),0);
  }
  function budget(){ try{ if(typeof budgetSummary === 'function') return budgetSummary() || {}; }catch(_){ } return {}; }
  function computed(){
    const b = budget();
    const op = b.operativa || {};
    const ingresosRealizados = num(op.ingresoDinero ?? b.ingresosDinero?.totalIngresado ?? ingresos().filter(r => fold(r.situacion || '') !== 'PENDIENTE').reduce((a,r)=>a+incomeTotal(r),0));
    const gastosRealizados = num(op.gastosRealizados ?? ((op.gastoCompras != null || op.gastosOrganizacion != null) ? num(op.gastoCompras)+num(op.gastosOrganizacion) : 0));
    const saldoActual = Number.isFinite(Number(op.saldoActual)) ? num(op.saldoActual) : ingresosRealizados - gastosRealizados;
    const gastosPrevistos = num(op.gastosPrevistos ?? (num(op.gastoCompras)+num(op.gastosOrganizacion)+num(op.pendiente)));
    const ingresoTotal = num(op.ingresos ?? op.presupuesto ?? b.ingresosDinero?.totalComprometido ?? ingresos().reduce((a,r)=>a+incomeTotal(r),0));
    const saldoOperativo = Number.isFinite(Number(op.saldoOperativo)) ? num(op.saldoOperativo) : ingresoTotal - gastosPrevistos;
    const irpf = irpfElaAmount();
    const donacion = saldoActual - irpf;
    return {ingresosRealizados,gastosRealizados,saldoActual,ingresoTotal,gastosPrevistos,saldoOperativo,irpf,donacion};
  }
  function formulaTip(kind, c){
    if(kind === 'saldoActual') return `Concepto | Fórmula | Importe\nSALDO ACTUAL | Ingresos realizados - Gastos realizados | ${money(c.saldoActual)}\nIngresos realizados |  | ${money(c.ingresosRealizados)}\nGastos realizados |  | ${money(c.gastosRealizados)}`;
    if(kind === 'saldoOperativo') return `Concepto | Fórmula | Importe\nSALDO OPERATIVO | Ingreso total - Gastos previstos | ${money(c.saldoOperativo)}\nINGRESO TOTAL |  | ${money(c.ingresoTotal)}\nGastos previstos |  | ${money(c.gastosPrevistos)}`;
    return `Concepto | Fórmula | Importe\nDONACION | Saldo actual - z_DEV_IRPF ELA | ${money(c.donacion)}\nSALDO ACTUAL |  | ${money(c.saldoActual)}\nz_DEV_IRPF ELA |  | ${money(c.irpf)}`;
  }
  function injectStyle(){
    if($('ceV455Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV455Style';
    style.textContent = `
      .ce-v455-donacion-row strong{color:#111827!important;}
      .ce-v455-donacion-row .ce-v455-donacion-value{background:${DARK_BLUE}!important;color:#fff!important;font-weight:950!important;font-size:1.18rem!important;padding:5px 10px!important;border-radius:10px!important;box-shadow:inset 0 -1px 0 rgba(255,255,255,.18);}
      .ce-v455-extra-pie .ce-v434-pie-title strong{color:#111827;}
      #ceTooltipV21.ce-v21-layout-chartdarkv455{color:#fff!important;border-color:rgba(255,255,255,.25)!important;box-shadow:0 16px 44px rgba(2,6,23,.34)!important;}
      #ceTooltipV21.ce-v21-layout-chartdarkv455 *{color:#fff!important;}
      #ceTooltipV21.ce-v21-layout-chartdarkv455 .ce-v21-table{border-collapse:separate!important;border-spacing:0 4px!important;width:max-content;max-width:min(920px,calc(100vw - 48px));}
      #ceTooltipV21.ce-v21-layout-chartdarkv455 .ce-v21-table td{font-weight:800!important;white-space:nowrap!important;font-variant-numeric:tabular-nums;}
      #ceTooltipV21.ce-v21-layout-chartdarkv455 .ce-v21-table tr:first-child td{font-weight:950!important;background:rgba(255,255,255,.18)!important;}
      #ceTooltipV21.ce-v21-layout-chartdarkv455 .ce-v21-table td:nth-child(3){text-align:right!important;}
    `;
    document.head.appendChild(style);
  }
  function setTip(el, text, bg){
    if(!el) return;
    el.setAttribute('data-ce-tip-v21', text);
    el.setAttribute('data-tip-bg-v21', bg || DARK_BLUE);
    el.setAttribute('data-ce-tip-layout-v21', 'chartdarkv455');
    el.removeAttribute('title'); el.removeAttribute('data-tip'); el.removeAttribute('data-ce-tip');
  }
  function enhanceBudget(){
    const wrap = $('budgetLayout'); if(!wrap) return;
    const c = computed();
    const sig = [eventId(), c.saldoActual, c.irpf, c.donacion].join('|');
    const existing = wrap.querySelector('.ce-v455-donacion-row');
    if(Math.abs(c.donacion) <= EPS){ if(existing) existing.remove(); return; }
    if(existing && existing.getAttribute('data-v455-sig') === sig) return;
    if(existing) existing.remove();
    const after = wrap.querySelector('[data-v251-op="saldoActual"]') || Array.from(wrap.querySelectorAll('.budget-row')).find(r => /SALDO\s+ACTUAL/i.test(r.textContent || ''));
    if(!after) return;
    const row = document.createElement('div');
    row.className = 'budget-row ce-v455-donacion-row';
    row.setAttribute('data-v455-op','donacion');
    row.setAttribute('data-v455-sig', sig);
    row.innerHTML = `<strong>DONACION</strong><span class="ce-v455-donacion-value">${esc(money(c.donacion))}</span>`;
    after.insertAdjacentElement('afterend', row);
    const tip = formulaTip('donacion', c);
    setTip(row, tip, DARK_BLUE);
    row.querySelectorAll('strong,span').forEach(el => setTip(el, tip, DARK_BLUE));
  }
  function pieCard(title, value, color, tip){
    const amount = Math.abs(num(value));
    const slice = amount > EPS ? `<circle class="ce-v434-pie-slice" cx="50" cy="50" r="42" fill="${esc(color)}" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="${esc(color)}" data-ce-tip-layout-v21="chartdarkv455"></circle>` : `<circle cx="50" cy="50" r="42" fill="#e5e7eb"></circle>`;
    return `<div class="ce-v434-pie-card ce-v455-extra-pie" data-v455-pie="${esc(title)}" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="${esc(color)}" data-ce-tip-layout-v21="chartdarkv455"><div class="ce-v434-pie-title"><span>${esc(title)}</span><strong>${esc(money(value))}</strong></div><svg class="ce-v434-pie-svg" viewBox="0 0 100 100" role="img" aria-label="${esc(title)}" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="${esc(color)}" data-ce-tip-layout-v21="chartdarkv455">${slice}<circle cx="50" cy="50" r="21" fill="#fff"></circle></svg><div class="ce-v434-legend"><div class="ce-v434-legend-row" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="${esc(color)}" data-ce-tip-layout-v21="chartdarkv455"><span class="ce-v434-dot" style="background:${esc(color)}"></span><span>${esc(title)}: ${esc(money(value))}</span></div></div></div>`;
  }
  function findPieCardByTitle(text){
    const target = fold(text);
    return Array.from(document.querySelectorAll('.ce-v434-pie-card')).find(card => fold(card.querySelector('.ce-v434-pie-title span')?.textContent || '').includes(target));
  }
  function darkenSaldoOperativo(){
    const c = computed();
    const color = c.saldoOperativo >= 0 ? '#155e75' : SALDO_BAD;
    const tip = formulaTip('saldoOperativo', c);
    const card = findPieCardByTitle('SALDO OPERATIVO');
    if(!card) return;
    setTip(card, tip, color);
    card.querySelectorAll('.ce-v434-pie-slice,.ce-v434-legend-row,.ce-v434-pie-svg').forEach(el => setTip(el, tip, color));
  }
  function enhanceGraficas(){
    const pies = document.querySelector('#eventChartWrap .ce-v434-pies'); if(!pies) return;
    const c = computed();
    const sig = [eventId(), c.saldoActual, c.saldoOperativo, c.irpf, c.donacion].join('|');
    darkenSaldoOperativo();
    if(pies.getAttribute('data-v455-sig') === sig) return;
    pies.querySelectorAll('.ce-v455-extra-pie').forEach(x => x.remove());
    const saldoColor = c.saldoActual >= 0 ? SALDO_OK : SALDO_BAD;
    pies.insertAdjacentHTML('beforeend', pieCard('SALDO ACTUAL', c.saldoActual, saldoColor, formulaTip('saldoActual', c)));
    if(Math.abs(c.donacion) > EPS) pies.insertAdjacentHTML('beforeend', pieCard('DONACION', c.donacion, DONACION_COLOR, formulaTip('donacion', c)));
    pies.setAttribute('data-v455-sig', sig);
  }
  function donationFromBudget(b){
    const op = b?.operativa || {};
    const ingresosRealizados = num(op.ingresoDinero ?? b?.ingresosDinero?.totalIngresado ?? ingresos().filter(r => fold(r.situacion || '') !== 'PENDIENTE').reduce((a,r)=>a+incomeTotal(r),0));
    const gastosRealizados = num(op.gastosRealizados ?? ((op.gastoCompras != null || op.gastosOrganizacion != null) ? num(op.gastoCompras)+num(op.gastosOrganizacion) : 0));
    const saldoActual = Number.isFinite(Number(op.saldoActual)) ? num(op.saldoActual) : ingresosRealizados - gastosRealizados;
    const irpf = irpfElaAmount();
    return {irpf, donacion: saldoActual - irpf};
  }
  function patchBudgetSummary(){
    const old = (typeof budgetSummary === 'function') ? budgetSummary : window.budgetSummary;
    if(typeof old !== 'function' || old.__ceV455Donacion) return;
    const wrapped = function(){
      const b = old.apply(this, arguments) || {};
      try{
        const op = b.operativa || {};
        const d = donationFromBudget(b);
        b.operativa = Object.assign({}, op, {zDevIrpfEla:d.irpf, donacion:d.donacion, donacionFinal:d.donacion});
      }catch(_){ }
      return b;
    };
    wrapped.__ceV455Donacion = true;
    try{ budgetSummary = wrapped; }catch(_){ }
    window.budgetSummary = wrapped;
  }
  let scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    setTimeout(()=>{
      scheduled = false;
      try{ patchBudgetSummary(); enhanceBudget(); enhanceGraficas(); }catch(e){ console.warn('[v45.5] donacion operativa', e); }
    }, 60);
  }
  function wrapRender(name){
    const old = window[name] || (()=>{ try{ return eval(name); }catch(_){ return null; } })();
    if(typeof old !== 'function' || old.__ceV455Wrapped) return;
    const wrapped = function(){ const ret = old.apply(this, arguments); schedule(); return ret; };
    wrapped.__ceV455Wrapped = true;
    try{ window[name] = wrapped; }catch(_){ }
    try{ eval(name + ' = wrapped'); }catch(_){ }
  }

  function installObserver(){
    if(window.__ceV455DonacionObserver) return;
    try{
      const obs = new MutationObserver(() => schedule());
      obs.observe(document.body, {childList:true, subtree:true});
      window.__ceV455DonacionObserver = obs;
    }catch(_){ }
  }
  function install(){
    injectStyle();
    patchBudgetSummary();
    ['render','renderResumen','renderBudget','renderGraficas'].forEach(wrapRender);
    installObserver();
    schedule();
  }
  window.ControlEventV455Donacion = {version:VERSION, install, computed, enhanceBudget, enhanceGraficas};
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,180,700,1600].forEach(ms => setTimeout(install, ms));
})();
