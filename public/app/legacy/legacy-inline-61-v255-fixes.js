/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #61. */
/* ==== v25.9: cierre modal foto, RESUMEN/GRAFICAS Excel limpios y VALORACION en pantalla ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
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
    if(isGraficasVisibleV255()) renderGraficasV255();
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
    if(tab) [60,160,420].forEach(ms => setTimeout(() => { installGraphV255(); renderGraficasV255(); }, ms));
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
      if(!hasValoracion) renderGraficasV255();
    }
  }, 1200);
  window.__ceV255 = {version:VERSION, apply:applyV255, closePhotoModals:closePhotoModalsV255, graphParts:graphPartsV255, renderGraficas:renderGraficasV255, rebuildResumenSheet:rebuildResumenSheetV255, rebuildGraficasSheet:rebuildGraficasSheetV255};
})();
