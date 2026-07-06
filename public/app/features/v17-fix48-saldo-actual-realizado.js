/* ControlEvent v18.11.6_prod FIX48_SALDO_ACTUAL_REALIZADO
   Corrección mínima: SALDO ACTUAL = ingresos realmente cobrados - gastos realizados.
   Solo se considera ingreso realizado si la situación es Banco, Bizum o Efectivo.
   El resto queda como pendiente para este cálculo. */
(function(){
  'use strict';
  if(window.__ceV17Fix48SaldoActualRealizado) return;
  window.__ceV17Fix48SaldoActualRealizado = true;

  const PAID = new Set(['BANCO','BIZUM','EFECTIVO']);
  const DONATION_TYPES = new Set(['DONADO TIENDA','DONADO SOCIO','DONADO OTROS']);
  const VERSION = 'v18.11.6_prod_FIX48_SALDO_ACTUAL_REALIZADO';

  const text = value => String(value ?? '').trim();
  const up = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function num(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').replace(/[^0-9,.-]/g, '');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const money = value => Number(num(value).toFixed(2));

  function getLexical(name){ try{ return Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(); }catch(_){ return window[name]; } }
  function setLexical(name, value){
    try{ Function('value', 'try{ if(typeof '+name+' !== "undefined") '+name+' = value; }catch(_){ }')(value); }catch(_){ }
    try{ window[name] = value; }catch(_){ }
  }
  function stateRef(){ return getLexical('state') || window.state || window.ControlEventApp?.state || window.__CONTROL_EVENT_APP__?.state || {}; }
  function arr(name){ const v = stateRef()[name]; return Array.isArray(v) ? v : []; }
  function selectedEventId(){
    try{ const ev = getLexical('selectedEvent')?.(); if(ev?.id) return String(ev.id); }catch(_){ }
    return String(stateRef().selectedEventId || window.ControlEventApp?.state?.selectedEventId || document.getElementById('selectedEvent')?.value || '');
  }
  function rowsForEvent(name){
    const ev = selectedEventId();
    return arr(name).filter(row => String(row?.eventId || row?.event_id || '') === ev);
  }
  function byId(name, id){
    const sid = String(id || '');
    return arr(name).find(row => String(row?.id || '') === sid) || null;
  }
  function selectedEventObj(){
    const ev = selectedEventId();
    return arr('eventos').find(row => String(row?.id || '') === ev) || {};
  }
  function eventPrice(){ return num(selectedEventObj().precio ?? selectedEventObj().price ?? 0); }
  function incomePersona(row){ return row?.persona || byId('personas', row?.personaId) || byId('personas', row?.persona_id) || {}; }
  function isSocio(row){ return up(incomePersona(row)?.rango || row?.rango || row?.personaRango || '') === 'SOCIO'; }
  function incomeSitu(row){
    const raw = text(row?.situacion || row?.ingreso || row?.tipoIngreso || row?.formaPago || '');
    return raw || 'Pendiente';
  }
  function isIncomePaid(row){ return PAID.has(up(incomeSitu(row))); }
  function incomeTotal(row){
    if(row?.total !== undefined && row?.total !== null && text(row.total) !== '') return money(row.total);
    const numero = num(row?.numero || row?.num || row?.n || 0);
    const obligatorio = isSocio(row) ? numero * eventPrice() : 0;
    const voluntario = num(row?.importeVoluntario ?? row?.voluntario ?? row?.donation ?? row?.importe ?? row?.importeDonacion ?? row?.aportacionVoluntaria ?? 0);
    return money(obligatorio + voluntario);
  }
  function panel(rows){
    const paid = rows.filter(isIncomePaid);
    const pending = rows.filter(row => !isIncomePaid(row));
    return {
      count: rows.reduce((a,r) => a + num(r?.numero || r?.num || r?.n || 0), 0),
      importe: money(rows.reduce((a,r) => a + incomeTotal(r), 0)),
      ingresado: money(paid.reduce((a,r) => a + incomeTotal(r), 0)),
      pendiente: money(pending.reduce((a,r) => a + incomeTotal(r), 0))
    };
  }
  function isDonationTicket(value){ return DONATION_TYPES.has(up(value)); }
  function isCurrentExpenseTicket(value){ const t = up(value); return t.includes('GASTOS CORRIENTES') || t.includes('GASTOS DE ORGANIZACION') || t.includes('GASTOS DE ORGANIZACIÓN'); }
  function productPrice(row){
    const prod = byId('productos', row?.productoId || row?.producto_id) || {};
    return num(row?.precio ?? row?.precioCalc ?? row?.precioUnitario ?? prod.defaultPrecio ?? prod.precio ?? 0);
  }
  function purchaseValue(row){
    const direct = num(row?.valor ?? row?.importe ?? '');
    if(direct) return money(direct);
    return money(num(row?.unidades ?? row?.uds ?? row?.cantidad ?? 0) * productPrice(row));
  }

  function recomputeBudget(raw){
    const budget = raw && typeof raw === 'object' ? raw : {};
    const ingresos = rowsForEvent('colaboradores');
    const sociosRows = ingresos.filter(isSocio);
    const noSociosRows = ingresos.filter(row => !isSocio(row));
    const socios = panel(sociosRows);
    const noSocios = panel(noSociosRows);
    const ingresosRealizados = money(socios.ingresado + noSocios.ingresado);
    const ingresosPrevistos = money(socios.importe + noSocios.importe);

    const compras = rowsForEvent('compras');
    const gastoCompras = money(compras.filter(row => {
      const tk = text(row?.ticketDonacion || row?.ticket || '');
      return tk && !isDonationTicket(tk) && !isCurrentExpenseTicket(tk);
    }).reduce((a,r) => a + purchaseValue(r), 0));
    const gastosOrganizacion = money(compras.filter(row => isCurrentExpenseTicket(row?.ticketDonacion || row?.ticket || '')).reduce((a,r) => a + purchaseValue(r), 0));
    const pendiente = money(compras.filter(row => {
      const tk = text(row?.ticketDonacion || row?.ticket || '');
      return !tk && !isDonationTicket(tk);
    }).reduce((a,r) => a + purchaseValue(r), 0));
    const gastosRealizados = money(gastoCompras + gastosOrganizacion);
    const gastosPrevistos = money(gastosRealizados + pendiente);
    const saldoActual = money(ingresosRealizados - gastosRealizados);

    budget.ingresosDinero = budget.ingresosDinero || {};
    budget.ingresosDinero.socios = Object.assign({}, budget.ingresosDinero.socios || {}, socios);
    budget.ingresosDinero.noSocios = Object.assign({}, budget.ingresosDinero.noSocios || budget.ingresosDinero.donantes || {}, noSocios);
    budget.ingresosDinero.donantes = budget.ingresosDinero.noSocios;
    budget.ingresosDinero.totalIngresado = ingresosRealizados;
    budget.ingresosDinero.totalComprometido = ingresosPrevistos;
    budget.ingresosDinero.pendiente = money(socios.pendiente + noSocios.pendiente);

    budget.operativa = budget.operativa || {};
    budget.operativa.ingresos = ingresosPrevistos;
    budget.operativa.ingresoDinero = ingresosRealizados;
    budget.operativa.ingresoRealizado = ingresosRealizados;
    budget.operativa.gastoCompras = gastoCompras;
    budget.operativa.gastosOrganizacion = gastosOrganizacion;
    budget.operativa.gastosRealizados = gastosRealizados;
    budget.operativa.pendiente = pendiente;
    budget.operativa.gastosPrevistos = gastosPrevistos;
    budget.operativa.saldoActual = saldoActual;
    budget.operativa.saldoOperativo = money(ingresosPrevistos - gastosPrevistos);

    budget.compras = budget.compras || {};
    budget.compras.resueltas = gastoCompras;
    budget.compras.gastosCorrientes = gastosOrganizacion;
    budget.compras.pendientes = pendiente;
    budget.compras.saldoReal = saldoActual;
    budget.__ceFix48SaldoActual = {version:VERSION, ingresosRealizados, gastosRealizados, saldoActual};
    return budget;
  }

  function patchBudgetFunction(name){
    const current = getLexical(name);
    if(typeof current !== 'function' || current.__ceFix48SaldoActualRealizado) return false;
    const wrapped = function(){ return recomputeBudget(current.apply(this, arguments) || {}); };
    wrapped.__ceFix48SaldoActualRealizado = true;
    setLexical(name, wrapped);
    return true;
  }

  function patchDomainApi(){
    try{
      const api = window.ControlEventDomain?.api;
      if(api && typeof api.budgetSummary === 'function' && !api.budgetSummary.__ceFix48SaldoActualRealizado){
        const old = api.budgetSummary;
        api.budgetSummary = function(){ return recomputeBudget(old.apply(this, arguments) || {}); };
        api.budgetSummary.__ceFix48SaldoActualRealizado = true;
      }
    }catch(_){ }
    try{
      const calc = window.ControlEventApp?.calculations;
      if(calc && typeof calc.budgetSummary === 'function' && !calc.budgetSummary.__ceFix48SaldoActualRealizado){
        const old = calc.budgetSummary;
        calc.budgetSummary = function(){ return recomputeBudget(old.apply(this, arguments) || {}); };
        calc.budgetSummary.__ceFix48SaldoActualRealizado = true;
      }
    }catch(_){ }
  }

  function wrapRender(name){
    const current = getLexical(name);
    if(typeof current !== 'function' || current.__ceFix48RenderWrapped) return;
    const wrapped = function(){
      const result = current.apply(this, arguments);
      setTimeout(apply, 0);
      return result;
    };
    wrapped.__ceFix48RenderWrapped = true;
    setLexical(name, wrapped);
  }

  function scheduleRender(){
    try{ if(typeof window.renderBudget === 'function') window.renderBudget(); }catch(_){ }
    try{ if(typeof window.renderResumen === 'function') window.renderResumen(); }catch(_){ }
  }

  function apply(){
    patchBudgetFunction('budgetSummary');
    patchDomainApi();
    wrapRender('renderBudget');
    wrapRender('renderResumen');
    try{
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      document.body.dataset.ceVersion = VERSION;
    }catch(_){ }
  }

  apply();
  document.addEventListener('DOMContentLoaded', () => { apply(); setTimeout(scheduleRender, 50); }, {once:true});
  ['controlevent:data-loaded','controlevent:event-changed','controlevent:state-applied'].forEach(ev => window.addEventListener(ev, () => { apply(); setTimeout(scheduleRender, 80); }, true));
  setTimeout(apply, 250);
  setTimeout(apply, 1000);
  window.ControlEventFix48SaldoActual = {version:VERSION, recomputeBudget, apply};
})();
