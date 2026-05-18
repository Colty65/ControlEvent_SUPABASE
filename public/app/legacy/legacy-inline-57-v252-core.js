/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #57. */
/* ==== v25.2: limpieza RESUMEN Excel, zooms donacion y barras ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
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
      'DONACION DE PRODUCTO','DONACIONES DE PRODUCTO','PRESUPUESTO','GASTOS PREVISTOS','GASTOS REALIZADOS',
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
      ['PRESUPUESTO', op.presupuesto, 'white'],
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
