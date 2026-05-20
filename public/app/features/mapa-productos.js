/* ControlEvent v30.4 - Mapa de productos
   Pantalla informativa estable que cruza COMPRAS + DONACIONES por Tienda + Producto.
   v30.4 limpia la interacción del botón para que se comporte como una pestaña normal. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v30.4';
  const DONATION_TYPES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const TAB_NAME = 'mapa';
  const PANEL_ID = 'tabMapaProductos';
  const BUTTON_ID = 'tabMapaBtn';
  const KNOWN_PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabResumen','tabGraficas'];
  const KNOWN_BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabResumenBtn','tabGraficasBtn'];
  let mapPinned = false;
  const $ = id => document.getElementById(id);

  function st(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ return window.ControlEventApp?.state || window.state || {}; }catch(_){ return {}; }
  }
  function arr(name){
    const value = st()[name];
    return Array.isArray(value) ? value : [];
  }
  function selectedId(){ return String(st().selectedEventId || ''); }
  function hasEvent(){
    const id = selectedId();
    return !!id && arr('eventos').some(e => String(e.id) === id);
  }
  function currentTab(){
    try{ if(typeof currentMainTab !== 'undefined') return String(currentMainTab || 'ingresos'); }catch(_){ }
    try{ return String(window.ControlEventApp?.navigation?.currentMainTab || 'ingresos'); }catch(_){ return 'ingresos'; }
  }
  function setCurrentTab(value){
    try{ if(typeof currentMainTab !== 'undefined') currentMainTab = value; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = value; }catch(_){ }
    try{ window.__ceMapaProductosPinned = value === TAB_NAME; }catch(_){ }
  }
  function clearMapPinIfOtherTab(){
    const tab = currentTab();
    if(tab && tab !== TAB_NAME){
      mapPinned = false;
      try{ window.__ceMapaProductosPinned = false; }catch(_){ }
    }
  }
  function esc(value){
    try{ if(typeof escapeHtml === 'function') return escapeHtml(value); }catch(_){ }
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  }
  function moneyFmt(value){
    try{ if(typeof money === 'function') return money(value); }catch(_){ }
    return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value || 0));
  }
  function qtyFmt(value){
    const n = Number(value || 0);
    return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(n);
  }
  function normText(value){ return String(value || '').trim() || 'Sin definir'; }
  function isDonation(value){
    try{ if(typeof isDonationTicket === 'function') return isDonationTicket(value); }catch(_){ }
    return DONATION_TYPES.includes(String(value || ''));
  }
  function findById(listName, id){
    const sid = String(id || '');
    return arr(listName).find(item => String(item.id || '') === sid) || null;
  }
  function productOf(row){ return findById('productos', row?.productoId); }
  function storeOf(row){
    const p = productOf(row) || {};
    const id = String(row?.tiendaId || p.tiendaId || p.defaultTiendaId || '');
    return findById('tiendas', id) || {id:'', nombre:'Sin tienda'};
  }
  function personName(id){ return findById('personas', id)?.nombre || ''; }
  function storeName(id){ return findById('tiendas', id)?.nombre || ''; }
  function donorName(row){
    const ref = String(row?.donorRef || '').trim();
    if(ref){
      const parts = ref.split(':');
      const kind = parts[0];
      const id = parts.slice(1).join(':');
      if(kind === 'P') return personName(id) || 'Persona sin nombre';
      if(kind === 'T') return storeName(id) || 'Tienda sin nombre';
      return ref;
    }
    if(isDonation(row?.ticketDonacion) && row?.tiendaId) return storeName(row.tiendaId) || 'Sin donante';
    return row?.donante || row?.donor || 'Sin donante';
  }
  function responsibleName(row){ return personName(row?.responsableId) || ''; }
  function unitPrice(row){
    const p = productOf(row) || {};
    const candidates = [row?.precio, p.precio, p.defaultPrecio];
    for(const item of candidates){
      const n = Number(item || 0);
      if(Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  }
  function rowValue(row){ return Number(row?.unidades || 0) * unitPrice(row); }
  function productName(row){ return productOf(row)?.nombre || row?.producto || 'Producto sin nombre'; }
  function segmentName(row){ return productOf(row)?.segmento || 'Sin segmento'; }
  function destinoName(row){ return productOf(row)?.destino || 'Sin destino'; }
  function comprasRaw(){
    const eventId = selectedId();
    return arr('compras').filter(c => String(c.eventId || '') === eventId);
  }

  function buildMapaProductos(){
    const rows = comprasRaw();
    const buys = rows.filter(row => !isDonation(row.ticketDonacion));
    const donations = rows.filter(row => isDonation(row.ticketDonacion));
    const donationByProduct = new Map();
    donations.forEach(row => {
      const pid = String(row.productoId || '');
      if(!donationByProduct.has(pid)) donationByProduct.set(pid, []);
      donationByProduct.get(pid).push({
        row,
        producto: productName(row),
        donor: donorName(row),
        unidades: Number(row.unidades || 0),
        valor: rowValue(row),
        tipo: row.ticketDonacion || 'Donación',
        responsable: responsibleName(row)
      });
    });

    const groups = new Map();
    buys.forEach(row => {
      const store = storeOf(row);
      const product = productOf(row) || {};
      const key = [String(store.id || ''), String(row.productoId || '')].join('::');
      if(!groups.has(key)){
        groups.set(key, {
          key,
          tiendaId: String(store.id || ''),
          tienda: normText(store.nombre || 'Sin tienda'),
          productoId: String(row.productoId || ''),
          producto: normText(product.nombre || row.producto || 'Producto sin nombre'),
          segmento: normText(product.segmento || segmentName(row)),
          destino: normText(product.destino || destinoName(row)),
          unidadesCompra: 0,
          importeCompra: 0,
          tickets: new Map(),
          responsables: new Set(),
          rows: []
        });
      }
      const group = groups.get(key);
      const unidades = Number(row.unidades || 0);
      const valor = rowValue(row);
      const ticket = String(row.ticketDonacion || '').trim() || 'Pdte.Compra';
      group.unidadesCompra += unidades;
      group.importeCompra += valor;
      group.rows.push(row);
      group.tickets.set(ticket, (group.tickets.get(ticket) || 0) + unidades);
      const resp = responsibleName(row);
      if(resp) group.responsables.add(resp);
    });

    const result = Array.from(groups.values()).map(group => {
      const donationRows = donationByProduct.get(group.productoId) || [];
      const unidadesDonadas = donationRows.reduce((sum, item) => sum + Number(item.unidades || 0), 0);
      const valorDonado = donationRows.reduce((sum, item) => sum + Number(item.valor || 0), 0);
      return {
        ...group,
        donationRows,
        unidadesDonadas,
        valorDonado,
        necesidadUnidades: Number(group.unidadesCompra || 0) + unidadesDonadas,
        necesidadValor: Number(group.importeCompra || 0) + valorDonado
      };
    }).sort((a,b) => {
      const ta = a.tienda.localeCompare(b.tienda, 'es');
      if(ta !== 0) return ta;
      return a.producto.localeCompare(b.producto, 'es');
    });

    const productIdsWithCompra = new Set(result.map(group => group.productoId));
    const onlyDonations = Array.from(donationByProduct.entries())
      .filter(([productId]) => !productIdsWithCompra.has(productId))
      .map(([productId, items]) => {
        const first = items[0]?.row || {productoId};
        return {
          productId,
          producto: productName(first),
          segmento: segmentName(first),
          destino: destinoName(first),
          unidadesDonadas: items.reduce((sum, item) => sum + Number(item.unidades || 0), 0),
          valorDonado: items.reduce((sum, item) => sum + Number(item.valor || 0), 0),
          donationRows: items
        };
      })
      .sort((a,b)=>a.producto.localeCompare(b.producto,'es'));

    return {groups: result, onlyDonations, buys, donations};
  }

  function renderMetric(label, value, note, kind){
    return `<div class="mapa-metric ${kind || ''}"><div class="mapa-metric-label">${esc(label)}</div><div class="mapa-metric-value">${esc(value)}</div>${note ? `<div class="mapa-metric-note">${esc(note)}</div>` : ''}</div>`;
  }
  function renderDonationRows(items){
    if(!items.length) return '<div class="mapa-donation-empty">Sin donaciones registradas de este producto.</div>';
    return `<div class="mapa-donation-list">${items.map(item => `
      <div class="mapa-donation-row">
        <div class="donor"><strong>${esc(item.donor)}</strong><span>${esc(item.tipo)}</span></div>
        <div><strong>${esc(qtyFmt(item.unidades))}</strong><span>uds.</span></div>
        <div><strong>${esc(moneyFmt(item.valor))}</strong><span>valor</span></div>
        <div><strong>${esc(item.responsable || '—')}</strong><span>resp.</span></div>
      </div>`).join('')}</div>`;
  }
  function renderTicketLine(group){
    const entries = Array.from(group.tickets.entries()).sort((a,b)=>a[0].localeCompare(b[0],'es'));
    if(!entries.length) return 'Sin ticket';
    return entries.map(([ticket, unidades]) => `${ticket}: ${qtyFmt(unidades)} uds.`).join(' · ');
  }
  function pct(part, total){
    const n = total > 0 ? Math.max(0, Math.min(100, (Number(part || 0) / total) * 100)) : 0;
    return String(Math.round(n * 10) / 10).replace(',', '.');
  }
  function renderNeedStrip(group){
    const total = Number(group.necesidadUnidades || 0);
    const compraPct = pct(group.unidadesCompra, total);
    const donadoPct = pct(group.unidadesDonadas, total);
    return `
      <div class="mapa-need-strip" aria-label="Necesidad del producto">
        <div class="mapa-need-title"><strong>Necesidad del evento</strong><span>${esc(qtyFmt(total))} uds.</span></div>
        <div class="mapa-need-bar"><i class="buy" style="width:${compraPct}%"></i><i class="don" style="width:${donadoPct}%"></i></div>
        <div class="mapa-need-legend"><span><i class="buy"></i>Compras producto: ${esc(qtyFmt(group.unidadesCompra))}</span><span><i class="don"></i>Donado: ${esc(qtyFmt(group.unidadesDonadas))}</span></div>
      </div>`;
  }

  function renderMapaProductos(){
    const wrap = $('mapaProductosList');
    const summary = $('mapaProductosSummary');
    if(!wrap || !summary) return;
    if(!hasEvent()){
      summary.innerHTML = '';
      wrap.innerHTML = '<div class="empty">Selecciona un evento para ver el mapa de productos.</div>';
      return;
    }
    const data = buildMapaProductos();
    const totalCompra = data.groups.reduce((sum, group) => sum + Number(group.importeCompra || 0), 0);
    const totalDonado = data.donations.reduce((sum, row) => sum + rowValue(row), 0);
    const productsWithDonations = new Set(data.donations.map(row => String(row.productoId || ''))).size;
    summary.innerHTML = [
      renderMetric('Necesidad valorada', moneyFmt(totalCompra + totalDonado), 'Compras previstas + donaciones', 'ok'),
      renderMetric('Compras producto', moneyFmt(totalCompra), `${data.groups.length} tienda-producto`, 'warn'),
      renderMetric('Donado producto', moneyFmt(totalDonado), `${productsWithDonations} productos con donación`, 'ok'),
      renderMetric('Solo donación', String(data.onlyDonations.length), 'Sin compra planificada', '')
    ].join('');

    if(!data.groups.length && !data.onlyDonations.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay compras ni donaciones de producto para este evento.</div>';
      return;
    }

    const cards = data.groups.map(group => `
      <article class="mapa-product-card">
        <div class="mapa-product-head">
          <div><span class="mapa-store">${esc(group.tienda)}</span><h3>${esc(group.producto)}</h3></div>
          <div class="mapa-tags"><span>${esc(group.segmento)}</span><span>${esc(group.destino)}</span></div>
        </div>
        ${renderNeedStrip(group)}
        <div class="mapa-product-kpis" role="list">
          <div role="listitem"><span>Compras producto</span><strong>${esc(qtyFmt(group.unidadesCompra))} uds.</strong></div>
          <div role="listitem"><span>Importe compra</span><strong>${esc(moneyFmt(group.importeCompra))}</strong></div>
          <div role="listitem"><span>Necesidad total</span><strong>${esc(qtyFmt(group.necesidadUnidades))} uds.</strong></div>
          <div role="listitem"><span>Donado</span><strong>${esc(qtyFmt(group.unidadesDonadas))} uds. · ${esc(moneyFmt(group.valorDonado))}</strong></div>
        </div>
        <div class="mapa-product-meta">
          <div><b>Ticket / estado:</b> ${esc(renderTicketLine(group))}</div>
          <div><b>Responsable:</b> ${esc(Array.from(group.responsables).join(', ') || '—')}</div>
        </div>
        <div class="mapa-donation-block">
          <div class="mapa-subtitle">Donantes de este producto</div>
          ${renderDonationRows(group.donationRows)}
        </div>
      </article>`).join('');

    const onlyDonationBlock = data.onlyDonations.length ? `
      <section class="mapa-only-donations">
        <div class="mapa-subtitle big">Productos con donación, pero sin compra planificada</div>
        ${data.onlyDonations.map(item => `
          <article class="mapa-product-card donation-only">
            <div class="mapa-product-head"><div><span class="mapa-store">Solo donación</span><h3>${esc(item.producto)}</h3></div><div class="mapa-tags"><span>${esc(item.segmento)}</span><span>${esc(item.destino)}</span></div></div>
            <div class="mapa-product-kpis compact"><div><span>Donado</span><strong>${esc(qtyFmt(item.unidadesDonadas))} uds. · ${esc(moneyFmt(item.valorDonado))}</strong></div></div>
            ${renderDonationRows(item.donationRows)}
          </article>`).join('')}
      </section>` : '';

    wrap.innerHTML = cards + onlyDonationBlock;
  }

  function closeMobileDrawer(){
    try{ document.body.classList.remove('mobile-drawer-open'); }catch(_){ }
  }
  function applyMapVisibility(){
    if(mapPinned && !window.__ceMapaProductosWarmup && currentTab() !== TAB_NAME) setCurrentTab(TAB_NAME);
    const active = currentTab() === TAB_NAME;
    const eventReady = hasEvent();
    const panel = $(PANEL_ID);
    const btn = $(BUTTON_ID);
    if(panel) panel.classList.toggle('hidden', !active || !eventReady);
    if(btn){
      btn.classList.toggle('active', active);
      btn.classList.remove('hidden-by-role-v228');
      btn.style.removeProperty('display');
      btn.removeAttribute('aria-hidden');
      btn.disabled = false;
      btn.removeAttribute('aria-disabled');
    }
    document.querySelectorAll('.mobile-menu-action[data-target="tabMapaBtn"]').forEach(el => {
      el.classList.remove('hidden-by-role-v228');
      el.style.removeProperty('display');
      el.removeAttribute('aria-hidden');
      el.disabled = false;
      el.removeAttribute('aria-disabled');
      el.classList.toggle('primary', active);
    });
    bindDirectMapaButton();
  }
  function forceShowMapa(options = {}){
    mapPinned = true;
    setCurrentTab(TAB_NAME);
    KNOWN_PANELS.forEach(id => {
      const el = $(id);
      if(el) el.classList.toggle('hidden', id !== PANEL_ID || !hasEvent());
    });
    KNOWN_BUTTONS.forEach(id => {
      const el = $(id);
      if(el) el.classList.toggle('active', id === BUTTON_ID);
    });
    applyMapVisibility();
    renderMapaProductos();
    closeMobileDrawer();
    try{ window.ControlEventModules?.activate?.(TAB_NAME, {reason: options.reason || 'mapa-force-show'}); }catch(_){ }
    // V30.4: no forzar scroll. Mapa debe comportarse como el resto de pestañas, sin salto hacia arriba.
  }
  function ensureMobileMenuAction(){
    const grids = Array.from(document.querySelectorAll('.mobile-menu-grid'));
    grids.forEach(grid => {
      if(grid.querySelector('.mobile-menu-action[data-target="tabMapaBtn"]')) return;
      const compras = grid.querySelector('.mobile-menu-action[data-target="tabComprasBtn"]');
      const resumen = grid.querySelector('.mobile-menu-action[data-target="tabResumenBtn"]');
      if(!compras && !resumen) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-menu-action';
      btn.dataset.target = 'tabMapaBtn';
      btn.innerHTML = '<span class="mi">🧭</span>Mapa de productos';
      (compras || resumen).insertAdjacentElement(compras ? 'afterend' : 'beforebegin', btn);
    });
    bindDirectMapaButton();
  }

  const oldRenderTabVisibility = (typeof window.renderTabVisibility === 'function') ? window.renderTabVisibility : (function(){ try{ return typeof renderTabVisibility === 'function' ? renderTabVisibility : null; }catch(_){ return null; } })();
  function renderTabVisibilityV302(){
    const result = oldRenderTabVisibility ? oldRenderTabVisibility.apply(this, arguments) : undefined;
    applyMapVisibility();
    return result;
  }

  const oldRender = (typeof window.render === 'function') ? window.render : (function(){ try{ return typeof render === 'function' ? render : null; }catch(_){ return null; } })();
  function renderV302(){
    const result = oldRender ? oldRender.apply(this, arguments) : undefined;
    applyMapVisibility();
    ensureMobileMenuAction();
    if(currentTab() === TAB_NAME) forceShowMapa({reason:'render-v303', scroll:false});
    return result;
  }

  let lastOpenAt = 0;
  function isMapaTrigger(event){
    const target = event.target?.closest?.('#tabMapaBtn,.mobile-menu-action[data-target="tabMapaBtn"]');
    return target || null;
  }
  function silenceMapTooltip(){
    try{
      document.querySelectorAll('#tabMapaBtn,.mobile-menu-action[data-target="tabMapaBtn"]').forEach(el => {
        const txt = el.getAttribute('title') || el.getAttribute('data-ce-tip') || el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || 'Mapa de productos';
        el.setAttribute('aria-label', txt);
        el.removeAttribute('title');
        el.removeAttribute('data-ce-tip');
        el.removeAttribute('data-v181-tip');
        el.removeAttribute('data-tip');
      });
      const tip = document.getElementById('ceTooltipV190') || document.getElementById('ceTooltipV181');
      if(tip) tip.style.display = 'none';
    }catch(_){ }
  }
  function preserveScrollAfterOpen(x, y){
    try{
      requestAnimationFrame(() => window.scrollTo(x, y));
      setTimeout(() => window.scrollTo(x, y), 80);
    }catch(_){ }
  }
  function openMapaFromEvent(event, reason){
    const target = isMapaTrigger(event);
    if(!target) return false;
    const now = Date.now();
    if(now - lastOpenAt < 180){
      try{ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
      return true;
    }
    lastOpenAt = now;
    const x = window.scrollX || window.pageXOffset || 0;
    const y = window.scrollY || window.pageYOffset || 0;
    try{ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
    silenceMapTooltip();
    forceShowMapa({reason});
    preserveScrollAfterOpen(x, y);
    return true;
  }
  function bindDirectMapaButton(){
    silenceMapTooltip();
    document.querySelectorAll('#tabMapaBtn,.mobile-menu-action[data-target="tabMapaBtn"]').forEach(el => {
      if(el.__ceMapaV304Bound) return;
      el.__ceMapaV304Bound = true;
      // V30.4: sólo click/teclado. Evita pointerdown/touchstart para que iPad no desplace el menú.
      el.addEventListener('click', ev => openMapaFromEvent(ev, 'direct-click'), true);
      el.addEventListener('keydown', ev => {
        if(ev.key === 'Enter' || ev.key === ' '){ openMapaFromEvent(ev, 'direct-keyboard'); }
      }, true);
      el.onclick = function(ev){ openMapaFromEvent(ev || window.event || {target:el}, 'direct-onclick'); return false; };
    });
  }

  // Captura sólo el click final, igual que el resto de pestañas. Se evita touchstart/pointerdown.
  document.addEventListener('click', event => {
    openMapaFromEvent(event, 'document-click');
  }, true);

  document.addEventListener('click', event => {
    const other = event.target?.closest?.('#tabIngresosBtn,#tabDonacionesBtn,#tabComprasBtn,#tabResumenBtn,#tabGraficasBtn,.mobile-menu-action[data-target="tabIngresosBtn"],.mobile-menu-action[data-target="tabDonacionesBtn"],.mobile-menu-action[data-target="tabComprasBtn"],.mobile-menu-action[data-target="tabResumenBtn"],.mobile-menu-action[data-target="tabGraficasBtn"]');
    if(other) { mapPinned = false; try{ window.__ceMapaProductosPinned = false; }catch(_){ } }
  }, true);

  document.addEventListener('change', event => {
    if(event.target && event.target.id === 'selectedEvent' && currentTab() === TAB_NAME){
      setTimeout(() => forceShowMapa({reason:'event-change', scroll:false}), 60);
    }
  }, true);

  try{ renderTabVisibility = renderTabVisibilityV302; }catch(_){ }
  try{ window.renderTabVisibility = renderTabVisibilityV302; }catch(_){ }
  try{ render = renderV302; }catch(_){ }
  try{ window.render = renderV302; }catch(_){ }
  try{ window.renderMapaProductos = renderMapaProductos; }catch(_){ }
  try{ window.buildMapaProductos = buildMapaProductos; }catch(_){ }
  try{ window.showMapaProductos = forceShowMapa; }catch(_){ }

  function patchAppActions(){
    try{
      const actions = window.ControlEventApp?.actions;
      if(actions){
        actions.render = (...args) => window.render(...args);
        actions.renderTabVisibility = (...args) => window.renderTabVisibility(...args);
        actions.renderMapaProductos = (...args) => window.renderMapaProductos(...args);
        actions.showMapaProductos = (...args) => window.showMapaProductos(...args);
      }
    }catch(_){ }
  }
  patchAppActions();
  bindDirectMapaButton();
  window.addEventListener('controlevent:app-ready', patchAppActions);
  window.addEventListener('controlevent:runtime-ready', () => { applyMapVisibility(); ensureMobileMenuAction(); bindDirectMapaButton(); patchAppActions(); });

  const observer = new MutationObserver(() => { ensureMobileMenuAction(); applyMapVisibility(); bindDirectMapaButton(); });
  try{ observer.observe(document.documentElement, {childList:true, subtree:true}); }catch(_){ }
  [0, 120, 400, 900, 1800].forEach(ms => setTimeout(() => { applyMapVisibility(); ensureMobileMenuAction(); bindDirectMapaButton(); if(currentTab() === TAB_NAME) renderMapaProductos(); }, ms));

  window.ControlEventMapaProductos = {
    version: VERSION,
    mode: 'stable-screen-v303-official-tab',
    render: renderMapaProductos,
    build: buildMapaProductos,
    show: forceShowMapa,
    sync: () => { applyMapVisibility(); ensureMobileMenuAction(); if(currentTab() === TAB_NAME) renderMapaProductos(); }
  };
})();
