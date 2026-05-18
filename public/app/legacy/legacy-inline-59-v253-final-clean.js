/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #59. */
/* ==== v25.9 hotfix: RESUMEN Excel limpio y DONACION DE PRODUCTO separada ==== */
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
    writeLabelValue(ws, r++, 'PRESUPUESTO', op.presupuesto, {money:true, bold:true});
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
  setInterval(applyDonationTipsFinal, 1800);
  window.__ceV253Final = {apply: applyFinal, applyDonationTips: applyDonationTipsFinal, rebuildResumenSheet};
})();
