/* ControlEvent v4.0_prod - Ajustes finales
   - Duplicidad de compras por Producto + Tienda + Ticket.
   - Botón flotante tipo casa en mantenimiento de PERSONAS, TIENDAS y PRODUCTOS.
   - Mantiene INFOEVENTO legacy protegido; conserva backup seguro con alcance TODOS. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v4.0_prod';
  const VERSION_FILE = 'ControlEvent_v4_0_prod';
  const DONATION_TYPES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const CURRENT_EXPENSE = 'GASTOS CORRIENTES';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g, '');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const money = v => Number(num(v).toFixed(2));
  const fmtMoney = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(money(v));
  const fmtNum = v => new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(num(v));
  const cleanFilePart = value => norm(value || 'SIN_TITULO').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]+/g,' ').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_').slice(0,90) || 'SIN_TITULO';
  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return window.state || window.ControlEventApp?.state || {}; }
  function arr(name){ const v = st()[name]; return Array.isArray(v) ? v : []; }
  function selectedId(){ return String(st().selectedEventId || window.ControlEventApp?.state?.selectedEventId || ''); }
  function currentEvent(){ const id = selectedId(); return arr('eventos').find(e => String(e.id) === id) || null; }
  function product(id){ return arr('productos').find(p => String(p.id) === String(id || '')) || {}; }
  function store(id){ return arr('tiendas').find(t => String(t.id) === String(id || '')) || {}; }
  function person(id){ return arr('personas').find(p => String(p.id) === String(id || '')) || {}; }
  function comprasForEvent(){ const ev = selectedId(); return arr('compras').filter(c => String(c.eventId || '') === ev); }
  function isDonation(ticket){ return DONATION_TYPES.includes(norm(ticket)); }
  function isCurrentExpense(ticket){ return up(ticket) === CURRENT_EXPENSE; }
  function ticket(row){ return norm(row?.ticketDonacion || row?.ticket || ''); }
  function units(row){ return num(row?.unidades); }
  function price(row){ const p = product(row?.productoId); return money(row?.precio ?? row?.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0); }
  function value(row){ return money(units(row) * price(row)); }
  function productName(row){ const p = product(row?.productoId); return norm(p.nombre || row?.producto || 'Producto sin nombre'); }
  function segmentName(row){ return norm(product(row?.productoId).segmento || row?.producto?.segmento || 'Sin segmento'); }
  function destinoName(row){ return norm(product(row?.productoId).destino || row?.producto?.destino || 'Sin destino'); }
  function storeIdOf(row){ const p = product(row?.productoId); return String(row?.tiendaId || p.tiendaId || p.defaultTiendaId || ''); }
  function storeName(row){ return norm(store(storeIdOf(row)).nombre || row?.tienda?.nombre || 'Sin tienda'); }
  function donorName(row){
    const ref = norm(row?.donorRef || row?.donante || row?.donanteNombre || row?.donor || '');
    if(ref.startsWith('P:')) return norm(person(ref.slice(2)).nombre || 'Persona sin nombre');
    if(ref.startsWith('T:')) return norm(store(ref.slice(2)).nombre || 'Tienda sin nombre');
    return ref || (row?.tiendaId ? storeName(row) : 'Sin donante');
  }
  function responsibleName(row){ return norm(person(row?.responsableId || row?.responsable || row?.socioResponsableId).nombre || row?.responsable?.nombre || ''); }
  function isGD(){ const u = window.ControlEventApp?.authUser || window.authUser || window.__CONTROL_EVENT_USER__ || {}; return up(u.nivel) === 'GD'; }
  function isRO(){ const u = window.ControlEventApp?.authUser || window.authUser || window.__CONTROL_EVENT_USER__ || {}; return up(u.nivel) === 'RO'; }
  function isFinalized(){ return up(currentEvent()?.situacion || '').includes('FINAL'); }
  function saveNow(){ try{ if(typeof saveState === 'function'){ saveState(); return; } }catch(_){ } try{ window.saveState?.(); }catch(_){ } }
  function renderNow(){ try{ if(typeof render === 'function'){ render(); return; } }catch(_){ } try{ window.render?.(); }catch(_){ } }
  function setTabCompras(){ try{ currentMainTab = 'compras'; showComprasEvent = true; }catch(_){ } try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'compras'; }catch(_){ } }

  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.body.dataset.ceVersion = VERSION;
    try{ window.__ceVersion = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }

  function buyInputTicket(){ return norm($('buyTicket')?.value || ''); }
  function buyInputProduct(){ return String($('buyProducto')?.value || ''); }
  function buyInputStore(){
    const pid = buyInputProduct();
    const p = product(pid);
    return String($('buyTienda')?.value || p.tiendaId || p.defaultTiendaId || '');
  }
  function sameCompraKey(row, productId, storeId, rawTicket, selfId){
    if(!row || isDonation(ticket(row))) return false;
    if(selfId && String(row.id || '') === String(selfId)) return false;
    return String(row.eventId || '') === selectedId()
      && String(row.productoId || '') === String(productId || '')
      && String(storeIdOf(row)) === String(storeId || '')
      && norm(ticket(row)) === norm(rawTicket || '');
  }
  function findCompraDuplicate(productId, storeId, rawTicket, selfId){
    if(!productId) return null;
    return arr('compras').find(row => sameCompraKey(row, productId, storeId, rawTicket, selfId)) || null;
  }
  function locateCompraRow(id){
    const safe = (window.CSS && CSS.escape) ? CSS.escape(String(id || '')) : String(id || '').replace(/"/g,'\\"');
    return document.getElementById('compraRow_' + id)
      || document.querySelector(`#comprasList select[data-action="edit-compra-producto"][data-id="${safe}"]`)?.closest?.('.itemcard')
      || document.querySelector(`#comprasList [data-id="${safe}"]`)?.closest?.('.itemcard');
  }
  function highlight(el){
    if(!el) return;
    document.querySelectorAll('.found-target,.ce-v40-found').forEach(x => x.classList.remove('found-target','ce-v40-found'));
    el.classList.add('found-target','ce-v40-found');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target','ce-v40-found'), 3200);
  }
  function jumpToCompra(row){
    if(!row) return false;
    setTabCompras();
    renderNow();
    setTimeout(() => highlight(locateCompraRow(row.id)), 100);
    return true;
  }
  function currentEditValue(action, id){
    const safe = (window.CSS && CSS.escape) ? CSS.escape(String(id || '')) : String(id || '').replace(/"/g,'\\"');
    const el = document.querySelector(`[data-action="${action}"][data-id="${safe}"]`);
    return el ? el.value : '';
  }

  function setTabDonaciones(){
    try{ currentMainTab = 'donaciones'; showDonacionesEvent = true; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'donaciones'; }catch(_){ }
  }
  function parseEuroSafe(value){
    try{ if(typeof parseEuroInput === 'function') return parseEuroInput(value); }catch(_){ }
    try{ if(typeof parseEuro === 'function') return parseEuro(value); }catch(_){ }
    return num(value);
  }
  function donationInputProduct(){ return String($('donProducto')?.value || ''); }
  function donationInputDonor(){ return String($('donDonante')?.value || ''); }
  function sameDonationKey(row, productId, donorRef, selfId){
    if(!row || !isDonation(ticket(row))) return false;
    if(selfId && String(row.id || '') === String(selfId)) return false;
    return String(row.eventId || '') === selectedId()
      && String(row.productoId || '') === String(productId || '')
      && String(row.donorRef || '') === String(donorRef || '');
  }
  function findDonationDuplicate(productId, donorRef, selfId){
    if(!productId) return null;
    return arr('compras').find(row => sameDonationKey(row, productId, donorRef, selfId)) || null;
  }
  function locateDonationRow(id){
    const safe = (window.CSS && CSS.escape) ? CSS.escape(String(id || '')) : String(id || '').replace(/"/g,'\\"');
    return document.getElementById('donacionRow_' + id)
      || document.querySelector(`#donacionesList select[data-action="edit-donacion-producto"][data-id="${safe}"]`)?.closest?.('.itemcard')
      || document.querySelector(`#donacionesList [data-id="${safe}"]`)?.closest?.('.itemcard');
  }
  function jumpToDonation(row){
    if(!row) return false;
    setTabDonaciones();
    renderNow();
    setTimeout(() => highlight(locateDonationRow(row.id)), 100);
    return true;
  }
  function resetDonationInputs(){
    ['donProducto','donDonante','donResponsable'].forEach(id => { const el = $(id); if(el) el.value = ''; });
    if($('donUnidades')) $('donUnidades').value = '1.00';
    if($('donPrecio')) $('donPrecio').value = '0,00 €';
    if($('donImporte')) $('donImporte').value = '';
    try{ if($('donTicket') && typeof DONATION_TICKET_OPTIONS !== 'undefined') $('donTicket').value = DONATION_TICKET_OPTIONS[0]; }catch(_){ }
  }

  function installDonationDuplicateGuard(){
    // v41.0: la duplicidad de donaciones se comprueba solo ANTES de insertar.
    // Tras una alta nueva no se busca ni se salta al registro recién creado.
    if(!window.__ceV410DonationChangeGuardInstalled){
      window.__ceV410DonationChangeGuardInstalled = true;
      window.addEventListener('change', ev => {
        const t = ev.target;
        if(!t || t.id !== 'donProducto') return;
        try{ if(typeof isLocked === 'function' && isLocked()) return; }catch(_){ }
        try{ if(typeof updateDonationPreview === 'function') updateDonationPreview(true); else window.updateDonationPreview?.(true); }catch(_){ }
        ev.stopPropagation();
        ev.stopImmediatePropagation();
      }, true);
    }

    const addDonationV41 = function(){
      try{ if(typeof selectedEvent === 'function' && !selectedEvent()) return; }catch(_){ if(!selectedId()) return; }
      const productId = donationInputProduct();
      if(!productId) return;
      const donorRef = donationInputDonor();
      const found = findDonationDuplicate(productId, donorRef, '');
      if(found){
        alert(`Ya existe esta donación con el mismo Producto + Donante.\n\nProducto: ${productName(found)}\nDonante: ${donorName(found)}\n\nSe muestra el registro existente para modificarlo si procede.`);
        jumpToDonation(found);
        return;
      }
      const p = product(productId);
      const rec = {
        id: (typeof uid === 'function' ? uid() : ('id_' + Date.now() + '_' + Math.random().toString(36).slice(2))),
        eventId: selectedId(),
        productoId: productId,
        unidades: num($('donUnidades')?.value || 0),
        precio: parseEuroSafe($('donPrecio')?.value || p.defaultPrecio || p.precio || 0),
        ticketDonacion: $('donTicket')?.value || 'DONADO TIENDA',
        donorRef: donorRef,
        responsableId: $('donResponsable')?.value || ''
      };
      if(!Array.isArray(st().compras)) st().compras = [];
      st().compras.push(rec);
      saveNow();
      resetDonationInputs();
      setTabDonaciones();
      renderNow();
      setTimeout(() => { try{ $('donProducto')?.focus?.({preventScroll:true}); }catch(_){} }, 80);
    };
    addDonationV41.__ceV41 = true;
    try{ window.addDonation = addDonationV41; }catch(_){ }
    try{ addDonation = addDonationV41; }catch(_){ }
  }

  function installCompraTicketDuplicateGuard(){
    // Neutraliza el salto antiguo Producto+Tienda en el cambio de desplegables. En v40 la clave incluye Ticket.
    if(!window.__ceV401ChangeGuardInstalled){
      window.__ceV401ChangeGuardInstalled = true;
      window.addEventListener('change', ev => {
        const t = ev.target;
        if(!t || !['buyProducto','buyTienda'].includes(t.id)) return;
        try{ if(typeof isLocked === 'function' && isLocked()) return; }catch(_){ }
        try{ if(typeof updateBuyPreview === 'function') updateBuyPreview(); else window.updateBuyPreview?.(); }catch(_){ }
        ev.stopPropagation();
        ev.stopImmediatePropagation();
      }, true);
    }

    const addCompraV40 = function(){
      try{ if(typeof selectedEvent === 'function' && !selectedEvent()) return; }catch(_){ if(!selectedId()) return; }
      const productId = buyInputProduct();
      if(!productId) return;
      const storeId = buyInputStore();
      const rawTicket = buyInputTicket();
      const found = findCompraDuplicate(productId, storeId, rawTicket, '');
      if(found){
        alert(`Ya existe esta compra con el mismo Producto + Tienda + Ticket.\n\nProducto: ${productName(found)}\nTienda: ${storeName(found)}\nTicket: ${ticket(found) || 'Pte.Compra u otros gastos'}\n\nSe muestra el registro existente para modificarlo si procede.`);
        jumpToCompra(found);
        return;
      }
      const rec = {
        id: (typeof uid === 'function' ? uid() : ('id_' + Date.now() + '_' + Math.random().toString(36).slice(2))),
        eventId: selectedId(),
        productoId: productId,
        unidades: num($('buyUnidades')?.value || 0),
        precio: (typeof parseEuroInput === 'function' ? parseEuroInput($('buyPrecio')?.value || 0) : num($('buyPrecio')?.value || 0)),
        ticketDonacion: rawTicket,
        tiendaId: storeId,
        responsableId: $('buyResponsable')?.value || ''
      };
      if(!Array.isArray(st().compras)) st().compras = [];
      st().compras.push(rec);
      ['buyProducto','buyTienda','buyResponsable'].forEach(id => { const el = $(id); if(el) el.value = ''; });
      if($('buyUnidades')) $('buyUnidades').value = '1.00';
      if($('buyPrecio')) $('buyPrecio').value = '0,00 €';
      if($('buyTicket')) $('buyTicket').value = '';
      saveNow();
      setTabCompras();
      renderNow();
      // v41.0: en altas nuevas no se salta al registro recién creado.
      // Solo se posiciona sobre el registro cuando se detecta duplicado antes de insertar.
      setTimeout(() => { try{ $('buyProducto')?.focus?.({preventScroll:true}); }catch(_){} }, 80);
    };
    addCompraV40.__ceV40 = true;
    try{ window.addCompra = addCompraV40; }catch(_){ }
    try{ addCompra = addCompraV40; }catch(_){ }

    if(!window.__ceV401CompraSaveGuardInstalled){
      window.__ceV401CompraSaveGuardInstalled = true;
      window.addEventListener('click', ev => {
        const btn = ev.target?.closest?.('button[data-action="save-compra"]');
        if(!btn) return;
        const id = btn.dataset.id || '';
        const productId = currentEditValue('edit-compra-producto', id);
        const p = product(productId);
        const storeId = currentEditValue('edit-compra-tienda', id) || p.tiendaId || p.defaultTiendaId || '';
        const rawTicket = currentEditValue('edit-compra-ticket', id);
        const found = findCompraDuplicate(productId, storeId, rawTicket, id);
        if(found){
          ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
          alert(`No autorizado. Ya existe otra compra con el mismo Producto + Tienda + Ticket.\n\nSe muestra el registro existente.`);
          jumpToCompra(found);
          return false;
        }
      }, true);
    }
  }

  function activeMaintenancePanel(){
    return document.querySelector('#mtPersonas:not(.hidden),#mtTiendas:not(.hidden),#mtProductos:not(.hidden)');
  }
  function forceScrollMaintenanceTop(){
    const target = activeMaintenancePanel() || document.getElementById('maintenancePanel') || document.getElementById('mantenimiento') || document.body;
    const scrollTop = el => {
      try{
        if(!el) return;
        if(el === window){ window.scrollTo({top:0, left:0, behavior:'smooth'}); return; }
        if(typeof el.scrollTo === 'function') el.scrollTo({top:0, left:0, behavior:'smooth'});
        else el.scrollTop = 0;
      }catch(_){ try{ if(el && el !== window) el.scrollTop = 0; }catch(__){} }
    };
    const nodes = [window, document.scrollingElement, document.documentElement, document.body, target];
    ['main','.app-shell','.app-main','#app','#maintenancePanel','#mantenimiento','.maintenance-panel','.maintenance-tabs'].forEach(sel => {
      try{ const el = document.querySelector(sel); if(el) nodes.push(el); }catch(_){ }
    });
    nodes.forEach(scrollTop);
    try{ target.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){ }
    [120,320,650].forEach(ms => setTimeout(() => {
      nodes.forEach(el => { try{ if(el === window) window.scrollTo({top:0,left:0,behavior:'auto'}); else if(el) el.scrollTop = 0; }catch(_){ } });
      try{ target.scrollIntoView({block:'start'}); }catch(_){ }
    }, ms));
  }
  function ensureMaintenanceTopButton(){
    let btn = $('ceMaintFloatingTopV40');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'ceMaintFloatingTopV40';
      btn.type = 'button';
      btn.className = 'ce-maint-floating-top-v40';
      btn.textContent = '⌂';
      btn.title = 'Volver al inicio';
      btn.setAttribute('aria-label','Volver al inicio en mantenimiento');
      const handler = ev => {
        try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
        forceScrollMaintenanceTop();
        return false;
      };
      btn.addEventListener('click', handler, true);
      btn.addEventListener('pointerup', handler, true);
      btn.addEventListener('touchend', handler, {capture:true, passive:false});
      document.body.appendChild(btn);
    }
    const visiblePanel = activeMaintenancePanel();
    const maintOpen = !!visiblePanel && !document.body.classList.contains('auth-open');
    btn.hidden = !maintOpen;
    btn.classList.toggle('is-visible', maintOpen);
  }

  function injectStyle(){
    if($('ceV40Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV40Style';
    style.textContent = `
      .ce-v40-found{outline:3px solid rgba(146,64,14,.78)!important; box-shadow:0 0 0 7px rgba(251,191,36,.18)!important;}
      .ce-maint-floating-top-v40{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:99997;width:46px;height:46px;border-radius:999px;border:1px solid rgba(148,163,184,.55);background:rgba(255,255,255,.96);color:#0f172a;font-size:24px;font-weight:900;line-height:1;box-shadow:0 12px 26px rgba(15,23,42,.24);cursor:pointer;display:none;align-items:center;justify-content:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}
      .ce-maint-floating-top-v40.is-visible{display:flex;}
      @media (max-width:760px){.ce-maint-floating-top-v40{top:auto;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 82px);transform:none;width:44px;height:44px;font-size:22px;}}
      .mapa-donation-delivered{border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:999px;padding:5px 10px;font-weight:800;white-space:nowrap;cursor:pointer;}
      .mapa-donation-delivered.is-delivered{background:#dcfce7;border-color:#86efac;color:#166534;}
      .donation-delivered-cell{display:flex;align-items:center;justify-content:flex-end;min-width:120px;}
      .mapa-donation-row:has(.mapa-donation-delivered.is-delivered){background:rgba(220,252,231,.45);}
    `;
    document.head.appendChild(style);
  }

  async function ensureExcelJS(){
    if(window.ExcelJS?.Workbook) return window.ExcelJS;
    try{ if(window.ControlEventExcel?.ensureExcelJS) return await window.ControlEventExcel.ensureExcelJS(); }catch(_){ }
    await new Promise((resolve, reject) => {
      const old = document.querySelector('script[data-ce-v40-exceljs]');
      if(old){ old.addEventListener('load', resolve, {once:true}); old.addEventListener('error', reject, {once:true}); return; }
      const s = document.createElement('script');
      s.src = '/vendor/exceljs.min.js';
      s.async = true;
      s.dataset.ceV40Exceljs = '1';
      s.onload = resolve; s.onerror = () => reject(new Error('No se pudo cargar ExcelJS.'));
      document.head.appendChild(s);
    });
    if(!window.ExcelJS?.Workbook) throw new Error('ExcelJS no está disponible.');
    return window.ExcelJS;
  }
  function stamp(date = new Date()){
    const p = n => String(n).padStart(2,'0');
    return {yyyy:date.getFullYear(), mm:p(date.getMonth()+1), dd:p(date.getDate()), hh:p(date.getHours()), mi:p(date.getMinutes()), ss:p(date.getSeconds())};
  }
  function makeDownload(wb, filename){
    return wb.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    });
  }
  function setupBook(ExcelJS){
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB '26`;
    wb.created = new Date();
    const border = {top:{style:'thin',color:{argb:'FFDDE2EA'}},left:{style:'thin',color:{argb:'FFDDE2EA'}},bottom:{style:'thin',color:{argb:'FFDDE2EA'}},right:{style:'thin',color:{argb:'FFDDE2EA'}}};
    const fills = {title:'FF8F3F55', head:'FF111827', soft:'FFF8FAFC', warn:'FFFFE4EC', ok:'FFECFDF5', bad:'FFFEF2F2', white:'FFFFFFFF'};
    const euroFmt = '#,##0.00 [$€-C0A]';
    function ws(name, widths){ const sheet = wb.addWorksheet(name); sheet.columns = widths.map(width => ({width})); sheet.properties.defaultRowHeight = 21; return sheet; }
    function paint(cell, fill='white', bold=false, color='FF111827'){
      cell.border = border;
      cell.alignment = {vertical:'middle', horizontal:'left', wrapText:true};
      if(fills[fill]) cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills[fill]}};
      cell.font = {bold:!!bold, color:{argb:color}};
    }
    function title(sheet, row, text, cols){ sheet.mergeCells(row,1,row,cols); const c = sheet.getCell(row,1); c.value = text; paint(c,'title',true,'FFFFFFFF'); c.alignment = {vertical:'middle', horizontal:'center', wrapText:true}; sheet.getRow(row).height = 26; }
    function headers(sheet, row, list){ list.forEach((h,i) => { const c = sheet.getCell(row,i+1); c.value = h; paint(c,'head',true,'FFFFFFFF'); c.alignment = {vertical:'middle', horizontal:'center', wrapText:true}; }); sheet.getRow(row).height = 24; sheet.views = [{state:'frozen', ySplit: row}]; }
    function text(sheet,r,c,v,fill='white',bold=false){ const cell = sheet.getCell(r,c); cell.value = v == null ? '' : String(v); paint(cell,fill,bold); return cell; }
    function number(sheet,r,c,v,fill='white',bold=false){ const cell = sheet.getCell(r,c); cell.value = money(v); cell.numFmt = '#,##0.##'; paint(cell,fill,bold); cell.alignment = {vertical:'middle', horizontal:'right', wrapText:false}; return cell; }
    function euro(sheet,r,c,v,fill='white',bold=false){ const cell = sheet.getCell(r,c); cell.value = money(v); cell.numFmt = euroFmt; paint(cell,fill,bold); cell.alignment = {vertical:'middle', horizontal:'right', wrapText:false}; return cell; }
    function autoFilter(sheet, headerRow, cols){ try{ sheet.autoFilter = {from:{row:headerRow,column:1}, to:{row:headerRow,column:cols}}; }catch(_){ } }
    return {wb, ws, title, headers, text, number, euro, autoFilter};
  }
  function eventRows(){ return arr('eventos'); }
  function makeCodes(items, prefix){ const out = {}; (items || []).forEach((item, i) => { out[String(item.id)] = prefix + String(i + 1).padStart(prefix === 'EV' ? 3 : 4, '0'); }); return out; }
  function selectedRows(){
    const ev = currentEvent();
    const comprasRows = comprasForEvent();
    const collabRows = arr('colaboradores').filter(c => String(c.eventId || '') === selectedId());
    return {ev, comprasRows, collabRows};
  }
  function collabValue(row){
    const ev = currentEvent() || {};
    const persona = person(row.personaId);
    const esSocio = up(persona.rango) === 'SOCIO';
    const numero = num(row.numero);
    const obligatorio = esSocio ? money(numero * num(ev.precio)) : 0;
    const voluntario = money(row.importe ?? row.donation ?? 0);
    const total = money(row.total ?? obligatorio + voluntario);
    const ingresado = up(row.situacion) === 'PENDIENTE' ? 0 : total;
    const pendiente = up(row.situacion) === 'PENDIENTE' ? total : 0;
    return {persona, numero, obligatorio, voluntario, total, ingresado, pendiente};
  }
  function summary(){
    const {comprasRows, collabRows} = selectedRows();
    const ingresos = collabRows.map(collabValue);
    const ingresoDinero = money(ingresos.reduce((a,b) => a + b.ingresado, 0));
    const pendienteIngresos = money(ingresos.reduce((a,b) => a + b.pendiente, 0));
    const donado = money(comprasRows.filter(c => isDonation(ticket(c))).reduce((a,b) => a + value(b), 0));
    const comprado = money(comprasRows.filter(c => !isDonation(ticket(c)) && !isCurrentExpense(ticket(c)) && ticket(c)).reduce((a,b) => a + value(b), 0));
    const pendiente = money(comprasRows.filter(c => !isDonation(ticket(c)) && !ticket(c)).reduce((a,b) => a + value(b), 0));
    const gastos = money(comprasRows.filter(c => isCurrentExpense(ticket(c))).reduce((a,b) => a + value(b), 0));
    return {ingresoDinero, pendienteIngresos, donado, comprado, pendiente, gastos, saldoActual: money(ingresoDinero - comprado - gastos), saldoOperativo: money(ingresoDinero - comprado - gastos - pendiente)};
  }
  function grouping(kind){
    const rows = comprasForEvent();
    const labels = Array.from(new Set(rows.map(row => kind === 'segmento' ? segmentName(row) : destinoName(row)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es'));
    return labels.map(label => {
      const subset = rows.filter(row => (kind === 'segmento' ? segmentName(row) : destinoName(row)) === label);
      const comprado = subset.filter(c => !isDonation(ticket(c)) && !isCurrentExpense(ticket(c)) && ticket(c)).reduce((a,b)=>a+value(b),0);
      const donado = subset.filter(c => isDonation(ticket(c))).reduce((a,b)=>a+value(b),0);
      const pendiente = subset.filter(c => !isDonation(ticket(c)) && !ticket(c)).reduce((a,b)=>a+value(b),0);
      const gastos = subset.filter(c => isCurrentExpense(ticket(c))).reduce((a,b)=>a+value(b),0);
      return {label, comprado:money(comprado), donado:money(donado), pendiente:money(pendiente), gastos:money(gastos), total:money(comprado+donado+pendiente+gastos)};
    });
  }
  function tiendaTicket(){
    const map = new Map();
    comprasForEvent().forEach(row => {
      const label = isDonation(ticket(row)) ? `DONACION · ${donorName(row)} · ${ticket(row)}` : `${storeName(row)} · ${ticket(row) || 'Pte.Compra u otros gastos'}`;
      if(!map.has(label)) map.set(label, {label, importe:0, unidades:0, lineas:0});
      const item = map.get(label);
      item.importe += value(row); item.unidades += units(row); item.lineas += 1;
    });
    return Array.from(map.values()).sort((a,b)=>a.label.localeCompare(b.label,'es')).map(x => ({...x, importe:money(x.importe)}));
  }
  async function exportInfoEventoV40(){
    const ev = currentEvent();
    if(!ev){ alert('Elige un evento antes de sacar INFOEVENTO.'); return; }
    if(isRO() && !isFinalized()){ alert('Usuario RO: solo puede sacar INFOEVENTO si el evento está Finalizado.'); return; }
    const ExcelJS = await ensureExcelJS();
    const x = setupBook(ExcelJS);
    const t = stamp();
    const emitted = `©oltyLAB '26_${VERSION_FILE}_${t.dd}${t.mm}${t.yyyy}_${t.hh}:${t.mi}:${t.ss}`;
    const s = summary();
    let r = 1;
    const wsR = x.ws('RESUMEN', [32,55,18,18,18,18]);
    x.text(wsR,r,1,'Emitido por','soft',true); wsR.mergeCells(r,2,r,6); x.text(wsR,r++,2,emitted,'soft',true);
    x.title(wsR,r++,'RESUMEN DEL EVENTO',6);
    x.text(wsR,r,1,'Título del evento','white',true); wsR.mergeCells(r,2,r,6); x.text(wsR,r++,2,ev.titulo || '','white',true);
    const descRows = Math.max(2, Math.min(10, Math.ceil(norm(ev.descripcion).length / 85) || 2));
    x.text(wsR,r,1,'Descripción del evento','white',true); wsR.mergeCells(r,2,r + descRows - 1,6); x.text(wsR,r,2,ev.descripcion || '','soft'); wsR.getCell(r,2).alignment = {vertical:'top', horizontal:'left', wrapText:true}; for(let rr=r; rr<r+descRows; rr++) wsR.getRow(rr).height = 23; r += descRows;
    [['Situación', ev.situacion || ''],['Fecha inicio', ev.fechaIni || ''],['Fecha fin', ev.fechaFin || ''],['Precio evento', fmtMoney(ev.precio || 0)]].forEach(([a,b]) => { x.text(wsR,r,1,a,'white',true); x.text(wsR,r++,2,b); });
    r++;
    x.headers(wsR,r++,['Concepto','Importe','','','','']);
    [['Ingreso dinero',s.ingresoDinero],['Pendiente ingresos',s.pendienteIngresos],['Comprado',s.comprado],['Gastos organización',s.gastos],['Pte.Compra u otros gastos',s.pendiente],['Donación de producto',s.donado],['Saldo actual',s.saldoActual],['Saldo operativo',s.saldoOperativo]].forEach(([label,val]) => { x.text(wsR,r,1,label,val < 0 ? 'bad' : 'white', true); x.euro(wsR,r++,2,val,val < 0 ? 'bad' : 'white', true); });

    const wsI = x.ws('INGRESOS', [34,12,18,18,18,18,18,18]);
    x.title(wsI,1,'INGRESOS',8); x.headers(wsI,3,['Colaborador/a','Rango','Número','Situación','Obligatorio','Voluntario','Ingresado','Pendiente']);
    r = 4; selectedRows().collabRows.slice().sort((a,b)=>norm(person(a.personaId).nombre).localeCompare(norm(person(b.personaId).nombre), 'es')).forEach(row => { const cv = collabValue(row); x.text(wsI,r,1,cv.persona.nombre || ''); x.text(wsI,r,2,cv.persona.rango || ''); x.number(wsI,r,3,cv.numero); x.text(wsI,r,4,row.situacion || ''); x.euro(wsI,r,5,cv.obligatorio); x.euro(wsI,r,6,cv.voluntario); x.euro(wsI,r,7,cv.ingresado); x.euro(wsI,r++,8,cv.pendiente, cv.pendiente ? 'warn' : 'white'); }); x.autoFilter(wsI,3,8);

    const wsC = x.ws('COMPRAS Y OTROS GASTOS', [30,12,14,16,26,26,26,20,18]);
    x.title(wsC,1,'COMPRAS Y OTROS GASTOS',9); x.headers(wsC,3,['Producto','Unidades','Precio','Importe','Ticket u otros gastos','Tienda','Responsable','Segmento','Destino']);
    r = 4; selectedRows().comprasRows.filter(row => !isDonation(ticket(row))).sort((a,b)=>segmentName(a).localeCompare(segmentName(b),'es') || productName(a).localeCompare(productName(b),'es')).forEach(row => { x.text(wsC,r,1,productName(row)); x.number(wsC,r,2,units(row)); x.euro(wsC,r,3,price(row)); x.euro(wsC,r,4,value(row), !ticket(row) ? 'warn' : 'white'); x.text(wsC,r,5,ticket(row) || 'Pte.Compra u otros gastos'); x.text(wsC,r,6,storeName(row)); x.text(wsC,r,7,responsibleName(row)); x.text(wsC,r,8,segmentName(row)); x.text(wsC,r++,9,destinoName(row)); }); x.autoFilter(wsC,3,9);

    const wsD = x.ws('DONACIONES DE PRODUCTO', [30,12,14,16,22,30,26,20,18,16]);
    x.title(wsD,1,'DONACIONES DE PRODUCTO',10); x.headers(wsD,3,['Producto','Unidades','Precio','Valor estimado','Tipo donación','Donante','Responsable','Segmento','Destino','Entregado']);
    r = 4; selectedRows().comprasRows.filter(row => isDonation(ticket(row))).sort((a,b)=>segmentName(a).localeCompare(segmentName(b),'es') || productName(a).localeCompare(productName(b),'es') || donorName(a).localeCompare(donorName(b),'es')).forEach(row => { const delivered = row.donacionEntregada || row.entregadoDonacion || row.entregado === true; x.text(wsD,r,1,productName(row)); x.number(wsD,r,2,units(row)); x.euro(wsD,r,3,price(row)); x.euro(wsD,r,4,value(row)); x.text(wsD,r,5,ticket(row)); x.text(wsD,r,6,donorName(row)); x.text(wsD,r,7,responsibleName(row)); x.text(wsD,r,8,segmentName(row)); x.text(wsD,r,9,destinoName(row)); x.text(wsD,r++,10,delivered ? 'SI' : 'NO', delivered ? 'ok' : 'warn'); }); x.autoFilter(wsD,3,10);

    function sheetGrouping(name, title, rows){ const ws = x.ws(name,[32,16,16,22,18,18]); x.title(ws,1,title,6); x.headers(ws,3,[name.includes('SEGMENTO')?'Segmento':'Destino','Comprado','Donado','Pte.Compra','Gastos org.','Total']); let rr = 4; rows.forEach(it => { x.text(ws,rr,1,it.label); x.euro(ws,rr,2,it.comprado); x.euro(ws,rr,3,it.donado); x.euro(ws,rr,4,it.pendiente,it.pendiente?'warn':'white'); x.euro(ws,rr,5,it.gastos); x.euro(ws,rr++,6,it.total); }); x.autoFilter(ws,3,6); }
    sheetGrouping('CALCULOS_SEGMENTO','CALCULOS POR SEGMENTO',grouping('segmento'));
    sheetGrouping('CALCULOS_DESTINO','CALCULOS POR DESTINO',grouping('destino'));

    const wsTT = x.ws('CALCULOS_TIENDA_TICKET', [54,16,16,16]);
    x.title(wsTT,1,'CALCULOS POR TIENDA Y TICKET',4); x.headers(wsTT,3,['Tienda / Ticket / Donación','Importe','Unidades','Líneas']);
    r = 4; tiendaTicket().forEach(row => { x.text(wsTT,r,1,row.label); x.euro(wsTT,r,2,row.importe); x.number(wsTT,r,3,row.unidades); x.number(wsTT,r++,4,row.lineas); }); x.autoFilter(wsTT,3,4);

    const wsG = x.ws('GRAFICAS', [34,18,18]);
    x.title(wsG,1,'GRAFICAS DEL EVENTO - DATOS BASE',3); x.headers(wsG,3,['Concepto','Valor','Observación']);
    r = 4; [['INGRESOS',s.ingresoDinero,''],['DONACION DE PRODUCTO',s.donado,''],['GASTOS',money(s.comprado+s.gastos),''],['PTE.COMPRA',s.pendiente,''],['SALDO ACTUAL',s.saldoActual,s.saldoActual < 0 ? 'Negativo' : ''],['SALDO OPERATIVO',s.saldoOperativo,s.saldoOperativo < 0 ? 'Negativo' : '']].forEach(([a,b,c]) => { x.text(wsG,r,1,a,b < 0 ? 'bad' : 'white', true); x.euro(wsG,r,2,b,b < 0 ? 'bad' : 'white', true); x.text(wsG,r++,3,c); });

    await makeDownload(x.wb, `${VERSION_FILE}_INFOEVENTO-${cleanFilePart(ev.titulo || 'EVENTO')}_${t.yyyy}${t.mm}${t.dd}.xlsx`);
  }

  function scopeState(scope){
    const all = scope === 'TODOS';
    const eventos = all ? arr('eventos').slice() : arr('eventos').filter(e => String(e.id) === String(scope));
    const eventIds = new Set(eventos.map(e => String(e.id)));
    const comprasRows = arr('compras').filter(c => all || eventIds.has(String(c.eventId)));
    const collabRows = arr('colaboradores').filter(c => all || eventIds.has(String(c.eventId)));
    const personIds = new Set();
    const storeIds = new Set();
    const productIds = new Set();
    collabRows.forEach(c => { if(c.personaId) personIds.add(String(c.personaId)); });
    comprasRows.forEach(c => { if(c.responsableId) personIds.add(String(c.responsableId)); const d = norm(c.donorRef); if(d.startsWith('P:')) personIds.add(d.slice(2)); if(d.startsWith('T:')) storeIds.add(d.slice(2)); if(c.tiendaId) storeIds.add(String(c.tiendaId)); if(c.productoId) productIds.add(String(c.productoId)); });
    return {
      eventos,
      personas: all ? arr('personas').slice() : arr('personas').filter(p => personIds.has(String(p.id))),
      tiendas: all ? arr('tiendas').slice() : arr('tiendas').filter(t => storeIds.has(String(t.id))),
      productos: all ? arr('productos').slice() : arr('productos').filter(p => productIds.has(String(p.id))),
      colaboradores: collabRows,
      compras: comprasRows,
      ticketImages: st().ticketImages && typeof st().ticketImages === 'object' ? st().ticketImages : {}
    };
  }
  function chooseBackupScope(){
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'ce-backup-overlay-v181';
      const evs = eventRows();
      overlay.innerHTML = `<div class="ce-backup-modal-v181"><h3>Descarga de datos</h3><p>Elige si quieres descargar todos los datos o solo los vinculados a un evento concreto.</p><div class="field"><label>Evento a descargar</label><select id="ceBackupScopeV40"><option value="TODOS">TODOS los eventos</option>${evs.map(e => `<option value="${esc(e.id)}" ${String(e.id)===selectedId()?'selected':''}>${esc(e.titulo || e.id)}</option>`).join('')}</select></div><div class="ce-backup-actions-v181"><button type="button" class="outline" id="ceBackupCancelV40">Cancelar</button><button type="button" id="ceBackupOkV40">Descargar</button></div></div>`;
      document.body.appendChild(overlay);
      const done = value => { overlay.remove(); resolve(value); };
      overlay.querySelector('#ceBackupCancelV40')?.addEventListener('click', () => done(null));
      overlay.querySelector('#ceBackupOkV40')?.addEventListener('click', () => done(overlay.querySelector('#ceBackupScopeV40')?.value || 'TODOS'));
      overlay.addEventListener('click', ev => { if(ev.target === overlay) done(null); });
    });
  }
  function ticketEventIdFromKey(key){ return String(key || '').split('|')[0] || ''; }
  function ticketInnerKeyFromKey(key){ const parts = String(key || '').split('|'); return parts.slice(1).join('|').trim(); }
  function splitLongText(text, size = 30000){ const s = String(text || ''); const out = []; for(let i=0;i<s.length;i+=size) out.push(s.slice(i,i+size)); return out.length ? out : ['']; }
  function backupServerUrl(scope){
    const params = new URLSearchParams({scope: scope || 'TODOS', t: String(Date.now())});
    return `/api/export/backup?${params.toString()}`;
  }
  function filenameFromDisposition(disposition){
    const text = String(disposition || '');
    const utf = text.match(/filename\*=UTF-8''([^;]+)/i);
    if(utf){ try{ return decodeURIComponent(utf[1]); }catch(_){ return utf[1]; } }
    const plain = text.match(/filename="?([^";]+)"?/i);
    return plain ? plain[1] : '';
  }
  async function downloadServerBackup(scope){
    const response = await fetch(backupServerUrl(scope), {cache:'no-store'});
    if(!response.ok){
      let detail = '';
      try{ const data = await response.json(); detail = data?.error || JSON.stringify(data); }
      catch(_){ detail = await response.text().catch(()=> ''); }
      throw new Error(`Servidor no generó backup (${response.status}). ${detail || ''}`.trim());
    }
    const blob = await response.blob();
    if(!blob || blob.size === 0) throw new Error('El servidor devolvió un backup vacío.');
    const filename = filenameFromDisposition(response.headers.get('content-disposition')) || `${VERSION_FILE}_BACKUP_${scope || 'TODOS'}.xlsx`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try{ URL.revokeObjectURL(a.href); }catch(_){} try{ a.remove(); }catch(_){} }, 1600);
    return {ok:true, source:'server-api-export', scope, filename, size: blob.size};
  }
  async function exportBackupV40(){
    if(!isGD()){ alert('Solo GD puede realizar descarga de datos.'); return; }
    const scope = await chooseBackupScope();
    if(!scope) return;
    // v43.8: se vuelve al backup generado por servidor. Evita el RangeError
    // "Maximum call stack size exceeded" provocado por crear el Excel completo en el navegador.
    return downloadServerBackup(scope);
  }

  function exportInfoEventoLegacy(){
    try{
      if(typeof window.exportExcel === 'function') return window.exportExcel();
    }catch(err){ return Promise.reject(err); }
    try{
      if(window.ControlEventExcel?.run) return window.ControlEventExcel.run('exportExcel', {source:'v43.8-legacy-infoevento'});
    }catch(err){ return Promise.reject(err); }
    alert('INFOEVENTO no está disponible todavía. Espera a que termine de cargar la app y vuelve a intentarlo.');
  }

  function installExcelGuards(){
    // v43.8: no se intercepta BACKUP ni INFOEVENTO desde este parche.
    // Se conserva el motor original de Excel (legacy/modular) que generaba los ficheros correctos.
    return false;
  }


  function install(){
    injectStyle();
    applyVersion();
    installCompraTicketDuplicateGuard();
    installDonationDuplicateGuard();
    installExcelGuards();
    ensureMaintenanceTopButton();
  }

  window.ControlEventV40 = {version: VERSION, install, exportInfoEvento: exportInfoEventoLegacy, exportBackup: exportBackupV40, duplicateKey:'producto+tienda+ticket', donationDuplicateKey:'producto+donante', addNewDoesNotJump:true};
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  document.addEventListener('scroll', () => ensureMaintenanceTopButton(), true);
  document.addEventListener('click', () => setTimeout(() => { applyVersion(); ensureMaintenanceTopButton(); installCompraTicketDuplicateGuard(); installDonationDuplicateGuard(); installExcelGuards(); }, 60), true);
  [0,120,500,1200,2500].forEach(ms => setTimeout(install, ms));
})();
