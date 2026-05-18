/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #60. */
/* ==== v25.9: graficas con VALORACION y donacion de producto por categoria ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
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
    const saldoOperativoItems = [{label:'Saldo operativo', value:Math.abs(op.saldoOperativo), displayValue:op.saldoOperativo, color:op.saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[`SALDO OPERATIVO = presupuesto - gastos previstos`, `${money(op.saldoOperativo)} = ${money(op.presupuesto)} - ${money(op.gastosPrevistos)}`]}];
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
      if((typeof currentMainTab !== 'undefined' && currentMainTab === 'graficas') || !$('tabGraficas')?.classList.contains('hidden')) renderGraficasV254();
    }catch(_){ }
  }, ms));
  setInterval(applyDonationTipsV254, 1800);
  window.__ceV254 = {version: VERSION, apply: applyV254, graphParts: graphPartsV254, renderGraficas: renderGraficasV254, makeChartImageDataUrl: makeChartImageDataUrlV254, rebuildGraficasSheet: rebuildGraficasSheetV254, applyDonationTips: applyDonationTipsV254};
})();
