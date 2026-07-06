/* ControlEvent v18_prod - hotfix sin cambio visible de versión.
   - INGRESOS: una situación vacía se considera Pendiente, no ingreso realizado.
   - RESUMEN: saldo actual = ingresos realmente ingresados - gastos realizados.
   - Se mantiene v18_prod en pantalla/INFOEVENTO/BACKUP. */
(function(){
  'use strict';
  if(window.__ceV14HotfixResumenCatalogoPlan) return;
  window.__ceV14HotfixResumenCatalogoPlan = true;
  const text = value => String(value ?? '').trim();
  const up = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const num = value => { const n = Number(String(value ?? 0).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  function getLexical(name){ try{ return Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(); }catch(_){ return window[name]; } }
  function setLexical(name, value){ try{ Function('value', name + ' = value;')(value); }catch(_){ } try{ window[name] = value; }catch(_){ } }
  function stateRef(){ return getLexical('state') || window.state || window.ControlEventApp?.state || {}; }
  function arr(name){ const v = stateRef()[name]; return Array.isArray(v) ? v : []; }
  function selectedEventId(){
    try{ const ev = getLexical('selectedEvent')?.(); if(ev?.id) return String(ev.id); }catch(_){ }
    return String(stateRef().selectedEventId || document.getElementById('selectedEvent')?.value || '');
  }
  function byId(list, id){ const sid = String(id || ''); return arr(list).find(x => String(x?.id || '') === sid) || null; }
  function incomeSitu(row){ const s = text(row?.situacion || row?.formaPago || ''); return s || 'Pendiente'; }
  function isIncomePending(row){ return up(incomeSitu(row)) === 'PENDIENTE'; }
  function incomePersona(row){ return row?.persona || byId('personas', row?.personaId) || {}; }
  function isSocio(row){ return up(incomePersona(row)?.rango || row?.rango || row?.personaRango || '') === 'SOCIO'; }
  function selectedEventObj(){ return arr('eventos').find(e => String(e?.id || '') === selectedEventId()) || {}; }
  function eventPrice(){ return num(selectedEventObj().precio || selectedEventObj().price || 0); }
  function incomeTotal(row){
    if(row?.total !== undefined && row?.total !== null && text(row.total) !== '') return num(row.total);
    const numero = num(row?.numero || row?.num || row?.n || 0);
    const obligatorio = isSocio(row) ? numero * eventPrice() : 0;
    const voluntario = num(row?.importeVoluntario ?? row?.voluntario ?? row?.donation ?? row?.importe ?? row?.importeDonacion ?? row?.aportacionVoluntaria ?? 0);
    return obligatorio + voluntario;
  }
  function rowsForEvent(name){ const ev = selectedEventId(); return arr(name).filter(r => String(r?.eventId || r?.event_id || '') === ev); }
  function isDonationTicket(value){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(value)); }
  function isCurrentExpenseTicket(value){ const t = up(value); return t.includes('GASTOS CORRIENTES') || t.includes('GASTOS DE ORGANIZACION') || t.includes('GASTOS DE ORGANIZACIÓN'); }
  function purchasePrice(row){ const p = byId('productos', row?.productoId) || {}; return num(row?.precio ?? row?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function purchaseValue(row){ const direct = num(row?.valor ?? row?.importe ?? ''); if(direct) return direct; return num(row?.unidades ?? row?.uds ?? 0) * purchasePrice(row); }
  function recomputeBudget(b){
    const budget = b && typeof b === 'object' ? b : {};
    const inc = rowsForEvent('colaboradores').map(r => ({...r, situacion: incomeSitu(r), persona: incomePersona(r)}));
    const socios = inc.filter(isSocio);
    const noSocios = inc.filter(r => !isSocio(r));
    const panel = list => ({
      count: list.reduce((a,r)=>a+num(r.numero),0),
      importe: list.reduce((a,r)=>a+incomeTotal(r),0),
      ingresado: list.filter(r => !isIncomePending(r)).reduce((a,r)=>a+incomeTotal(r),0),
      pendiente: list.filter(isIncomePending).reduce((a,r)=>a+incomeTotal(r),0)
    });
    const ps = panel(socios), pn = panel(noSocios);
    budget.ingresosDinero = budget.ingresosDinero || {};
    budget.ingresosDinero.socios = Object.assign({}, budget.ingresosDinero.socios || {}, ps);
    budget.ingresosDinero.noSocios = Object.assign({}, budget.ingresosDinero.noSocios || budget.ingresosDinero.donantes || {}, pn);
    budget.ingresosDinero.donantes = budget.ingresosDinero.noSocios;
    budget.ingresosDinero.totalIngresado = ps.ingresado + pn.ingresado;
    budget.ingresosDinero.totalComprometido = ps.importe + pn.importe;
    budget.ingresosDinero.pendiente = ps.pendiente + pn.pendiente;

    const compras = rowsForEvent('compras');
    const gastoCompras = compras.filter(r => { const tk = text(r.ticketDonacion || r.ticket || ''); return tk && !isDonationTicket(tk) && !isCurrentExpenseTicket(tk); }).reduce((a,r)=>a+purchaseValue(r),0);
    const gastosOrganizacion = compras.filter(r => isCurrentExpenseTicket(r.ticketDonacion || r.ticket || '')).reduce((a,r)=>a+purchaseValue(r),0);
    const pendiente = compras.filter(r => !isDonationTicket(r.ticketDonacion || r.ticket || '') && !text(r.ticketDonacion || r.ticket || '')).reduce((a,r)=>a+purchaseValue(r),0);
    const ingresosRealizados = budget.ingresosDinero.totalIngresado;
    const ingresosPrevistos = budget.ingresosDinero.totalComprometido;
    budget.operativa = budget.operativa || {};
    budget.operativa.ingresos = ingresosPrevistos;
    budget.operativa.ingresoDinero = ingresosRealizados;
    budget.operativa.gastoCompras = gastoCompras;
    budget.operativa.gastosOrganizacion = gastosOrganizacion;
    budget.operativa.gastosRealizados = gastoCompras + gastosOrganizacion;
    budget.operativa.pendiente = pendiente;
    budget.operativa.gastosPrevistos = gastoCompras + gastosOrganizacion + pendiente;
    budget.operativa.saldoActual = ingresosRealizados - budget.operativa.gastosRealizados;
    budget.operativa.saldoOperativo = ingresosPrevistos - budget.operativa.gastosPrevistos;
    budget.compras = budget.compras || {};
    budget.compras.saldoReal = budget.operativa.saldoActual;
    return budget;
  }
  function patchCollabs(){
    const old = getLexical('collabsForEvent');
    if(typeof old !== 'function' || old.__ceV14BlankPending) return;
    const wrapped = function(){ return (old.apply(this, arguments) || []).map(r => ({...r, situacion: incomeSitu(r)})); };
    wrapped.__ceV14BlankPending = true;
    setLexical('collabsForEvent', wrapped);
  }
  function patchBudget(){
    const old = getLexical('budgetSummary');
    if(typeof old !== 'function' || old.__ceV14SaldoActualBlankPending) return;
    const wrapped = function(){ return recomputeBudget(old.apply(this, arguments) || {}); };
    wrapped.__ceV14SaldoActualBlankPending = true;
    setLexical('budgetSummary', wrapped);
  }
  function apply(){ patchCollabs(); patchBudget(); }
  apply();
  document.addEventListener('DOMContentLoaded', apply, {once:true});
  window.addEventListener('controlevent:data-loaded', apply, true);
  window.addEventListener('controlevent:event-changed', apply, true);
  setTimeout(apply, 500);
})();
