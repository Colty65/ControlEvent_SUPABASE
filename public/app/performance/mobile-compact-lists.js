/* ControlEvent v1.0/pr - Modo móvil compacto para listas pesadas.
   Objetivo: reducir DOM en iPad/Android sin tocar INFOEVENTO, BACKUP ni datos. */
(function(){
  const VERSION = 'ControlEvent v1.0/pr';
  const STORE = 'controlevent:v28.10:mobileCompactLists';
  const DEFAULT_PAGE = 12;
  const PRODUCT_PAGE = 24;
  const stateLocal = {
    installed: false,
    enabled: false,
    autoDetected: false,
    pages: {compras:0, donaciones:0, productos:0},
    full: {compras:false, donaciones:false, productos:false},
    counts: {compras:0, donaciones:0, productos:0},
    lastRenderMs: {compras:0, donaciones:0, productos:0}
  };
  const originals = {};

  const $ = id => document.getElementById(id);
  const str = v => String(v ?? '');
  const esc = v => str(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const num = v => Number(v || 0) || 0;
  const money = v => {
    try{
      if(typeof moneyTextV === 'function') return moneyTextV(v);
      if(typeof euroText === 'function') return euroText(v);
    }catch(_){ }
    return num(v).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €';
  };
  const parsePrice = p => {
    try{ if(typeof productRefPrice === 'function') return productRefPrice(p); }catch(_){ }
    return Number(p?.defaultPrecio ?? p?.precio ?? 0) || 0;
  };
  const productName = id => {
    const p = (window.state?.productos || []).find(x => x.id === id);
    return p?.nombre || 'Producto sin nombre';
  };
  const tiendaName = id => {
    const t = (window.state?.tiendas || []).find(x => x.id === id);
    return t?.nombre || '';
  };
  const personaName = id => {
    const p = (window.state?.personas || []).find(x => x.id === id);
    return p?.nombre || '';
  };
  const isAndroid = () => /Android/i.test(navigator.userAgent || '');
  const isIPad = () => /iPad/i.test(navigator.userAgent || '') || ((navigator.platform === 'MacIntel') && navigator.maxTouchPoints > 1);
  const isIPhone = () => /iPhone/i.test(navigator.userAgent || '');
  const lowMemory = () => Number(navigator.deviceMemory || 8) <= 4;
  function autoShouldEnable(){
    return isAndroid() || isIPad() || lowMemory();
  }
  function readStored(){
    try{ return localStorage.getItem(STORE); }catch(_){ return null; }
  }
  function writeStored(v){
    try{ localStorage.setItem(STORE, v); }catch(_){ }
  }
  function decideEnabled(){
    const stored = readStored();
    if(stored === 'on') return true;
    if(stored === 'off') return false;
    stateLocal.autoDetected = autoShouldEnable();
    return stateLocal.autoDetected;
  }
  function isEnabled(){ return !!stateLocal.enabled; }
  function canUse(){ return !!window.state && !!document.body; }
  function isDonationTicketValue(v){
    try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ }
    const s = str(v).toUpperCase();
    return s.includes('DON') || s.includes('SOCIO') || s.includes('TIENDA');
  }
  function comprasRows(){
    try{ if(typeof comprasForEvent === 'function') return comprasForEvent().filter(r => !isDonationTicketValue(r.ticketDonacion)).slice(); }catch(_){ }
    const ev = window.state?.selectedEventId || '';
    return (window.state?.compras || []).filter(r => r.eventId === ev && !isDonationTicketValue(r.ticketDonacion)).map(r => ({...r, producto:(window.state.productos||[]).find(p=>p.id===r.productoId)}));
  }
  function donacionesRows(){
    try{ if(typeof comprasForEvent === 'function') return comprasForEvent().filter(r => isDonationTicketValue(r.ticketDonacion)).slice(); }catch(_){ }
    const ev = window.state?.selectedEventId || '';
    return (window.state?.compras || []).filter(r => r.eventId === ev && isDonationTicketValue(r.ticketDonacion)).map(r => ({...r, producto:(window.state.productos||[]).find(p=>p.id===r.productoId)}));
  }
  function productosRows(){
    try{ if(typeof productosGenerales === 'function') return productosGenerales().slice(); }catch(_){ }
    return (window.state?.productos || []).slice();
  }
  function sortCompras(rows){
    const sort = window.state?.comprasSort || 'producto';
    rows.sort((a,b)=>{
      if(sort === 'ticket') return str(a.ticketDonacion).localeCompare(str(b.ticketDonacion),'es') || productName(a.productoId).localeCompare(productName(b.productoId),'es');
      if(sort === 'tienda') return tiendaName(a.tiendaId).localeCompare(tiendaName(b.tiendaId),'es') || productName(a.productoId).localeCompare(productName(b.productoId),'es');
      if(sort === 'responsable') return personaName(a.responsableId).localeCompare(personaName(b.responsableId),'es') || productName(a.productoId).localeCompare(productName(b.productoId),'es');
      return productName(a.productoId).localeCompare(productName(b.productoId),'es') || str(a.ticketDonacion).localeCompare(str(b.ticketDonacion),'es');
    });
    return rows;
  }
  function sortDonaciones(rows){
    const sort = window.state?.donacionesSort || 'producto';
    rows.sort((a,b)=>{
      if(sort === 'ticket') return str(a.ticketDonacion).localeCompare(str(b.ticketDonacion),'es') || productName(a.productoId).localeCompare(productName(b.productoId),'es');
      if(sort === 'donante') return str(a.donorLabel || a.donorRef || '').localeCompare(str(b.donorLabel || b.donorRef || ''),'es') || productName(a.productoId).localeCompare(productName(b.productoId),'es');
      if(sort === 'responsable') return personaName(a.responsableId).localeCompare(personaName(b.responsableId),'es') || productName(a.productoId).localeCompare(productName(b.productoId),'es');
      return productName(a.productoId).localeCompare(productName(b.productoId),'es');
    });
    return rows;
  }
  function sortProductos(rows){
    let sort = 'nombre';
    try{ sort = currentProductSort || 'nombre'; }catch(_){ }
    rows.sort((a,b)=>{
      if(sort === 'precio') return parsePrice(a) - parsePrice(b) || str(a.nombre).localeCompare(str(b.nombre),'es');
      return str(a[sort] || '').localeCompare(str(b[sort] || ''),'es');
    });
    return rows;
  }
  function ticketOptions(selected){
    const opts = (window.PURCHASE_TICKET_OPTIONS || (typeof PURCHASE_TICKET_OPTIONS !== 'undefined' ? PURCHASE_TICKET_OPTIONS : ['', 'TK01', 'TK02', 'TK03', 'TK04', 'TK05']));
    return opts.map(v => `<option value="${esc(v)}" ${v===selected?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('');
  }
  function donationTicketOptions(selected){
    const opts = (window.DONATION_TICKET_OPTIONS || (typeof DONATION_TICKET_OPTIONS !== 'undefined' ? DONATION_TICKET_OPTIONS : ['TIENDA','SOCIO','NO SOCIO']));
    return opts.map(v => `<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
  }
  function tiendaOptions(selected){
    const rows = (window.state?.tiendas || []).slice().sort((a,b)=>str(a.nombre).localeCompare(str(b.nombre),'es'));
    return `<option value="" ${!selected?'selected':''}>-- elige tienda --</option>` + rows.map(t=>`<option value="${esc(t.id)}" ${t.id===selected?'selected':''}>${esc(t.nombre)}</option>`).join('');
  }
  function responsableOptions(selected){
    let rows = [];
    try{ if(typeof socioResponsableOptions === 'function') rows = socioResponsableOptions().slice(); }catch(_){ }
    return `<option value="" ${!selected?'selected':''}>-- sin responsable --</option>` + rows.map(p=>`<option value="${esc(p.value)}" ${p.value===selected?'selected':''}>${esc(p.label)}</option>`).join('');
  }
  function donorOptionsHtml(selected){
    let rows = [];
    try{ if(typeof donorOptions === 'function') rows = donorOptions().slice(); }catch(_){ }
    return `<option value="" ${!selected?'selected':''}>-- elige donante --</option>` + rows.map(p=>`<option value="${esc(p.value)}" ${p.value===selected?'selected':''}>${esc(p.label)}</option>`).join('');
  }
  function segmentOptions(selected){
    const opts = (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS : ['COMIDA','BEBIDA','INFRAESTRUCTURA']);
    return opts.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
  }
  function destinoOptions(selected){
    const opts = (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS : ['APERITIVO','COMIDA','CENA','CUBATAS','INFRAESTRUCTURA']);
    return opts.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
  }
  function pagerHTML(kind, total, page, pageSize){
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const from = total ? page * pageSize + 1 : 0;
    const to = Math.min(total, (page + 1) * pageSize);
    return `<div class="ce-mobile-list-toolbar">
      <strong>Modo móvil compacto</strong><span>${from}-${to} de ${total}</span>
      <button type="button" class="outline small" data-ce-mobile-list="prev" data-kind="${kind}" ${page<=0?'disabled':''}>Anterior</button>
      <button type="button" class="outline small" data-ce-mobile-list="next" data-kind="${kind}" ${page>=pages-1?'disabled':''}>Siguiente</button>
      <button type="button" class="outline small" data-ce-mobile-list="full" data-kind="${kind}">Vista completa</button>
    </div>`;
  }
  function compactStyles(){
    if($('ceMobileCompactListsStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceMobileCompactListsStyle';
    st.textContent = `
      .ce-mobile-list-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0 12px;padding:8px 10px;border:1px solid #dbe7f4;border-radius:14px;background:#f8fbff;font-size:13px}
      .ce-mobile-list-toolbar span{color:#475569;margin-right:auto}
      .ce-mobile-row .rowline{grid-template-columns:1.4fr .7fr .9fr .9fr .8fr !important;gap:8px !important}
      .ce-mobile-row .ce-product-label{font-weight:800;color:#0f172a;padding:10px 12px;border:1px solid #d7e2ee;border-radius:12px;background:#fff;min-height:38px;display:flex;align-items:center}
      .ce-mobile-row .ce-sub{font-size:12px;color:#64748b;font-weight:600;margin-top:3px}
      @media (max-width: 780px){
        .ce-mobile-row .rowline{display:grid !important;grid-template-columns:1fr !important}
        .ce-mobile-row .field label{font-size:12px}
        .ce-mobile-list-toolbar{position:sticky;top:0;z-index:5}
      }`;
    document.head.appendChild(st);
  }
  function sliceRows(kind, rows, pageSize){
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    stateLocal.pages[kind] = Math.min(Math.max(0, stateLocal.pages[kind] || 0), pages-1);
    const page = stateLocal.pages[kind];
    return {page, pageSize, subset: rows.slice(page * pageSize, page * pageSize + pageSize)};
  }
  function renderComprasCompact(){
    if(!isEnabled() || stateLocal.full.compras) return originals.renderCompras?.();
    const t0 = performance.now();
    const wrap = $('comprasList');
    if(!wrap) return originals.renderCompras?.();
    const rows = sortCompras(comprasRows());
    stateLocal.counts.compras = rows.length;
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>'; return; }
    const {page, pageSize, subset} = sliceRows('compras', rows, DEFAULT_PAGE);
    wrap.innerHTML = pagerHTML('compras', rows.length, page, pageSize) + '<div class="hint">Ordenar por: <a href="#" onclick="state.comprasSort=\'producto\'; renderCompras(); return false;">Producto</a> · <a href="#" onclick="state.comprasSort=\'ticket\'; renderCompras(); return false;">Ticket</a> · <a href="#" onclick="state.comprasSort=\'tienda\'; renderCompras(); return false;">Tienda</a> · <a href="#" onclick="state.comprasSort=\'responsable\'; renderCompras(); return false;">Responsable</a></div>';
    subset.forEach(r=>{
      const row = document.createElement('div');
      row.className = 'itemcard ce-mobile-row' + (str(r.ticketDonacion).trim()==='' ? ' red-row' : '');
      row.innerHTML = `<input type="hidden" data-action="edit-compra-producto" data-id="${esc(r.id)}" value="${esc(r.productoId)}" />
        <div class="rowline compra">
          <div><label>Producto</label><div class="ce-product-label">${esc(r.producto?.nombre || productName(r.productoId))}</div><div class="ce-sub">Vista compacta: usa “Vista completa” para cambiar el producto</div></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${num(r.unidades)}" data-action="edit-compra-unidades" data-id="${esc(r.id)}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${money(r.precioCalc ?? r.precio ?? 0)}" data-action="edit-compra-precio" data-id="${esc(r.id)}" /></div>
          <div class="field"><label>Importe</label><input class="soft-readonly" readonly value="${money(r.importe ?? (num(r.unidades)*num(r.precio)))}" /></div>
          <div class="field"><label>Ticket</label><select data-action="edit-compra-ticket" data-id="${esc(r.id)}">${ticketOptions(r.ticketDonacion || '')}</select></div>
          <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${esc(r.id)}">${tiendaOptions(r.tiendaId || '')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${esc(r.id)}">${responsableOptions(r.responsableId || '')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-compra" data-id="${esc(r.id)}">Modificar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${esc(r.id)}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
    stateLocal.lastRenderMs.compras = Math.round((performance.now()-t0)*10)/10;
  }
  function renderDonacionesCompact(){
    if(!isEnabled() || stateLocal.full.donaciones) return originals.renderDonaciones?.();
    const t0 = performance.now();
    const wrap = $('donacionesList');
    if(!wrap) return originals.renderDonaciones?.();
    const rows = sortDonaciones(donacionesRows());
    stateLocal.counts.donaciones = rows.length;
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay donaciones de producto para este evento.</div>'; return; }
    const {page, pageSize, subset} = sliceRows('donaciones', rows, DEFAULT_PAGE);
    wrap.innerHTML = pagerHTML('donaciones', rows.length, page, pageSize) + '<div class="hint">Ordenar por: <a href="#" onclick="state.donacionesSort=\'producto\'; renderDonaciones(); return false;">Producto</a> · <a href="#" onclick="state.donacionesSort=\'ticket\'; renderDonaciones(); return false;">Tipo</a> · <a href="#" onclick="state.donacionesSort=\'donante\'; renderDonaciones(); return false;">Donante</a> · <a href="#" onclick="state.donacionesSort=\'responsable\'; renderDonaciones(); return false;">Responsable</a></div>';
    subset.forEach(r=>{
      const row = document.createElement('div');
      row.className = 'itemcard ce-mobile-row';
      row.innerHTML = `<input type="hidden" data-action="edit-donacion-producto" data-id="${esc(r.id)}" value="${esc(r.productoId)}" />
        <div class="rowline compra">
          <div><label>Producto</label><div class="ce-product-label">${esc(r.producto?.nombre || productName(r.productoId))}</div><div class="ce-sub">Vista compacta: usa “Vista completa” para cambiar el producto</div></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${num(r.unidades)}" data-action="edit-donacion-unidades" data-id="${esc(r.id)}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${money(r.precioCalc ?? r.precio ?? 0)}" data-action="edit-donacion-precio" data-id="${esc(r.id)}" /></div>
          <div class="field"><label>Valor</label><input class="soft-readonly" readonly value="${money(r.valor ?? (num(r.unidades)*num(r.precio)))}" /></div>
          <div class="field"><label>Tipo</label><select data-action="edit-donacion-ticket" data-id="${esc(r.id)}">${donationTicketOptions(r.ticketDonacion || '')}</select></div>
          <div class="field"><label>Donante</label><select data-action="edit-donacion-donante" data-id="${esc(r.id)}">${donorOptionsHtml(r.donorRef || '')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-donacion-responsable" data-id="${esc(r.id)}">${responsableOptions(r.responsableId || '')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-donacion" data-id="${esc(r.id)}">Modificar</button><button type="button" class="danger small" data-action="delete-donacion" data-id="${esc(r.id)}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
    stateLocal.lastRenderMs.donaciones = Math.round((performance.now()-t0)*10)/10;
  }
  function renderProductosCompact(){
    if(!isEnabled() || stateLocal.full.productos) return originals.renderProductos?.();
    const t0 = performance.now();
    try{ if(typeof ensureProductRefPrices === 'function') ensureProductRefPrices(); }catch(_){ }
    const wrap = $('productosList');
    if(!wrap) return originals.renderProductos?.();
    const seg = $('newProductoSegmento'); if(seg) seg.innerHTML = segmentOptions(seg.value || 'COMIDA');
    const des = $('newProductoDestino'); if(des) des.innerHTML = destinoOptions(des.value || 'APERITIVO');
    if($('newProductoPrecio') && !$('newProductoPrecio').value) $('newProductoPrecio').value = '0,00 €';
    const rows = sortProductos(productosRows());
    stateLocal.counts.productos = rows.length;
    if(!rows.length){ wrap.innerHTML = '<div class="empty">No hay productos.</div>'; return; }
    const {page, pageSize, subset} = sliceRows('productos', rows, PRODUCT_PAGE);
    wrap.innerHTML = pagerHTML('productos', rows.length, page, pageSize) + '<div class="hint">Ordenar por: <a href="#" onclick="currentProductSort=\'nombre\'; renderProductos(); return false;">Nombre</a> · <a href="#" onclick="currentProductSort=\'segmento\'; renderProductos(); return false;">Segmento</a> · <a href="#" onclick="currentProductSort=\'destino\'; renderProductos(); return false;">Destino</a> · <a href="#" onclick="currentProductSort=\'precio\'; renderProductos(); return false;">Precio referencia</a></div>';
    subset.forEach(p=>{
      const row = document.createElement('div');
      row.className = 'itemcard maint-soft ce-mobile-row';
      row.innerHTML = `<div class="rowline producto">
        <div class="field"><label>Nombre</label><input value="${esc(p.nombre)}" data-action="edit-producto-nombre" data-id="${esc(p.id)}" /></div>
        <div class="field"><label>Segmento</label><select data-action="edit-producto-segmento" data-id="${esc(p.id)}">${segmentOptions(p.segmento)}</select></div>
        <div class="field"><label>Destino</label><select data-action="edit-producto-destino" data-id="${esc(p.id)}">${destinoOptions(p.destino)}</select></div>
        <div class="field"><label>Precio referencia</label><input class="money-text" type="text" value="${money(parsePrice(p))}" data-action="edit-producto-precio" data-id="${esc(p.id)}" /></div>
        <button type="button" class="modify small" data-action="save-producto" data-id="${esc(p.id)}">Modificar</button>
        <button type="button" class="danger small" data-action="delete-producto" data-id="${esc(p.id)}">Eliminar</button>
      </div>`;
      wrap.appendChild(row);
    });
    stateLocal.lastRenderMs.productos = Math.round((performance.now()-t0)*10)/10;
  }
  function patch(){
    if(stateLocal.installed) return;
    originals.renderCompras = window.renderCompras;
    originals.renderDonaciones = window.renderDonaciones;
    originals.renderProductos = window.renderProductos;
    if(typeof originals.renderCompras === 'function') window.renderCompras = renderComprasCompact;
    if(typeof originals.renderDonaciones === 'function') window.renderDonaciones = renderDonacionesCompact;
    if(typeof originals.renderProductos === 'function') window.renderProductos = renderProductosCompact;
    stateLocal.installed = true;
  }
  function rerender(){
    try{ if(typeof render === 'function') render(); }catch(e){ console.warn('[ControlEventMobileCompactLists] No se pudo repintar', e); }
  }
  function setEnabled(v, persist=true){
    stateLocal.enabled = !!v;
    stateLocal.full = {compras:false, donaciones:false, productos:false};
    if(persist) writeStored(v ? 'on' : 'off');
    document.documentElement.classList.toggle('ce-mobile-compact-lists', stateLocal.enabled);
    compactStyles();
    rerender();
    return api.inspect();
  }
  document.addEventListener('click', ev=>{
    const btn = ev.target.closest('[data-ce-mobile-list]');
    if(!btn) return;
    const kind = btn.dataset.kind;
    const action = btn.dataset.ceMobileList;
    if(!kind || !stateLocal.pages.hasOwnProperty(kind)) return;
    ev.preventDefault();
    ev.stopPropagation();
    if(action === 'next') stateLocal.pages[kind] += 1;
    if(action === 'prev') stateLocal.pages[kind] -= 1;
    if(action === 'full') stateLocal.full[kind] = true;
    if(kind === 'compras') window.renderCompras?.();
    if(kind === 'donaciones') window.renderDonaciones?.();
    if(kind === 'productos') window.renderProductos?.();
  }, true);
  const api = {
    version: VERSION,
    enable(){ return setEnabled(true); },
    disable(){ return setEnabled(false); },
    auto(){ try{ localStorage.removeItem(STORE); }catch(_){ } stateLocal.enabled = decideEnabled(); document.documentElement.classList.toggle('ce-mobile-compact-lists', stateLocal.enabled); rerender(); return api.inspect(); },
    full(kind){ if(kind && stateLocal.full.hasOwnProperty(kind)){ stateLocal.full[kind] = true; rerender(); } return api.inspect(); },
    compact(kind){ if(kind && stateLocal.full.hasOwnProperty(kind)){ stateLocal.full[kind] = false; rerender(); } return api.inspect(); },
    inspect(){ return {...stateLocal, userAgent:navigator.userAgent, deviceMemory:navigator.deviceMemory || null}; },
    print(){ const r = api.inspect(); console.group('[ControlEventMobileCompactLists/ControlEvent v1.0/pr] Listas compactas móviles'); console.log('Estado', r); console.groupEnd(); return r; }
  };
  window.ControlEventMobileCompactLists = api;
  function init(){
    if(!canUse()) return setTimeout(init, 60);
    stateLocal.enabled = decideEnabled();
    compactStyles();
    patch();
    document.documentElement.classList.toggle('ce-mobile-compact-lists', stateLocal.enabled);
    console.info(`[ControlEventMobileCompactLists/${VERSION}] Instalado. ${stateLocal.enabled ? 'Activo' : 'Inactivo'} por defecto.`);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
