/* ControlEvent v30.0 - Mapa de productos
   Pantalla informativa que cruza COMPRAS + DONACIONES por Tienda + Producto. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v30.0';
  const DONATION_TYPES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const $ = id => document.getElementById(id);

  function st(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ return window.ControlEventApp?.state || window.state || {}; }catch(_){ return {}; }
  }
  function arr(name){
    const value = st()[name];
    return Array.isArray(value) ? value : [];
  }
  function selectedId(){
    return String(st().selectedEventId || '');
  }
  function currentTab(){
    try{ if(typeof currentMainTab !== 'undefined') return String(currentMainTab || 'ingresos'); }catch(_){ }
    try{ return String(window.ControlEventApp?.navigation?.currentMainTab || 'ingresos'); }catch(_){ return 'ingresos'; }
  }
  function setCurrentTab(value){
    try{ if(typeof currentMainTab !== 'undefined') currentMainTab = value; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = value; }catch(_){ }
  }
  function hasEvent(){
    const id = selectedId();
    return !!id && arr('eventos').some(e => String(e.id) === id);
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
    const s = new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(n);
    return s;
  }
  function normText(value){
    return String(value || '').trim() || 'Sin definir';
  }
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
  function responsibleName(row){
    return personName(row?.responsableId) || '';
  }
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
        <div><strong>${esc(item.donor)}</strong><span>${esc(item.tipo)}</span></div>
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
      renderMetric('A comprar / gastos', moneyFmt(totalCompra), `${data.groups.length} tienda-producto`, 'warn'),
      renderMetric('Donado producto', moneyFmt(totalDonado), `${productsWithDonations} productos con donación`, 'ok'),
      renderMetric('Sin compra planificada', String(data.onlyDonations.length), 'Productos solo donados', '')
    ].join('');

    if(!data.groups.length && !data.onlyDonations.length){
      wrap.innerHTML = '<div class="empty">Todavía no hay compras ni donaciones de producto para este evento.</div>';
      return;
    }

    const cards = data.groups.map(group => `
      <div class="mapa-product-card">
        <div class="mapa-product-head">
          <div><span class="mapa-store">${esc(group.tienda)}</span><h3>${esc(group.producto)}</h3></div>
          <div class="mapa-tags"><span>${esc(group.segmento)}</span><span>${esc(group.destino)}</span></div>
        </div>
        <div class="mapa-product-kpis">
          <div><span>A comprar</span><strong>${esc(qtyFmt(group.unidadesCompra))} uds.</strong></div>
          <div><span>Importe compra</span><strong>${esc(moneyFmt(group.importeCompra))}</strong></div>
          <div><span>Necesidad evento</span><strong>${esc(qtyFmt(group.necesidadUnidades))} uds.</strong></div>
          <div><span>Donado</span><strong>${esc(qtyFmt(group.unidadesDonadas))} uds. · ${esc(moneyFmt(group.valorDonado))}</strong></div>
        </div>
        <div class="mapa-product-meta">
          <div><b>Ticket / estado:</b> ${esc(renderTicketLine(group))}</div>
          <div><b>Responsable:</b> ${esc(Array.from(group.responsables).join(', ') || '—')}</div>
        </div>
        <div class="mapa-donation-block">
          <div class="mapa-subtitle">Donantes de este producto</div>
          ${renderDonationRows(group.donationRows)}
        </div>
      </div>`).join('');

    const onlyDonationBlock = data.onlyDonations.length ? `
      <div class="mapa-only-donations">
        <div class="mapa-subtitle big">Productos con donación, pero sin compra planificada</div>
        ${data.onlyDonations.map(item => `
          <div class="mapa-product-card donation-only">
            <div class="mapa-product-head"><div><span class="mapa-store">Solo donación</span><h3>${esc(item.producto)}</h3></div><div class="mapa-tags"><span>${esc(item.segmento)}</span><span>${esc(item.destino)}</span></div></div>
            <div class="mapa-product-kpis compact"><div><span>Donado</span><strong>${esc(qtyFmt(item.unidadesDonadas))} uds. · ${esc(moneyFmt(item.valorDonado))}</strong></div></div>
            ${renderDonationRows(item.donationRows)}
          </div>`).join('')}
      </div>` : '';

    wrap.innerHTML = cards + onlyDonationBlock;
  }

  function applyMapVisibility(){
    const active = currentTab() === 'mapa';
    const has = hasEvent();
    const panel = $('tabMapaProductos');
    const btn = $('tabMapaBtn');
    if(panel) panel.classList.toggle('hidden', !active || !has);
    if(btn){
      btn.classList.toggle('active', active);
      btn.classList.remove('hidden-by-role-v228');
      btn.style.removeProperty('display');
      btn.removeAttribute('aria-hidden');
    }
    document.querySelectorAll('.mobile-menu-action[data-target="tabMapaBtn"]').forEach(el => {
      el.classList.remove('hidden-by-role-v228');
      el.style.removeProperty('display');
      el.removeAttribute('aria-hidden');
    });
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
  }

  const oldRenderTabVisibility = (typeof window.renderTabVisibility === 'function') ? window.renderTabVisibility : (function(){ try{ return typeof renderTabVisibility === 'function' ? renderTabVisibility : null; }catch(_){ return null; } })();
  function renderTabVisibilityV30(){
    const result = oldRenderTabVisibility ? oldRenderTabVisibility.apply(this, arguments) : undefined;
    applyMapVisibility();
    return result;
  }

  const oldRender = (typeof window.render === 'function') ? window.render : (function(){ try{ return typeof render === 'function' ? render : null; }catch(_){ return null; } })();
  function renderV30(){
    const result = oldRender ? oldRender.apply(this, arguments) : undefined;
    applyMapVisibility();
    ensureMobileMenuAction();
    if(currentTab() === 'mapa') renderMapaProductos();
    return result;
  }

  document.addEventListener('click', event => {
    const target = event.target?.closest?.('#tabMapaBtn,.mobile-menu-action[data-target="tabMapaBtn"]');
    if(!target) return;
    event.preventDefault();
    if(target.classList?.contains('mobile-menu-action')){
      const realBtn = $('tabMapaBtn');
      if(realBtn && target !== realBtn){ realBtn.click(); return; }
    }
    setCurrentTab('mapa');
    try{ if(typeof window.render === 'function') window.render(); else renderV30(); }catch(error){ console.warn('[v30.0] render mapa', error); }
    try{ window.ControlEventModules?.activate?.('mapa', {reason:'mapa-click'}); }catch(_){ }
  }, true);

  try{ renderTabVisibility = renderTabVisibilityV30; }catch(_){ }
  try{ window.renderTabVisibility = renderTabVisibilityV30; }catch(_){ }
  try{ render = renderV30; }catch(_){ }
  try{ window.render = renderV30; }catch(_){ }
  try{ window.renderMapaProductos = renderMapaProductos; }catch(_){ }
  try{ window.buildMapaProductos = buildMapaProductos; }catch(_){ }

  function patchAppActions(){
    try{
      const actions = window.ControlEventApp?.actions;
      if(actions){
        actions.render = (...args) => window.render(...args);
        actions.renderTabVisibility = (...args) => window.renderTabVisibility(...args);
        actions.renderMapaProductos = (...args) => window.renderMapaProductos(...args);
      }
    }catch(_){ }
  }
  patchAppActions();
  window.addEventListener('controlevent:app-ready', patchAppActions);
  window.addEventListener('controlevent:runtime-ready', () => { applyMapVisibility(); ensureMobileMenuAction(); patchAppActions(); });

  const observer = new MutationObserver(() => ensureMobileMenuAction());
  try{ observer.observe(document.documentElement, {childList:true, subtree:true}); }catch(_){ }
  [0, 200, 800, 1500].forEach(ms => setTimeout(() => { applyMapVisibility(); ensureMobileMenuAction(); }, ms));

  window.ControlEventMapaProductos = {
    version: VERSION,
    render: renderMapaProductos,
    build: buildMapaProductos,
    sync: () => { applyMapVisibility(); ensureMobileMenuAction(); renderMapaProductos(); }
  };
})();
