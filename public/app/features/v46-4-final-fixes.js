/* ControlEvent v9.6_prod - ajustes finales sobre v45.4 estable.
   - Edición/borrado sin saltar al principio, con marca visual discreta y destrucción animada.
   - Exportación INFOEVENTO/BACKUP con guardia antirrecursión.
   - GRAFICAS: SALDO ACTUAL, SALDO OPERATIVO y VALORACION DEL EVENTO con globos detallados y cabeceras ordenadas.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v9.6_prod';
  const VERSION_FILE = 'ControlEvent_v9_6_prod';
  const WINDOWS_BLUE = '#0078d4';
  const BLOCK_MSG = 'No es posible, tiene dependencias.';
  const INSTALLED = '__ceV464FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const upper = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const cssEsc = v => { try{ return window.CSS?.escape ? CSS.escape(String(v ?? '')) : String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v ?? '').replace(/"/g,'\\"'); } };
  const esc = v => {
    try{ return (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    catch(_){ return String(v ?? ''); }
  };
  const moneyF = v => {
    try{ return (typeof money === 'function') ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
    catch(_){ return `${Number(v||0).toFixed(2)} €`; }
  };
  function st(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ if(window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  function role(){
    try{ if(typeof authUser !== 'undefined' && authUser) return upper(authUser.nivel); }catch(_){ }
    return upper(window.authUser?.nivel || window.ControlEventApp?.authUser?.nivel || '');
  }
  const isGD = () => role() === 'GD';
  const isRW = () => role() === 'RW';
  const canWrite = () => isGD() || isRW();
  function selectedId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ }
    return String(st().selectedEventId || '');
  }
  function selectedEv(){
    const id = selectedId();
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return ev; }catch(_){ }
    return arr('eventos').find(e => same(e.id, id)) || null;
  }
  function isLockedSafe(){ try{ return typeof isLocked === 'function' ? !!isLocked() : upper(selectedEv()?.situacion) === 'FINALIZADO'; }catch(_){ return false; } }
  function parseEuro(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').trim().replace(/\s/g,'').replace(/€/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function getVal(action,id){
    const el = document.querySelector(`[data-action="${cssEsc(action)}"][data-id="${cssEsc(id)}"]`);
    return el ? el.value : '';
  }
  function byId(list,id){ return arr(list).find(x => same(x?.id, id)) || null; }
  function personaBy(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id) || {}; }catch(_){ return byId('personas', id) || {}; } }
  function productoBy(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id) || {}; }catch(_){ return byId('productos', id) || {}; } }
  function tiendaBy(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id) || {}; }catch(_){ return byId('tiendas', id) || {}; } }
  function productName(id){ return productoBy(id).nombre || ''; }
  function personName(id){ return personaBy(id).nombre || ''; }
  function storeName(id){ return tiendaBy(id).nombre || ''; }
  function isDonation(ticket){ try{ return typeof isDonationTicket === 'function' ? isDonationTicket(ticket) : ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(upper(ticket)); }catch(_){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(upper(ticket)); } }
  function isCurrentExpense(ticket){ try{ return typeof isCurrentExpenseTicket === 'function' ? isCurrentExpenseTicket(ticket) : upper(ticket).includes('GASTOS CORRIENTES'); }catch(_){ return upper(ticket).includes('GASTOS CORRIENTES'); } }
  function qtyF(row){
    const n = Number(row?.unidades || 0);
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(n); }catch(_){ return String(n); }
  }
  function unitPriceFor(row){ const p = productoBy(row?.productoId); return parseEuro(row?.precio ?? row?.precioCalc ?? row?.defaultPrecio ?? p.defaultPrecio ?? p.precio ?? 0); }
  function rowValue(row){
    const direct = row?.importe ?? row?.valor ?? row?.total;
    if(direct !== undefined && direct !== null && direct !== ''){
      const n = parseEuro(direct);
      if(Number.isFinite(n) && n !== 0) return n;
    }
    return Number(row?.unidades || 0) * unitPriceFor(row);
  }
  function donorName(row){
    const raw = norm(row?.donorRef || row?.donante || row?.donanteNombre || '');
    if(row?.donorLabel) return norm(row.donorLabel);
    if(raw){
      try{ if(typeof donorLabel === 'function'){ const d = norm(donorLabel(raw)); if(d) return d; } }catch(_){ }
      const parts = raw.split(':');
      if(parts.length >= 2){
        const kind = upper(parts[0]); const id = parts.slice(1).join(':');
        if(kind === 'P' || kind === 'PERSONA') return personName(id) || raw;
        if(kind === 'T' || kind === 'TIENDA') return storeName(id) || raw;
      }
      return personName(raw) || storeName(raw) || raw;
    }
    return storeName(row?.tiendaId) || '';
  }
  function collabRows(){
    try{ const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : null; if(Array.isArray(rows)) return rows.slice(); }catch(_){ }
    const ev = selectedEv(); const eventId = selectedId(); const price = parseEuro(ev?.precio || 0);
    return arr('colaboradores').filter(r => same(r.eventId, eventId)).map(r => {
      const persona = personaBy(r.personaId);
      const base = price * Number(r.numero || 0);
      const importe = parseEuro(r.importe || r.importeVoluntario || 0);
      return {...r, persona, base, total:base + importe};
    });
  }
  function comprasRows(){
    try{ const rows = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(rows)) return rows.slice(); }catch(_){ }
    const id = selectedId();
    return arr('compras').filter(r => same(r.eventId, id)).map(r => ({...r, producto:productoBy(r.productoId), tienda:tiendaBy(r.tiendaId), responsable:personaBy(r.responsableId)}));
  }
  function incomeTotal(row){
    if(row?.total !== undefined) return parseEuro(row.total);
    const ev = selectedEv();
    return parseEuro(ev?.precio || 0) * Number(row?.numero || 0) + parseEuro(row?.importe || row?.importeVoluntario || 0);
  }
  const sum = values => values.reduce((a,b) => a + Number(b || 0), 0);

  function injectStyle(){
    if($('ceV464FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV464FinalStyle';
    style.textContent = `
      .ce-v46-modified{font-weight:900!important;transition:font-weight .20s ease;}
      .ce-v46-modified,.ce-v46-modified *{font-weight:900!important;}
      .ce-v46-modified input,.ce-v46-modified select,.ce-v46-modified textarea{font-weight:900!important;}
      .ce-v46-deleting{animation:ceV46Destroy 1.5s ease-in forwards!important;overflow:hidden!important;pointer-events:none!important;transform-origin:center;}

      .ce-ingreso-receipt-tools-v463{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;grid-column:1/-1;}
      .ce-ingreso-receipt-tools-v463 .ce-receipt-ok{font-weight:900;color:#065f46;background:#d1fae5;border:1px solid #34d399;border-radius:999px;padding:4px 9px;font-size:12px;}
      .ce-ingreso-receipt-tools-v463 button{min-height:30px;}
      .ce-receipt-modal-v463{position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:999999;display:flex;align-items:center;justify-content:center;padding:18px;}
      .ce-receipt-modal-card-v463{max-width:min(980px,96vw);max-height:92vh;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.42);padding:12px;display:flex;flex-direction:column;gap:10px;}
      .ce-receipt-modal-head-v463{display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:950;color:#0f172a;}
      .ce-receipt-modal-card-v463 img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:12px;background:#f8fafc;}
      @keyframes ceV46Destroy{0%{opacity:1;transform:scale(1) rotate(0);filter:none;max-height:420px;}18%{transform:scale(1.012) rotate(.35deg);filter:contrast(1.1);}42%{transform:scale(.985) rotate(-.35deg);background:#111827;color:#fff;}72%{opacity:.38;transform:scale(.94) rotate(.65deg);max-height:420px;}100%{opacity:0;transform:scale(.82) rotate(-1.3deg);max-height:0;margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;border-width:0;}}
      .ce-v46-pies{grid-template-columns:repeat(2,minmax(0,1fr));}
      @media(min-width:1180px){.ce-v46-pies{grid-template-columns:repeat(3,minmax(0,1fr));}}
      #ceTooltipV21.ce-v21-layout-metricv460,#ceTooltipV21.ce-v21-layout-metricv460 *{color:#fff!important;}
      #ceTooltipV21.ce-v21-layout-metricv460{border-color:rgba(255,255,255,.38)!important;box-shadow:0 18px 50px rgba(0,0,0,.32)!important;}
      #ceTooltipV21.ce-v21-layout-metricv460 .ce-v21-table{border-collapse:separate;border-spacing:0 4px;width:max-content;max-width:min(940px,calc(100vw - 48px));}
      #ceTooltipV21.ce-v21-layout-metricv460 .ce-v21-table td{font-weight:750!important;white-space:nowrap!important;padding:3px 7px!important;}
      #ceTooltipV21.ce-v21-layout-metricv460 .ce-v21-table tr:first-child td{font-weight:950!important;background:rgba(255,255,255,.20)!important;}
      #ceTooltipV21.ce-v21-layout-metricv460 .ce-v21-table td:last-child{text-align:right!important;font-variant-numeric:tabular-nums;font-weight:950!important;}
      #ceTooltipV21.ce-v21-layout-metricv460 .ce-v21-title{font-weight:950!important;margin-top:5px!important;}
      #ceTooltipV21.ce-v21-layout-metricv460 strong{color:#fff!important;}
      #ceTooltipV21.ce-v21-layout-chart .ce-v21-table,
      #ceTooltipV21.ce-v21-layout-metricv460 .ce-v21-table{border-collapse:separate!important;border-spacing:0 4px!important;width:max-content!important;max-width:min(980px,calc(100vw - 48px))!important;}
      #ceTooltipV21.ce-v21-layout-chart .ce-v21-table td,
      #ceTooltipV21.ce-v21-layout-metricv460 .ce-v21-table td{white-space:nowrap!important;vertical-align:top!important;padding:3px 7px!important;font-variant-numeric:tabular-nums;}
      #ceTooltipV21.ce-v21-layout-chart .ce-v21-table tr:first-child td,
      #ceTooltipV21.ce-v21-layout-metricv460 .ce-v21-table tr:first-child td{font-weight:950!important;background:rgba(255,255,255,.38)!important;}
      #ceTooltipV21.ce-v21-layout-chart .ce-v21-table td:last-child,
      #ceTooltipV21.ce-v21-layout-metricv460 .ce-v21-table td:last-child{text-align:right!important;font-weight:950!important;}
      #ceTooltipV21.ce-v462-tip-open{animation:ceV462TipIn .24s cubic-bezier(.2,.9,.2,1) both!important;transform-origin:top left;}
      #ceTooltipV21.ce-v462-tip-hide{animation:ceV462TipOut .34s ease-in both!important;transform-origin:center;}
      @keyframes ceV462TipIn{0%{opacity:0;transform:translateY(10px) scale(.96);filter:blur(2px);}65%{opacity:1;transform:translateY(-2px) scale(1.01);filter:blur(0);}100%{opacity:1;transform:translateY(0) scale(1);filter:none;}}
      @keyframes ceV462TipOut{0%{opacity:1;transform:scale(1) rotate(0);filter:none;}35%{transform:scale(.985) rotate(.3deg);filter:contrast(1.1);}100%{opacity:0;transform:scale(.82) rotate(-1deg);filter:blur(1px);}}
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; }catch(_){ }
    try{ window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV461Version){
        const oldClick = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return oldClick.apply(this, arguments);
        };
        wrapped.__ceV461Version = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }

  function saveNow(){ try{ if(typeof saveState === 'function') return saveState(); }catch(_){ } try{ return window.saveState?.(); }catch(_){ } }
  function renderNow(){ try{ if(typeof render === 'function') return render(); }catch(_){ } try{ return window.render?.(); }catch(_){ } }
  function captureScroll(){
    const data = {x:window.scrollX || 0, y:window.scrollY || 0, els:[]};
    ['mainTabs','collabList','comprasList','donacionesList','personasList','eventosList','tiendasList','productosList','accesoList','maintenanceWrapper'].forEach(id => { const el=$(id); if(el) data.els.push([id, el.scrollLeft || 0, el.scrollTop || 0]); });
    return data;
  }
  function restoreScroll(data){
    if(!data) return;
    const run = () => {
      try{ window.scrollTo(data.x || 0, data.y || 0); }catch(_){ }
      (data.els || []).forEach(([id,l,t]) => { const el=$(id); if(el){ try{ el.scrollLeft = l; el.scrollTop = t; }catch(_){ } } });
    };
    run(); requestAnimationFrame(run); setTimeout(run, 40); setTimeout(run, 160);
  }
  const modifiedRecords = new Map();
  function cardFor(action,id){
    const sid = String(id ?? '');
    const safe = cssEsc(sid);
    const candidates = [
      `button[data-action="${cssEsc(action)}"][data-id="${safe}"]`,
      `[data-action][data-id="${safe}"]`,
      `#compraRow_${safe}`,
      `#donacionRow_${safe}`,
      `#collabRow_${safe}`,
      `[data-record-id="${safe}"]`,
      `[data-id="${safe}"]`
    ];
    for(const sel of candidates){
      try{
        const el = document.querySelector(sel);
        const card = el?.closest?.('.itemcard,.summary-card,.card,.rowline,tr,li,[data-record-id],[data-id],.access-user-card,.maintenance-card') || el;
        if(card) return card;
      }catch(_){ }
    }
    return null;
  }
  function applyModifiedMarks(){
    modifiedRecords.forEach((action,id) => {
      const card = cardFor(action,id);
      if(!card) return;
      card.classList.add('ce-v46-modified');
      card.querySelectorAll('input,select,textarea,span,strong,label,button,td,div').forEach(el => {
        try{ el.style.fontWeight = '900'; }catch(_){ }
      });
    });
  }
  function markModified(action,id, scroll){
    modifiedRecords.set(String(id ?? ''), action);
    restoreScroll(scroll);
    const run = () => {
      applyModifiedMarks();
      const card = cardFor(action,id);
      if(card){ try{ card.scrollIntoView({block:'nearest', inline:'nearest'}); }catch(_){ } }
      restoreScroll(scroll);
    };
    setTimeout(run, 40);
    setTimeout(run, 140);
    setTimeout(run, 420);
  }
  function finishModify(action,id, scroll){
    saveNow(); renderNow(); applyVersion(); markModified(action,id, scroll);
  }
  function stop(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } return false; }
  function block(ev,msg){ stop(ev); if(msg) alert(msg); return false; }

  function dependencies(action,id){
    const sid = String(id ?? ''); const deps=[];
    if(!sid) return deps;
    if(action === 'delete-persona'){
      const ingresos = arr('colaboradores').filter(c => same(c.personaId, sid));
      const compras = arr('compras').filter(c => same(c.responsableId, sid) || String(c.donorRef || '') === `P:${sid}` || same(c.personaId, sid));
      if(ingresos.length) deps.push(`ingresos: ${ingresos.length}`);
      if(compras.length) deps.push(`compras/donaciones: ${compras.length}`);
    }else if(action === 'delete-producto'){
      const compras = arr('compras').filter(c => same(c.productoId, sid));
      if(compras.length) deps.push(`compras/donaciones: ${compras.length}`);
    }else if(action === 'delete-tienda'){
      const productos = arr('productos').filter(p => same(p.tiendaId, sid) || same(p.defaultTiendaId, sid));
      const compras = arr('compras').filter(c => same(c.tiendaId, sid) || same(c.storeId, sid) || String(c.donorRef || '') === `T:${sid}`);
      if(productos.length) deps.push(`productos: ${productos.length}`);
      if(compras.length) deps.push(`compras/donaciones: ${compras.length}`);
    }
    return deps;
  }
  function deleteAfterAnimation(btn, ev, mutate){
    stop(ev);
    const scroll = captureScroll();
    const card = btn.closest?.('.itemcard,.rowline,.card');
    if(card){
      card.querySelectorAll('button,input,select,textarea').forEach(el => { try{ el.disabled = true; }catch(_){ } });
      card.classList.add('ce-v46-deleting');
    }
    setTimeout(() => { mutate(); saveNow(); renderNow(); applyVersion(); restoreScroll(scroll); }, card ? 1500 : 0);
    return false;
  }

  function savePersona(btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para modificar.');
    const id = btn.dataset.id; const p = byId('personas', id); if(!p) return block(ev, 'No se encuentra la persona.');
    const nombre = norm(getVal('edit-persona-nombre', id)); if(!nombre) return block(ev, 'El nombre no puede estar vacío.');
    const scroll = captureScroll(); stop(ev);
    p.nombre = nombre; p.rango = getVal('edit-persona-rango', id) || p.rango;
    finishModify('save-persona', id, scroll);
    return false;
  }
  function saveTienda(btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para modificar.');
    const id = btn.dataset.id; const t = byId('tiendas', id); if(!t) return block(ev, 'No se encuentra la tienda.');
    const nombre = norm(getVal('edit-tienda-nombre', id)); if(!nombre) return block(ev, 'El nombre no puede estar vacío.');
    const scroll = captureScroll(); stop(ev); t.nombre = nombre; finishModify('save-tienda', id, scroll); return false;
  }
  function saveProducto(btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para modificar.');
    const id = btn.dataset.id; const p = byId('productos', id); if(!p) return block(ev, 'No se encuentra el producto.');
    const nombre = norm(getVal('edit-producto-nombre', id)); if(!nombre) return block(ev, 'El nombre no puede estar vacío.');
    const scroll = captureScroll(); stop(ev);
    p.nombre = nombre;
    p.segmento = getVal('edit-producto-segmento', id) || p.segmento;
    p.destino = getVal('edit-producto-destino', id) || p.destino;
    const priceVal = getVal('edit-producto-precio', id); if(priceVal !== ''){ const price = parseEuro(priceVal); p.precio = price; p.defaultPrecio = price; }
    const tiendaVal = getVal('edit-producto-tienda', id); if(tiendaVal !== '') p.tiendaId = tiendaVal || '';
    finishModify('save-producto', id, scroll); return false;
  }
  function saveEvento(btn, ev){
    if(!isGD()) return block(ev, 'Solo GD puede modificar eventos.');
    const id = btn.dataset.id; const e = byId('eventos', id); if(!e) return block(ev, 'No se encuentra el evento.');
    const scroll = captureScroll(); stop(ev);
    if(isLockedSafe()){
      e.situacion = getVal('edit-evento-situacion', id) || e.situacion;
    }else{
      e.titulo = norm(getVal('edit-evento-titulo', id));
      e.precio = parseEuro(getVal('edit-evento-precio', id));
      e.fechaIni = norm(getVal('edit-evento-fechaini', id));
      e.fechaFin = norm(getVal('edit-evento-fechafin', id));
      e.descripcion = norm(getVal('edit-evento-descripcion', id));
      e.situacion = getVal('edit-evento-situacion', id) || e.situacion;
    }
    finishModify('save-evento', id, scroll); return false;
  }
  function saveCollab(btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para modificar.');
    if(isLockedSafe()) return block(ev, 'Evento finalizado. No se puede modificar.');
    const id = btn.dataset.id; const c = arr('colaboradores').find(x => same(x.id, id)); if(!c) return block(ev, 'No se encuentra el ingreso.');
    const scroll = captureScroll(); stop(ev);
    c.personaId = getVal('edit-collab-persona', id) || c.personaId;
    c.numero = Number(getVal('edit-collab-numero', id) || 0);
    c.situacion = getVal('edit-collab-situacion', id) || c.situacion;
    c.importe = parseEuro(getVal('edit-collab-importe', id));
    finishModify('save-collab', id, scroll); return false;
  }
  function saveCompra(btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para modificar.');
    if(isLockedSafe()) return block(ev, 'Evento finalizado. No se puede modificar.');
    const id = btn.dataset.id; const c = arr('compras').find(x => same(x.id, id)); if(!c) return block(ev, 'No se encuentra el registro.');
    const scroll = captureScroll(); stop(ev);
    c.productoId = getVal('edit-compra-producto', id) || c.productoId;
    c.unidades = Number(getVal('edit-compra-unidades', id) || 0);
    const precioCompra = getVal('edit-compra-precio', id); if(precioCompra !== '') c.precio = parseEuro(precioCompra);
    c.ticketDonacion = getVal('edit-compra-ticket', id);
    c.tiendaId = getVal('edit-compra-tienda', id) || '';
    c.responsableId = getVal('edit-compra-responsable', id) || '';
    finishModify('save-compra', id, scroll); return false;
  }
  function saveDonacion(btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para modificar.');
    if(isLockedSafe()) return block(ev, 'Evento finalizado. No se puede modificar.');
    const id = btn.dataset.id; const c = arr('compras').find(x => same(x.id, id)); if(!c) return block(ev, 'No se encuentra la donación.');
    const scroll = captureScroll(); stop(ev);
    c.productoId = getVal('edit-donacion-producto', id) || c.productoId;
    c.unidades = Number(getVal('edit-donacion-unidades', id) || 0);
    const precioDon = getVal('edit-donacion-precio', id); if(precioDon !== '') c.precio = parseEuro(precioDon);
    c.ticketDonacion = getVal('edit-donacion-ticket', id);
    c.donorRef = getVal('edit-donacion-donante', id) || '';
    c.responsableId = getVal('edit-donacion-responsable', id) || '';
    finishModify('save-donacion', id, scroll); return false;
  }
  function deleteGeneral(action, kind, btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para eliminar registros de mantenimiento.');
    const id = btn.dataset.id;
    if(dependencies(action,id).length) return block(ev, BLOCK_MSG);
    return deleteAfterAnimation(btn, ev, () => { st()[kind] = arr(kind).filter(x => !same(x.id, id)); });
  }
  function deleteEvento(btn, ev){
    if(!isGD()) return block(ev, 'Solo GD puede eliminar eventos.');
    const eventId = btn.dataset.id; const event = byId('eventos', eventId); if(!event) return block(ev, 'No se encuentra el evento.');
    stop(ev);
    const compras = arr('compras').filter(c => same(c.eventId, eventId));
    const ingresos = arr('colaboradores').filter(c => same(c.eventId, eventId));
    const imgs = Object.keys(st().ticketImages || {}).filter(k => String(k).startsWith(`${eventId}|`));
    const msg = ['ATENCIÓN: baja definitiva de EVENTO.','',`Evento: ${event.titulo || 'sin título'}`,'','Se eliminará:',`• El propio evento.`,`• Ingresos/colaboradores del evento: ${ingresos.length}`,`• Compras/donaciones del evento: ${compras.length}`,`• Imágenes de tickets del evento: ${imgs.length}`,'','No se eliminarán PERSONAS, PRODUCTOS ni TIENDAS generales.','','¿Quieres continuar?'].join('\n');
    if(!confirm(msg)) return false;
    if(!confirm(`Confirmación final: ¿eliminar definitivamente el evento "${event.titulo || ''}" y sus datos dependientes?`)) return false;
    return deleteAfterAnimation(btn, ev, () => {
      st().eventos = arr('eventos').filter(e => !same(e.id, eventId));
      st().colaboradores = arr('colaboradores').filter(c => !same(c.eventId, eventId));
      st().compras = arr('compras').filter(c => !same(c.eventId, eventId));
      if(st().ticketImages) imgs.forEach(k => { delete st().ticketImages[k]; });
      if(same(st().selectedEventId, eventId)) st().selectedEventId = arr('eventos')[0]?.id || '';
    });
  }
  function deleteCollab(btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para eliminar.');
    if(isLockedSafe()) return block(ev, 'Evento finalizado. No se puede eliminar.');
    const id = btn.dataset.id;
    return deleteAfterAnimation(btn, ev, () => { deleteIngresoReceipt(id); st().colaboradores = arr('colaboradores').filter(c => !same(c.id, id)); });
  }
  function deleteCompra(btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para eliminar.');
    if(isLockedSafe()) return block(ev, 'Evento finalizado. No se puede eliminar.');
    const id = btn.dataset.id;
    return deleteAfterAnimation(btn, ev, () => { st().compras = arr('compras').filter(c => !same(c.id, id)); });
  }
  function deleteDonacion(btn, ev){
    if(!canWrite()) return block(ev, 'No autorizado para eliminar.');
    if(isLockedSafe()) return block(ev, 'Evento finalizado. No se puede eliminar.');
    const id = btn.dataset.id;
    return deleteAfterAnimation(btn, ev, () => { st().compras = arr('compras').filter(c => !same(c.id, id)); });
  }

  function ingresoReceiptKey(id){ return `${selectedId()}|INGRESO:${String(id || '')}`; }
  function ingresoReceiptStore(){ const stateObj = st(); if(!stateObj.ticketImages || typeof stateObj.ticketImages !== 'object') stateObj.ticketImages = {}; return stateObj.ticketImages; }
  function ingresoReceiptData(id){ return ingresoReceiptStore()[ingresoReceiptKey(id)] || ''; }
  function setIngresoReceipt(id, data){ ingresoReceiptStore()[ingresoReceiptKey(id)] = data; }
  function deleteIngresoReceipt(id){ try{ delete ingresoReceiptStore()[ingresoReceiptKey(id)]; }catch(_){ } }
  function readImageAsDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }
  function showIngresoReceipt(id){
    const data = ingresoReceiptData(id);
    if(!data){ alert('Este ingreso no tiene justificante adjunto.'); return; }
    const ov = document.createElement('div');
    ov.className = 'ce-receipt-modal-v463';
    ov.innerHTML = `<div class="ce-receipt-modal-card-v463"><div class="ce-receipt-modal-head-v463"><span>Justificante de ingreso</span><button type="button" class="outline small" data-close="1">Cerrar</button></div><img alt="Justificante de ingreso" src="${esc(data)}"></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if(e.target === ov || e.target?.closest?.('[data-close]')) ov.remove(); });
  }
  function addIngresoReceiptTools(){
    return;
    const wrap = $('collabList'); if(!wrap) return;
    wrap.querySelectorAll('.itemcard,.rowline,.card').forEach(card => {
      const id = card.querySelector('[data-action="save-collab"][data-id], [data-action="edit-collab-persona"][data-id], [data-action="delete-collab"][data-id]')?.dataset?.id;
      if(!id || card.querySelector('.ce-ingreso-receipt-tools-v463')) return;
      const has = !!ingresoReceiptData(id);
      const box = document.createElement('div');
      box.className = 'ce-ingreso-receipt-tools-v463';
      box.innerHTML = `${has ? '<span class="ce-receipt-ok">📎 Justificante adjunto</span>' : ''}<button type="button" class="outline small" data-action="ingreso-receipt-add" data-id="${esc(id)}">${has ? 'Cambiar justificante' : 'Adjuntar justificante'}</button>${has ? `<button type="button" class="outline small" data-action="ingreso-receipt-view" data-id="${esc(id)}">Ver justificante</button><button type="button" class="danger small" data-action="ingreso-receipt-delete" data-id="${esc(id)}">Eliminar justificante</button>` : ''}`;
      const actions = card.querySelector('button[data-action="save-collab"]')?.parentElement || card;
      try{ actions.appendChild(box); }catch(_){ card.appendChild(box); }
    });
  }
  async function addIngresoReceipt(id){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.style.position = 'fixed'; input.style.left = '-9999px';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      try{
        const file = input.files && input.files[0];
        if(!file) return;
        const data = await readImageAsDataUrl(file);
        setIngresoReceipt(id, data);
        saveNow();
        renderNow();
        applyVersion();
        setTimeout(addIngresoReceiptTools, 80);
      }catch(error){ alert('No se pudo adjuntar el justificante. ' + (error?.message || error)); }
      finally{ input.remove(); }
    }, {once:true});
    input.click();
  }
  function handleIngresoReceiptClick(ev){
    const btn = ev.target?.closest?.('[data-action="ingreso-receipt-add"],[data-action="ingreso-receipt-view"],[data-action="ingreso-receipt-delete"]');
    if(!btn) return;
    const id = btn.dataset.id;
    if(btn.dataset.action === 'ingreso-receipt-view'){ stop(ev); showIngresoReceipt(id); return false; }
    if(!canWrite()) return block(ev, 'No autorizado para modificar justificantes.');
    if(isLockedSafe()) return block(ev, 'Evento finalizado. No se puede modificar.');
    if(btn.dataset.action === 'ingreso-receipt-add'){ stop(ev); addIngresoReceipt(id); return false; }
    if(btn.dataset.action === 'ingreso-receipt-delete'){
      stop(ev);
      if(confirm('¿Eliminar el justificante de este ingreso?')){ deleteIngresoReceipt(id); saveNow(); renderNow(); applyVersion(); setTimeout(addIngresoReceiptTools, 80); }
      return false;
    }
  }

  function accessRenderNow(){
    try{ if(typeof renderAcceso === 'function') renderAcceso(); }catch(_){ }
    try{ if(typeof renderPermissions === 'function') renderPermissions(); }catch(_){ }
    try{ if(typeof renderMaintenanceTabs === 'function') renderMaintenanceTabs(); }catch(_){ }
  }
  async function saveAcceso(btn, ev){
    if(!isGD()) return block(ev, 'Solo GD puede mantener ACCESO.');
    const oldId = norm(btn.dataset.id || '');
    const identificacion = norm(getVal('edit-acceso-identificacion', oldId) || oldId);
    const nombre = norm(getVal('edit-acceso-nombre', oldId));
    const nivel = upper(getVal('edit-acceso-nivel', oldId) || 'RO') || 'RO';
    const clave = String(getVal('edit-acceso-clave', oldId) || '');
    if(!identificacion || !nombre){ return block(ev, 'Identificación y nombre son obligatorios.'); }
    const scroll = captureScroll(); stop(ev);
    try{
      const payload = {identificacion, nombre, nivel, existingId: oldId};
      if(clave) payload.clave = clave;
      const res = await fetch('/api/access-users', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      const data = await res.json().catch(() => ({}));
      if(!res.ok || !data.ok) throw new Error(data.error || 'No se pudo guardar el usuario de acceso.');
      try{ if(typeof fetchAccessUsers === 'function') await fetchAccessUsers(); }catch(_){ }
      accessRenderNow(); applyVersion(); markModified('save-acceso', identificacion || oldId, scroll);
    }catch(error){ alert(error?.message || 'No se pudo guardar el usuario de acceso.'); restoreScroll(scroll); }
    return false;
  }
  async function deleteAcceso(btn, ev){
    if(!isGD()) return block(ev, 'Solo GD puede mantener ACCESO.');
    const id = norm(btn.dataset.id || '');
    if(!id) return block(ev, 'No se encuentra el usuario de acceso.');
    try{ if((window.authUser?.identificacion || '') === id) return block(ev, 'No puedes eliminar el acceso con el que estás logado.'); }catch(_){ }
    stop(ev);
    if(!confirm('¿Eliminar este usuario de acceso?')) return false;
    const scroll = captureScroll();
    const card = btn.closest?.('.itemcard,.rowline,.card,tr,li,[data-id]');
    if(card){ card.querySelectorAll('button,input,select,textarea').forEach(el => { try{ el.disabled = true; }catch(_){ } }); card.classList.add('ce-v46-deleting'); }
    setTimeout(async () => {
      try{
        const res = await fetch('/api/access-users/' + encodeURIComponent(id), {method:'DELETE'});
        const data = await res.json().catch(() => ({}));
        if(!res.ok || !data.ok) throw new Error(data.error || 'No se pudo eliminar el usuario de acceso.');
        try{ if(typeof fetchAccessUsers === 'function') await fetchAccessUsers(); }catch(_){ }
        accessRenderNow(); applyVersion(); restoreScroll(scroll);
      }catch(error){ alert(error?.message || 'No se pudo eliminar el usuario de acceso.'); accessRenderNow(); restoreScroll(scroll); }
    }, card ? 1500 : 0);
    return false;
  }

  function handleTableAction(ev){
    const btn = ev.target?.closest?.('button[data-action]'); if(!btn) return;
    const action = btn.dataset.action || '';
    if(!/^(save|delete)-(persona|evento|tienda|producto|collab|compra|donacion|acceso)$/.test(action)) return;
    if(action === 'save-persona') return savePersona(btn, ev);
    if(action === 'save-tienda') return saveTienda(btn, ev);
    if(action === 'save-producto') return saveProducto(btn, ev);
    if(action === 'save-evento') return saveEvento(btn, ev);
    if(action === 'save-collab') return saveCollab(btn, ev);
    if(action === 'save-compra') return saveCompra(btn, ev);
    if(action === 'save-donacion') return saveDonacion(btn, ev);
    if(action === 'save-acceso') return saveAcceso(btn, ev);
    if(action === 'delete-persona') return deleteGeneral(action, 'personas', btn, ev);
    if(action === 'delete-tienda') return deleteGeneral(action, 'tiendas', btn, ev);
    if(action === 'delete-producto') return deleteGeneral(action, 'productos', btn, ev);
    if(action === 'delete-evento') return deleteEvento(btn, ev);
    if(action === 'delete-collab') return deleteCollab(btn, ev);
    if(action === 'delete-compra') return deleteCompra(btn, ev);
    if(action === 'delete-donacion') return deleteDonacion(btn, ev);
    if(action === 'delete-acceso') return deleteAcceso(btn, ev);
  }

  function chartData(){
    const rows = collabRows(); const compras = comprasRows();
    const socio = r => upper(r.persona?.rango || personaBy(r.personaId)?.rango) === 'SOCIO';
    const situ = r => norm(r.situacion || r.ingreso || 'Pendiente');
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r=>socio(r)&&situ(r)==='Banco').map(incomeTotal)), color:'#2563eb', lines:incomeLines(rows.filter(r=>socio(r)&&situ(r)==='Banco'))},
      {label:'Socios Bizum', value:sum(rows.filter(r=>socio(r)&&situ(r)==='Bizum').map(incomeTotal)), color:'#16a34a', lines:incomeLines(rows.filter(r=>socio(r)&&situ(r)==='Bizum'))},
      {label:'Socios Efectivo', value:sum(rows.filter(r=>socio(r)&&situ(r)==='Efectivo').map(incomeTotal)), color:'#84cc16', lines:incomeLines(rows.filter(r=>socio(r)&&situ(r)==='Efectivo'))},
      {label:'No socios Banco', value:sum(rows.filter(r=>!socio(r)&&situ(r)==='Banco').map(incomeTotal)), color:'#60a5fa', lines:incomeLines(rows.filter(r=>!socio(r)&&situ(r)==='Banco'))},
      {label:'No socios Bizum', value:sum(rows.filter(r=>!socio(r)&&situ(r)==='Bizum').map(incomeTotal)), color:'#34d399', lines:incomeLines(rows.filter(r=>!socio(r)&&situ(r)==='Bizum'))},
      {label:'No socios Efectivo', value:sum(rows.filter(r=>!socio(r)&&situ(r)==='Efectivo').map(incomeTotal)), color:'#bef264', lines:incomeLines(rows.filter(r=>!socio(r)&&situ(r)==='Efectivo'))},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r=>upper(situ(r))==='PENDIENTE').map(incomeTotal)), color:'#f59e0b', lines:incomeLines(rows.filter(r=>upper(situ(r))==='PENDIENTE'))}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r=>upper(r.ticketDonacion)==='DONADO TIENDA').map(rowValue)), color:'#fcd34d', lines:donationLines(compras.filter(r=>upper(r.ticketDonacion)==='DONADO TIENDA'))},
      {label:'Donado por socios', value:sum(compras.filter(r=>upper(r.ticketDonacion)==='DONADO SOCIO').map(rowValue)), color:'#f59e0b', lines:donationLines(compras.filter(r=>upper(r.ticketDonacion)==='DONADO SOCIO'))},
      {label:'Donado por no socios', value:sum(compras.filter(r=>upper(r.ticketDonacion)==='DONADO OTROS').map(rowValue)), color:'#b45309', lines:donationLines(compras.filter(r=>upper(r.ticketDonacion)==='DONADO OTROS'))}
    ];
    const paidExpenseRows = compras.filter(r => !isDonation(r.ticketDonacion) && !isCurrentExpense(r.ticketDonacion) && norm(r.ticketDonacion) !== '');
    const currentExpenseRows = compras.filter(r => isCurrentExpense(r.ticketDonacion));
    const pendingExpenseRows = compras.filter(r => !isDonation(r.ticketDonacion) && !isCurrentExpense(r.ticketDonacion) && norm(r.ticketDonacion) === '');
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(paidExpenseRows.map(rowValue)), color:'#dc2626', lines:expenseLines(paidExpenseRows)},
      {label:'Gastos corrientes', value:sum(currentExpenseRows.map(rowValue)), color:'#ef4444', lines:expenseLines(currentExpenseRows)},
      {label:'Pendiente de compra', value:sum(pendingExpenseRows.map(rowValue)), color:'#fb7185', lines:expenseLines(pendingExpenseRows)}
    ];
    const incomePaidRows = rows.filter(r => upper(situ(r)) !== 'PENDIENTE');
    const totalIncome = sum(incomeItems.map(x=>x.value));
    const totalIncomePaid = sum(incomePaidRows.map(incomeTotal));
    const totalDon = sum(donationItems.map(x=>x.value));
    const totalExp = sum(expenseItems.map(x=>x.value));
    const totalExpPaid = sum(paidExpenseRows.concat(currentExpenseRows).map(rowValue));
    const totalPendingExp = sum(pendingExpenseRows.map(rowValue));
    const saldoActual = totalIncomePaid - totalExpPaid;
    const saldoOperativo = totalIncome - totalExp;
    const valoracion = totalExp + totalDon;
    const saldoActualColor = saldoActual >= 0 ? '#0f766e' : '#b91c1c';
    const saldoOperativoColor = saldoOperativo >= 0 ? '#155e75' : '#7f1d1d';
    const saldoActualItems = [{label:'Saldo actual', value:Math.abs(saldoActual), displayValue:saldoActual, color:saldoActualColor, layout:'metricv460', lines:saldoActualLines(incomePaidRows, paidExpenseRows.concat(currentExpenseRows), totalIncomePaid, totalExpPaid, saldoActual)}];
    const saldoOperativoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), displayValue:saldoOperativo, color:saldoOperativoColor, layout:'metricv460', lines:saldoOperativoLines(rows, paidExpenseRows.concat(currentExpenseRows, pendingExpenseRows), totalIncome, totalExp, saldoOperativo)}];
    const valoracionItems = [{label:'Valoración del evento', value:Math.abs(valoracion), displayValue:valoracion, color:WINDOWS_BLUE, layout:'metricv460', lines:valoracionLines(paidExpenseRows.concat(currentExpenseRows, pendingExpenseRows), compras.filter(r=>isDonation(r.ticketDonacion)), totalExp, totalDon, valoracion, totalPendingExp)}];
    return {incomeItems, donationItems, expenseItems, saldoActualItems, saldoOperativoItems, valoracionItems, totalIncome, totalDon, totalExp, saldoActual, saldoOperativo, valoracion};
  }
  function detailSortText(value){ return upper(String(value || '')); }
  function incomeLines(rows){
    const sorted = (Array.isArray(rows) ? rows.slice() : []).sort((a,b) => {
      const sa = upper(a?.persona?.rango || personaBy(a?.personaId)?.rango) === 'SOCIO' ? 0 : 1;
      const sb = upper(b?.persona?.rango || personaBy(b?.personaId)?.rango) === 'SOCIO' ? 0 : 1;
      const na = a?.persona?.nombre || personName(a?.personaId) || 'Sin nombre';
      const nb = b?.persona?.nombre || personName(b?.personaId) || 'Sin nombre';
      return (sa - sb) || na.localeCompare(nb, 'es', {sensitivity:'base'});
    });
    if(!sorted.length) return ['Nombre | Ingreso | Importe', 'Sin registros'];
    return ['Nombre | Ingreso | Importe', ...sorted.map(r => `${r.persona?.nombre || personName(r.personaId) || 'Sin nombre'} | ${r.situacion || 'Pendiente'} | ${moneyF(incomeTotal(r))}`)];
  }
  function donationLines(rows){
    const sorted = (Array.isArray(rows) ? rows.slice() : []).sort((a,b) => {
      const da = donorName(a) || 'Sin donante'; const db = donorName(b) || 'Sin donante';
      const pa = a?.producto?.nombre || productName(a?.productoId) || 'Producto'; const pb = b?.producto?.nombre || productName(b?.productoId) || 'Producto';
      return da.localeCompare(db, 'es', {sensitivity:'base'}) || pa.localeCompare(pb, 'es', {sensitivity:'base'});
    });
    if(!sorted.length) return ['Donante | Producto | Cant. | Precio | Total', 'Sin registros'];
    const out = ['Donante | Producto | Cant. | Precio | Total'];
    let i = 0;
    while(i < sorted.length){
      const donor = donorName(sorted[i]) || 'Sin donante';
      const group = [];
      while(i < sorted.length && (donorName(sorted[i]) || 'Sin donante') === donor){ group.push(sorted[i]); i += 1; }
      group.forEach(r => out.push(`${donorName(r) || 'Sin donante'} | ${r.producto?.nombre || productName(r.productoId) || 'Producto'} | ${qtyF(r)} | ${moneyF(unitPriceFor(r))} | ${moneyF(rowValue(r))}`));
      if(group.length > 1){
        out.push(`Total ${donor} |  |  |  | ${moneyF(sum(group.map(rowValue)))}`);
      }
    }
    return out;
  }
  function expenseLines(rows){
    const sorted = (Array.isArray(rows) ? rows.slice() : []).sort((a,b) => {
      const sa = a?.tienda?.nombre || storeName(a?.tiendaId) || 'Sin tienda'; const sb = b?.tienda?.nombre || storeName(b?.tiendaId) || 'Sin tienda';
      const ta = a?.ticketDonacion || 'Pte.Compra'; const tb = b?.ticketDonacion || 'Pte.Compra';
      const pa = a?.producto?.nombre || productName(a?.productoId) || 'Producto'; const pb = b?.producto?.nombre || productName(b?.productoId) || 'Producto';
      return sa.localeCompare(sb, 'es', {sensitivity:'base'}) || ta.localeCompare(tb, 'es', {sensitivity:'base'}) || pa.localeCompare(pb, 'es', {sensitivity:'base'});
    });
    if(!sorted.length) return ['Tienda | Ticket | Producto | Cant. | Precio | Total', 'Sin registros'];
    const out = ['Tienda | Ticket | Producto | Cant. | Precio | Total'];
    let i = 0;
    while(i < sorted.length){
      const store = sorted[i]?.tienda?.nombre || storeName(sorted[i]?.tiendaId) || 'Sin tienda';
      const ticket = sorted[i]?.ticketDonacion || 'Pte.Compra';
      const group = [];
      while(i < sorted.length){
        const r = sorted[i];
        const sName = r?.tienda?.nombre || storeName(r?.tiendaId) || 'Sin tienda';
        const tName = r?.ticketDonacion || 'Pte.Compra';
        if(sName !== store || tName !== ticket) break;
        group.push(r); i += 1;
      }
      group.forEach(r => out.push(`${r.tienda?.nombre || storeName(r.tiendaId) || 'Sin tienda'} | ${r.ticketDonacion || 'Pte.Compra'} | ${r.producto?.nombre || productName(r.productoId) || 'Producto'} | ${qtyF(r)} | ${moneyF(unitPriceFor(r))} | ${moneyF(rowValue(r))}`));
      if(group.length > 1){
        out.push(`Total ${store} / ${ticket} |  |  |  |  | ${moneyF(sum(group.map(rowValue)))}`);
      }
    }
    return out;
  }
  function limited(list, max=80){ return list.length > max ? list.slice(0,max).concat([`... ${list.length - max} registros más`]) : list; }
  function saldoActualLines(incomeRows, expenseRows, income, expense, saldo){
    return ['SALDO ACTUAL', 'TOTAL | Importe', `Ingresos realizados | ${moneyF(income)}`, `Gastos realizados | ${moneyF(expense)}`, `SALDO ACTUAL | ${moneyF(saldo)}`, '', 'INGRESOS REALIZADOS', ...limited(incomeLines(incomeRows)), '', 'GASTOS REALIZADOS', ...limited(expenseLines(expenseRows))];
  }
  function saldoOperativoLines(incomeRows, expenseRows, income, expense, saldo){
    return ['SALDO OPERATIVO', 'TOTAL | Importe', `Ingreso total previsto | ${moneyF(income)}`, `Gasto total previsto | ${moneyF(expense)}`, `SALDO OPERATIVO | ${moneyF(saldo)}`, '', 'INGRESOS INCLUIDOS', ...limited(incomeLines(incomeRows)), '', 'GASTOS INCLUIDOS', ...limited(expenseLines(expenseRows))];
  }
  function valoracionLines(expenseRows, donationRows, expenses, donations, valoracion, pending){
    return ['VALORACION DEL EVENTO', 'TOTAL | Importe', `Gastos previstos | ${moneyF(expenses)}`, `Donación de producto | ${moneyF(donations)}`, `Pendiente incluido | ${moneyF(pending)}`, `VALORACION DEL EVENTO | ${moneyF(valoracion)}`, '', 'GASTOS PREVISTOS', ...limited(expenseLines(expenseRows)), '', 'DONACIONES DE PRODUCTO', ...limited(donationLines(donationRows))];
  }
  function polar(cx, cy, r, angle){ const rad = (angle - 90) * Math.PI / 180; return {x:cx + r * Math.cos(rad), y:cy + r * Math.sin(rad)}; }
  function arcPath(cx, cy, r, start, end){ const s = polar(cx,cy,r,end), e = polar(cx,cy,r,start); const large = end - start <= 180 ? 0 : 1; return `M ${cx} ${cy} L ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(3)} ${e.y.toFixed(3)} Z`; }
  function tipFor(item){
    const lines = (item.lines && item.lines.length ? item.lines : ['Sin registros']);
    if(item.layout === 'metricv460') return lines.join('\n');
    return `${item.label}: ${moneyF(item.displayValue ?? item.value)}\n${lines.join('\n')}`;
  }
  function tipAttrs(item, bg='#fff', layout){ return `data-ce-tip-v21="${esc(tipFor(item))}" data-tip-bg-v21="${esc(bg)}" data-ce-tip-layout-v21="${esc(layout || item.layout || 'chart')}"`; }
  function stripDetailHeaders(lines){
    const arrLines = Array.isArray(lines) ? lines.slice() : [];
    return arrLines.filter(line => {
      const u = upper(String(line || '').split('|').map(x => x.trim()).join(' | '));
      return !/^(NOMBRE\s*\|\s*INGRESO\s*\|\s*IMPORTE|DONANTE\s*\|\s*PRODUCTO\s*\|\s*CANT|(?:TIENDA\s*\|\s*TICKET|TICKET\s*\|\s*TIENDA)\s*\|\s*PRODUCTO|GASTOS\s*\||INGRESOS\s*\||DONACIONES\s*\|)/.test(u);
    });
  }
  function detailHeaderFor(label){
    return upper(label).includes('DONADO') ? 'Donante | Producto | Cant. | Precio | Total' : 'Tienda | Ticket | Producto | Cant. | Precio | Total';
  }
  function pieCard(title, total, items){
    const nonzero = items.filter(it => Math.abs(Number(it.value || 0)) > 0);
    let angle = 0;
    const denom = Math.max(0.0001, nonzero.reduce((a,b) => a + Math.abs(Number(b.value || 0)),0));
    const slices = nonzero.length ? nonzero.map(it => {
      const start = angle; const inc = (Math.abs(Number(it.value || 0)) / denom) * 360; angle += inc;
      if(inc >= 359.99) return `<circle class="ce-v434-pie-slice" cx="50" cy="50" r="42" fill="${esc(it.color)}" ${tipAttrs(it, it.color)}></circle>`;
      return `<path class="ce-v434-pie-slice" d="${arcPath(50,50,42,start,angle)}" fill="${esc(it.color)}" ${tipAttrs(it, it.color)}></path>`;
    }).join('') : `<circle cx="50" cy="50" r="42" fill="#e5e7eb"></circle>`;
    const legend = (nonzero.length ? nonzero : [{label:'Sin datos', value:0, color:'#e5e7eb', lines:['Sin registros']}]).map(it => `<div class="ce-v434-legend-row" ${tipAttrs(it, it.color)}><span class="ce-v434-dot" style="background:${esc(it.color)}"></span><span>${esc(it.label)}: ${esc(moneyF(it.displayValue ?? it.value))}</span></div>`).join('');
    return `<div class="ce-v434-pie-card"><div class="ce-v434-pie-title"><span>${esc(title)}</span><strong>${esc(moneyF(total))}</strong></div><svg class="ce-v434-pie-svg" viewBox="0 0 100 100" role="img" aria-label="${esc(title)}">${slices}<circle cx="50" cy="50" r="21" fill="#fff"></circle></svg><div class="ce-v434-legend">${legend}</div></div>`;
  }
  function hasDestinoValues(row){ return Math.abs(Number(row?.comprado || 0)) > 0 || Math.abs(Number(row?.donado || 0)) > 0 || Math.abs(Number(row?.pendiente || 0)) > 0; }
  function destinoRows(){
    // v46.8: se calcula aquí para garantizar cabeceras y ordenación homogénea en los globos.
    const compras = comprasRows();
    const destinos = Array.from(new Set(compras.map(c => c.producto?.destino || productoBy(c.productoId)?.destino || 'Sin destino'))).filter(Boolean);
    return destinos.map(k => {
      const match = c => norm(c.producto?.destino || productoBy(c.productoId)?.destino || 'Sin destino') === norm(k);
      const comprados = compras.filter(c => match(c) && !isDonation(c.ticketDonacion) && !isCurrentExpense(c.ticketDonacion) && norm(c.ticketDonacion) !== '');
      const corrientes = compras.filter(c => match(c) && isCurrentExpense(c.ticketDonacion));
      const donados = compras.filter(c => match(c) && isDonation(c.ticketDonacion));
      const pendientes = compras.filter(c => match(c) && !isDonation(c.ticketDonacion) && !isCurrentExpense(c.ticketDonacion) && norm(c.ticketDonacion) === '');
      const row = {label:k, comprado:sum(comprados.concat(corrientes).map(rowValue)), donado:sum(donados.map(rowValue)), pendiente:sum(pendientes.map(rowValue)), listComprado:expenseLines(comprados.concat(corrientes)), listDonado:donationLines(donados), listPendiente:expenseLines(pendientes)};
      row.total = row.comprado + row.donado + row.pendiente; return row;
    }).filter(hasDestinoValues);
  }
  function destinoBars(){
    const rows = destinoRows(); const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
    const total = rows.reduce((a,b) => a + Number(b.total || 0), 0);
    const item = (r,key,label,color,lines) => {
      const value = Number(r[key] || 0);
      if(Math.abs(value) <= 0) return '';
      const h = Math.max(18, value / maxVal * 145);
      const header = label === 'Comprado' ? 'COMPRADO' : (label === 'Donado' ? 'DONADO' : 'PTE. COMPRA');
      const rows = stripDetailHeaders(lines || []);
      const tableHeader = detailHeaderFor(label);
      const body = rows.length ? rows : ['Sin productos'];
      const tip = `${r.label} - ${label}: ${moneyF(value)}\n${header}\n${tableHeader}\n${body.join('\n')}`;
      return `<div class="ce-v434-mini-col" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="${esc(color)}" data-ce-tip-layout-v21="chart"><div class="ce-v434-mini-value">${esc(moneyF(value))}</div><div class="ce-v434-mini-stick" style="height:${h}px;background:${color}"></div><div class="ce-v434-mini-label">${esc(label)}</div></div>`;
    };
    const cards = rows.map(r => `<div class="ce-v434-destino-card"><div class="ce-v434-destino-title"><span>${esc(r.label)}</span><strong>${esc(moneyF(r.total))}</strong></div><div class="ce-v434-mini-bars">${item(r,'comprado','Comprado','#dc2626',r.listComprado)}${item(r,'donado','Donado','#f59e0b',r.listDonado)}${item(r,'pendiente','Pte.Compra','#fb7185',r.listPendiente)}</div></div>`).join('');
    return `<div class="ce-v434-chart-panel"><div class="ce-v434-panel-title"><span>Por destino</span><strong>${esc(moneyF(total))}</strong></div><div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte.Compra</span></div><div class="ce-v434-destino-bars">${cards || '<div class="empty">Sin datos por destino.</div>'}</div></div>`;
  }
  let lastChartSignature = '';
  function chartSignature(g){
    try{ return JSON.stringify({ev:selectedId(), income:g.totalIncome, don:g.totalDon, exp:g.totalExp, sa:g.saldoActual, so:g.saldoOperativo, val:g.valoracion, dest:destinoRows().map(r => [r.label,r.comprado,r.donado,r.pendiente])}); }catch(_){ return `${selectedId()}-${Date.now()}`; }
  }
  function renderGraficasV460(options = {}){
    const wrap = $('eventChartWrap'); if(!wrap) return;
    window.__ceStableGraficasV435 = true;
    const g = chartData(); const sig = chartSignature(g);
    const own = wrap.firstElementChild?.classList?.contains('ce-v434-chart-layout-shell') && wrap.children.length === 1;
    if(own && lastChartSignature === sig && options.force !== true) return;
    const html = `<div class="chart-shell ce-v434-chart-layout-shell"><div class="chart-row" data-v255-row="valoracion" data-v254-row="valoracion" style="display:none!important"></div><div class="ce-v434-chart-layout"><div class="ce-v434-chart-panel"><div class="ce-v434-panel-title"><span>Distribución general</span></div><div class="ce-v434-pies ce-v46-pies">${pieCard('INGRESOS', g.totalIncome, g.incomeItems)}${pieCard('DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems)}${pieCard('GASTOS', g.totalExp, g.expenseItems)}${pieCard('SALDO ACTUAL', g.saldoActual, g.saldoActualItems)}${pieCard('SALDO OPERATIVO', g.saldoOperativo, g.saldoOperativoItems)}${pieCard('VALORACION DEL EVENTO', g.valoracion, g.valoracionItems)}</div></div>${destinoBars()}</div></div>`;
    wrap.innerHTML = html;
    lastChartSignature = sig;
    wrap.dataset.ceStableChart = 'v46.8';
  }
  function graficasVisible(){ const tab=$('tabGraficas'); return !!tab && !tab.classList.contains('hidden'); }
  function installGraficas(){
    try{ renderGraficas = renderGraficasV460; }catch(_){ }
    window.renderGraficas = renderGraficasV460;
    window.ControlEventV462 = {...(window.ControlEventV462 || {}), version:VERSION, renderGraficas:renderGraficasV460}; window.ControlEventV461 = window.ControlEventV462; window.ControlEventV460 = {...(window.ControlEventV460 || {}), version:VERSION, renderGraficas:renderGraficasV460};
    try{ window.ControlEventV434 = {...(window.ControlEventV434 || {}), renderGraficas:renderGraficasV460}; window.ControlEventV435 = window.ControlEventV434; window.ControlEventV436 = window.ControlEventV434; }catch(_){ }
    if(graficasVisible()) setTimeout(() => renderGraficasV460({force:true}), 30);
  }

  let ceV462TipTimer = null;
  function renderTipHtmlV462(text){
    const lines = String(text || '').split('\n');
    const parts = [];
    let table = [];
    const flush = () => {
      if(!table.length) return;
      parts.push('<table class="ce-v21-table"><tbody>' + table.map(cells => '<tr>' + cells.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      table = [];
    };
    lines.forEach(line => {
      const raw = String(line ?? '');
      if(!raw.trim()){
        flush(); parts.push('<div class="ce-v21-blank"></div>'); return;
      }
      if(raw.includes('|')){
        table.push(raw.split('|').map(s => s.trim())); return;
      }
      flush();
      const html = esc(raw).replace(/(\d{1,3}(?:\.\d{3})*,\d{2}\s*€|\d+(?:,\d{2})?\s*€)/g,'<strong>$1</strong>');
      if(/^(TOTAL|INGRESOS|DONACI|COMPRADO|DONADO|PENDIENTE|PTE|GAST|SALDO|VALORACION|POR |SOCIOS|NO SOCIOS|PERSONAS|PRODUCTOS)/i.test(raw.trim())) parts.push('<div class="ce-v21-title">' + html + '</div>');
      else parts.push('<div class="ce-v21-text">' + html + '</div>');
    });
    flush();
    return parts.join('');
  }
  function placeTipV462(tip, owner){
    const r = owner.getBoundingClientRect();
    tip.style.display = 'block';
    tip.style.left = '0px'; tip.style.top = '0px';
    const tr = tip.getBoundingClientRect();
    let left = Math.min(Math.max(8, r.left), innerWidth - tr.width - 8);
    let top = r.bottom + 8;
    if(top + tr.height > innerHeight - 8) top = Math.max(8, r.top - tr.height - 8);
    tip.style.left = Math.round(Math.max(8,left)) + 'px';
    tip.style.top = Math.round(Math.max(8,top)) + 'px';
  }
  function closeTipV462(animated = true){
    const tip = $('ceTooltipV21');
    if(!tip || tip.style.display === 'none') return;
    clearTimeout(ceV462TipTimer);
    tip.classList.remove('ce-v462-tip-open');
    if(animated){
      tip.classList.add('ce-v462-tip-hide');
      ceV462TipTimer = setTimeout(() => { try{ tip.style.display = 'none'; tip.classList.remove('ce-v462-tip-hide'); }catch(_){ } }, 330);
    }else{
      tip.style.display = 'none'; tip.classList.remove('ce-v462-tip-hide');
    }
  }
  function openTipV462(owner){
    const text = owner?.getAttribute?.('data-ce-tip-v21') || '';
    if(!norm(text)) return false;
    let tip = $('ceTooltipV21');
    if(!tip){ tip = document.createElement('div'); tip.id = 'ceTooltipV21'; document.body.appendChild(tip); }
    clearTimeout(ceV462TipTimer);
    tip.classList.remove('ce-v462-tip-hide','ce-v462-tip-open');
    Array.from(tip.classList).forEach(c => { if(c.startsWith('ce-v21-layout-')) tip.classList.remove(c); });
    tip.classList.add('ce-v21-layout-' + (owner.getAttribute('data-ce-tip-layout-v21') || 'chart'));
    tip.innerHTML = renderTipHtmlV462(text);
    tip.style.background = owner.getAttribute('data-tip-bg-v21') || '#fff';
    tip.style.color = owner.getAttribute('data-ce-tip-layout-v21') === 'metricv460' ? '#fff' : '#111827';
    placeTipV462(tip, owner);
    void tip.offsetWidth;
    tip.classList.add('ce-v462-tip-open');
    return true;
  }
  function handleChartTooltipClick(ev){
    const owner = ev.target?.closest?.('#eventChartWrap [data-ce-tip-v21],#eventChartWrap [data-ce-tip-lazy-v250]');
    if(!owner){
      if(ev.target?.closest?.('.ce-v465-modal,[data-ce-preserve-tooltip]')) return;
      const tip = $('ceTooltipV21');
      if(tip && tip.style.display !== 'none' && !ev.target?.closest?.('#ceTooltipV21')){ closeTipV462(true); return stop(ev); }
      return;
    }
    const layout = owner.getAttribute('data-ce-tip-layout-v21') || '';
    if(!/^(chart|metricv460)$/i.test(layout)) return;
    if(!owner.hasAttribute('data-ce-tip-v21')) return;
    if(openTipV462(owner)) return stop(ev);
  }

  const exportLocks = {info:false, backup:false};
  function directInfoEvento(){
    if(exportLocks.info) return false; exportLocks.info = true;
    try{
      const engine = window.__ceV257?.exportExcel;
      if(typeof engine === 'function') return Promise.resolve(engine()).finally(() => { exportLocks.info = false; });
      const excel = window.ControlEventExcel;
      if(excel && typeof excel.invokeLegacy === 'function') return Promise.resolve(excel.invokeLegacy('exportExcel')).finally(() => { exportLocks.info = false; });
      const fn = window.exportExcel;
      if(typeof fn === 'function' && fn.__ceExcelFacade !== true) return Promise.resolve(fn()).finally(() => { exportLocks.info = false; });
      throw new Error('No se ha encontrado un motor seguro para INFOEVENTO.');
    }catch(error){ exportLocks.info = false; console.error('[v46.8] INFOEVENTO', error); alert(`No se pudo descargar INFOEVENTO.\n\n${error?.name || 'Error'}: ${error?.message || error}`); return false; }
  }
  function directBackup(){
    if(exportLocks.backup) return false; exportLocks.backup = true;
    try{
      const engine = window.__ceV257?.exportSeedWorkbook;
      if(typeof engine === 'function') return Promise.resolve(engine()).finally(() => { exportLocks.backup = false; });
      const excel = window.ControlEventExcel;
      if(excel && typeof excel.run === 'function') return Promise.resolve(excel.run('backup', {source:'v46-7-direct'})).finally(() => { exportLocks.backup = false; });
      const fn = window.exportSeedWorkbook;
      if(typeof fn === 'function' && fn.__ceExcelFacade !== true) return Promise.resolve(fn()).finally(() => { exportLocks.backup = false; });
      throw new Error('No se ha encontrado un motor seguro para Descarga de datos.');
    }catch(error){ exportLocks.backup = false; console.error('[v46.8] BACKUP', error); alert(`No se pudo descargar la descarga de datos.\n\n${error?.name || 'Error'}: ${error?.message || error}`); return false; }
  }
  function installExportGuard(){
    try{
      if(!window.__ceV461ExportPatched){
        const infoWrapper = function(){ return directInfoEvento(); };
        const backupWrapper = function(){ return directBackup(); };
        infoWrapper.__ceV461Direct = true; backupWrapper.__ceV461Direct = true;
        try{ Object.defineProperty(infoWrapper, '__ceExcelFacade', {value:true}); Object.defineProperty(infoWrapper, '__ceExcelFacadeName', {value:'exportExcel'}); }catch(_){ }
        try{ Object.defineProperty(backupWrapper, '__ceExcelFacade', {value:true}); Object.defineProperty(backupWrapper, '__ceExcelFacadeName', {value:'exportSeedWorkbook'}); }catch(_){ }
        try{ exportExcel = infoWrapper; }catch(_){ }
        try{ exportSeedWorkbook = backupWrapper; }catch(_){ }
        window.exportExcel = infoWrapper; window.exportSeedWorkbook = backupWrapper;
        window.__ceV461ExportPatched = true;
      }
    }catch(_){ }
  }
  function handleExportClick(ev){
    const info = ev.target?.closest?.('#btnExportExcel,.mobile-menu-action[data-target="btnExportExcel"]');
    const seed = ev.target?.closest?.('#btnExportSeed,.mobile-menu-action[data-target="btnExportSeed"]');
    if(info){ stop(ev); directInfoEvento(); return false; }
    if(seed){ stop(ev); directBackup(); return false; }
  }

  function wrapRender(){
    const old = (typeof render === 'function') ? render : window.render;
    if(!old || old.__ceV460Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      setTimeout(() => { applyVersion(); installGraficas(); installExportGuard(); applyModifiedMarks(); addIngresoReceiptTools(); }, 50);
      return ret;
    };
    wrapped.__ceV460Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  function install(){
    injectStyle(); applyVersion(); installGraficas(); installExportGuard(); wrapRender(); addIngresoReceiptTools();
  }

  window.addEventListener('click', handleChartTooltipClick, true);
  document.addEventListener('click', handleIngresoReceiptClick, true);
  // v46.8: no cerrar globos al usar ruleta/ascensor; se cierran al perder foco/click fuera.
  window.addEventListener('resize', () => closeTipV462(false), true);
  window.addEventListener('click', handleTableAction, true);
  document.addEventListener('click', handleTableAction, true);
  document.addEventListener('click', handleExportClick, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,120,600,1600,3000].forEach(ms => setTimeout(install, ms));
  window.ControlEventV462 = {version:VERSION, renderGraficas:renderGraficasV460, install, directInfoEvento, directBackup}; window.ControlEventV461 = window.ControlEventV462; window.ControlEventV460 = window.ControlEventV462;
})();
