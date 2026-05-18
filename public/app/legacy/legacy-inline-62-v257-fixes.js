/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #62. */
/* ==== v25.9: exportadores Excel aislados y precio referencia editable ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
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
    const gastosRealizados = num(op.gastosRealizados) || num(op.gastoCompras) + num(op.gastosOrganizacion) || sum(compras().filter(c => !isDonation(ticket(c)) && (ticket(c) && !isCurrent(ticket(c)))).map(value));
    const pendiente = num(op.pendiente) || sum(compras().filter(c => !isDonation(ticket(c)) && (!ticket(c) || isCurrent(ticket(c)))).map(value));
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
      else if(!tk || isCurrent(tk)) row.pendiente += v;
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
  async function sourceToData(src){
    const val = norm(src);
    if(!val) return '';
    if(/^data:image\//i.test(val)) return val;
    try{ if(typeof sourceToDataUrl === 'function') return await sourceToDataUrl(val); }catch(_){ }
    try{
      const res = await fetch(val, {cache:'no-store'});
      if(!res.ok) return '';
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
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
      const urls = ['./vendor/exceljs.min.js', 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'];
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
          sort:false, autoFilter:false, pivotTables:false
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
    [['PRESUPUESTO',op.presupuesto,'white'],['GASTOS PREVISTOS',op.gastosPrevistos,'white'],['GASTOS REALIZADOS',op.gastosRealizados,'white'],['PTE. COMPRA U OTROS GASTOS',op.pendiente,'warn'],['SALDO ACTUAL',op.saldoActual,op.saldoActual >= 0 ? 'ok' : 'bad'],['SALDO OPERATIVO',op.saldoOperativo,op.saldoOperativo >= 0 ? 'ok' : 'bad'],['VALORACION DEL EVENTO',op.valoracion,'white']].forEach(([label,val,fill]) => { x.text(wsRes,r,1,label,fill,true,fill==='warn'?'FFBE123C':'FF111827'); x.euro(wsRes,r++,2,val,fill,true); });
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
  function exportSeedSafe(){ return runSafe(exportSeedWorkbookV257, 'Descarga de datos'); }
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
