/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #58. */
/* ==== v25.9: cabeceras RESUMEN, donaciones especificas y foto+ticket ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
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
    if(priceRow){
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
