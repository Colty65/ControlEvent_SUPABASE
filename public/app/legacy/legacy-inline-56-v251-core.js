/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #56. */
/* ==== v25.1: operativa, zooms y RESUMEN Excel ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
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
      presupuesto: [`PRESUPUESTO = ingresos realizados + pendiente de ingresar`, `${money(op.presupuesto)} = ${money(op.ingresoRealizado)} + ${money(op.ingresoPendiente)}`],
      gastosPrevistos: [`GASTOS PREVISTOS = gastos realizados + pte. compra u otros gastos`, `${money(op.gastosPrevistos)} = ${money(op.gastosRealizados)} + ${money(op.pendiente)}`, '', 'Detalle previsto', ...listLines('realizadas'), ...listLines('corrientes'), ...listLines('pendientes')],
      gastosRealizados: [`GASTOS REALIZADOS = tickets + gastos corrientes`, `${money(op.gastosRealizados)} = ${money(op.gastoCompras)} + ${money(op.gastosOrganizacion)}`, '', 'Tickets', ...listLines('realizadas'), '', 'Gastos corrientes', ...listLines('corrientes')],
      pendiente: [`PTE. COMPRA U OTROS GASTOS`, `TOTAL: ${money(op.pendiente)}`, '', 'Ticket | Tienda | Producto | Uds | Precio | Total', ...listLines('pendientes')],
      saldoActual: [`SALDO ACTUAL = ingresos realizados - gastos realizados`, `${money(op.saldoActual)} = ${money(op.ingresoRealizado)} - ${money(op.gastosRealizados)}`],
      saldoOperativo: [`SALDO OPERATIVO = presupuesto - gastos previstos`, `${money(op.saldoOperativo)} = ${money(op.presupuesto)} - ${money(op.gastosPrevistos)}`],
      valoracion: [`VALORACION DEL EVENTO = gastos previstos + valor producto donado`, `${money(op.valoracionEvento)} = ${money(op.gastosPrevistos)} + ${money(op.valorDonado)}`]
    };
    return `OPERATIVA / ${label}\n${(lines[label] || []).join('\n')}`;
  }
  function renderOperativeRows(op){
    const saldoColor = v => num(v) >= 0 ? '#047857' : '#b91c1c';
    const row = (label, value, key, cls, amountStyle = '') =>
      `<div class="budget-row ${cls || ''}" data-v251-op="${key}"><strong>${esc(label)}</strong><span style="${amountStyle}">${esc(money(value))}</span></div>`;
    return [
      row('PRESUPUESTO', op.presupuesto, 'presupuesto', 'ce-v251-op-black'),
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
          <h3>INGRESOS EN DINERO</h3>
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
      ['PRESUPUESTO', op.presupuesto, 'white'],
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
