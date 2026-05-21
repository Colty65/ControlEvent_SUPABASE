/* ControlEvent v31.1 - Mapa de recursos
   Cruza compras + donaciones y añade filtro por responsables SOCIO. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v31.1';
  const DONATION_TYPES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const TAB_NAME = 'mapa';
  const PANEL_ID = 'tabMapaProductos';
  const BUTTON_ID = 'tabMapaBtn';
  const FILTER_ID = 'mapaResponsablesFilter';
  const SEARCH_ID = 'mapaProductoSearch';
  const KNOWN_PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabResumen','tabGraficas'];
  const KNOWN_BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabResumenBtn','tabGraficasBtn'];
  let mapPinned = false;
  let selectedResponsables = null; // null = todos
  let productSearchText = '';
  let lastRenderedEventId = null;
  const $ = id => document.getElementById(id);

  function st(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ return window.ControlEventApp?.state || window.state || {}; }catch(_){ return {}; }
  }
  function arr(name){ const value = st()[name]; return Array.isArray(value) ? value : []; }
  function selectedId(){ return String(st().selectedEventId || ''); }
  function hasEvent(){ const id = selectedId(); return !!id && arr('eventos').some(e => String(e.id) === id); }
  function currentTab(){
    try{ if(typeof currentMainTab !== 'undefined') return String(currentMainTab || 'ingresos'); }catch(_){ }
    try{ return String(window.ControlEventApp?.navigation?.currentMainTab || 'ingresos'); }catch(_){ return 'ingresos'; }
  }
  function setCurrentTab(value){
    try{ if(typeof currentMainTab !== 'undefined') currentMainTab = value; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = value; }catch(_){ }
    try{ window.__ceMapaProductosPinned = value === TAB_NAME; }catch(_){ }
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
  function up(value){ return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase(); }
  function normText(value){ return String(value || '').trim() || 'Sin definir'; }
  function isDonation(value){
    try{ if(typeof isDonationTicket === 'function') return isDonationTicket(value); }catch(_){ }
    return DONATION_TYPES.includes(String(value || ''));
  }
  function findById(listName, id){ const sid = String(id || ''); return arr(listName).find(item => String(item.id || '') === sid) || null; }
  function productOf(row){ return findById('productos', row?.productoId); }
  function storeOf(row){
    const p = productOf(row) || {};
    const id = String(row?.tiendaId || p.tiendaId || p.defaultTiendaId || '');
    return findById('tiendas', id) || {id:'', nombre:'Sin tienda'};
  }
  function personOf(id){ return findById('personas', id) || null; }
  function personName(id){ return personOf(id)?.nombre || ''; }
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
  function responsibleId(row){ return String(row?.responsableId || row?.responsable || row?.socioResponsableId || ''); }
  function responsibleName(row){ return personName(responsibleId(row)) || ''; }
  function isSocioResponsable(id){ return up(personOf(id)?.rango || '') === 'SOCIO'; }
  function unitPrice(row){
    const p = productOf(row) || {};
    const candidates = [row?.precio, p.precio, p.defaultPrecio];
    for(const item of candidates){ const n = Number(item || 0); if(Number.isFinite(n) && n > 0) return n; }
    return 0;
  }
  function rowValue(row){ return Number(row?.unidades || 0) * unitPrice(row); }
  function unitPriceFrom(unidades, importe){
    const u = Number(unidades || 0), v = Number(importe || 0);
    return u > 0 ? (v / u) : 0;
  }
  function unitPriceFmtFrom(unidades, importe){
    const p = unitPriceFrom(unidades, importe);
    return p > 0 ? `${moneyFmt(p)} / ud.` : '—';
  }
  function productName(row){ return productOf(row)?.nombre || row?.producto || 'Producto sin nombre'; }
  function segmentName(row){ return productOf(row)?.segmento || 'Sin segmento'; }
  function destinoName(row){ return productOf(row)?.destino || 'Sin destino'; }
  function comprasRaw(){ const eventId = selectedId(); return arr('compras').filter(c => String(c.eventId || '') === eventId); }
  function ticketRaw(row){ return String(row?.ticketDonacion || row?.ticket || '').trim(); }
  function isTk(ticket){ return /^TK\s*\d+/i.test(String(ticket || '').trim()); }
  function ticketNumber(ticket){ const m = String(ticket || '').match(/^TK\s*(\d+)/i); return m ? Number(m[1]) : 999999; }
  function ticketLabel(row){
    const raw = ticketRaw(row);
    if(!raw) return 'Pte. Comprar u otros gastos';
    if(isDonation(raw)) return raw;
    if(isTk(raw)) return raw.replace(/^TK\s*/i, 'TK');
    const t = up(raw);
    if(t.includes('PTE') || t.includes('PENDIENTE') || t.includes('COMPRA') || t.includes('GASTO')) return 'Pte. Comprar u otros gastos';
    return raw;
  }
  function ticketSortKey(label){
    const text = String(label || '');
    if(isTk(text)) return ['1', String(ticketNumber(text)).padStart(6,'0'), up(text)];
    return ['0', '000000', up(text)];
  }
  function rowMatchesResponsable(row){
    if(!selectedResponsables || selectedResponsables.size === 0) return true;
    const rid = responsibleId(row);
    return !!rid && selectedResponsables.has(rid);
  }
  function collectResponsibleOptions(rows){
    const map = new Map();
    rows.forEach(row => {
      const id = responsibleId(row);
      if(!id || !isSocioResponsable(id)) return;
      const name = personName(id) || 'Socio sin nombre';
      if(!map.has(id)) map.set(id, {id, name});
    });
    return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }

  function buildMapaProductos(){
    const rowsAll = comprasRaw();
    const responsableOptions = collectResponsibleOptions(rowsAll);

    // Totales de cabecera: SIEMPRE del evento completo, aunque se filtre por responsable.
    const eventBuys = rowsAll.filter(row => !isDonation(row.ticketDonacion));
    const eventDonations = rowsAll.filter(row => isDonation(row.ticketDonacion));
    const eventTotalCompra = eventBuys.reduce((sum, row) => sum + rowValue(row), 0);
    const eventTotalCompraTk = eventBuys.filter(row => isTk(ticketLabel(row))).reduce((sum, row) => sum + rowValue(row), 0);
    const eventTotalCompraPte = eventBuys.filter(row => !isTk(ticketLabel(row))).reduce((sum, row) => sum + rowValue(row), 0);
    const eventTotalDonado = eventDonations.reduce((sum, row) => sum + rowValue(row), 0);
    const eventProductsWithDonations = new Set(eventDonations.map(row => String(row.productoId || '')).filter(Boolean)).size;

    // Listado: sí respeta el filtro de responsables.
    const rows = rowsAll.filter(row => rowMatchesResponsable(row));
    const buys = rows.filter(row => !isDonation(row.ticketDonacion));
    const donations = rows.filter(row => isDonation(row.ticketDonacion));
    const donationByProduct = new Map();
    donations.forEach(row => {
      const pid = String(row.productoId || '');
      if(!donationByProduct.has(pid)) donationByProduct.set(pid, []);
      const unidades = Number(row.unidades || 0);
      const valor = rowValue(row);
      donationByProduct.get(pid).push({
        row,
        producto: productName(row),
        donor: donorName(row),
        unidades,
        valor,
        precioUnitario: unitPriceFrom(unidades, valor),
        tipo: row.ticketDonacion || 'Donación',
        responsable: responsibleName(row)
      });
    });

    const groups = new Map();
    buys.forEach(row => {
      const store = storeOf(row);
      const product = productOf(row) || {};
      const ticket = ticketLabel(row);
      const key = [String(store.id || ''), ticket, String(row.productoId || '')].join('::');
      if(!groups.has(key)){
        groups.set(key, {
          key,
          tiendaId: String(store.id || ''),
          tienda: normText(store.nombre || 'Sin tienda'),
          ticket,
          isResolvedTk: isTk(ticket),
          ticketSort: ticketSortKey(ticket),
          productoId: String(row.productoId || ''),
          producto: normText(product.nombre || row.producto || 'Producto sin nombre'),
          segmento: normText(product.segmento || segmentName(row)),
          destino: normText(product.destino || destinoName(row)),
          unidadesCompra: 0,
          importeCompra: 0,
          responsables: new Map(),
          rows: []
        });
      }
      const group = groups.get(key);
      const unidades = Number(row.unidades || 0);
      const valor = rowValue(row);
      group.unidadesCompra += unidades;
      group.importeCompra += valor;
      group.rows.push(row);
      const rid = responsibleId(row);
      const resp = responsibleName(row);
      if(rid && resp) group.responsables.set(rid, resp);
    });

    const result = Array.from(groups.values()).map(group => {
      const donationRows = (donationByProduct.get(group.productoId) || []).slice().sort((a,b)=>a.donor.localeCompare(b.donor,'es'));
      const unidadesDonadas = donationRows.reduce((sum, item) => sum + Number(item.unidades || 0), 0);
      const valorDonado = donationRows.reduce((sum, item) => sum + Number(item.valor || 0), 0);
      return {
        ...group,
        donationRows,
        unidadesDonadas,
        valorDonado,
        precioCompra: unitPriceFrom(group.unidadesCompra, group.importeCompra),
        precioDonado: unitPriceFrom(unidadesDonadas, valorDonado),
        necesidadUnidades: Number(group.unidadesCompra || 0) + unidadesDonadas,
        necesidadValor: Number(group.importeCompra || 0) + valorDonado
      };
    }).sort((a,b) => {
      const tienda = a.tienda.localeCompare(b.tienda, 'es'); if(tienda !== 0) return tienda;
      const ak = a.ticketSort || ticketSortKey(a.ticket), bk = b.ticketSort || ticketSortKey(b.ticket);
      const tk = ak.join('|').localeCompare(bk.join('|'), 'es'); if(tk !== 0) return tk;
      return a.producto.localeCompare(b.producto, 'es');
    });

    const productIdsWithCompra = new Set(result.map(group => group.productoId));
    const onlyDonations = Array.from(donationByProduct.entries())
      .filter(([productId]) => !productIdsWithCompra.has(productId))
      .map(([productId, items]) => {
        const first = items[0]?.row || {productoId};
        const unidadesDonadas = items.reduce((sum, item) => sum + Number(item.unidades || 0), 0);
        const valorDonado = items.reduce((sum, item) => sum + Number(item.valor || 0), 0);
        return {
          productId,
          producto: productName(first),
          segmento: segmentName(first),
          destino: destinoName(first),
          unidadesDonadas,
          valorDonado,
          precioDonado: unitPriceFrom(unidadesDonadas, valorDonado),
          donationRows: items.sort((a,b)=>a.donor.localeCompare(b.donor,'es'))
        };
      })
      .sort((a,b)=>a.producto.localeCompare(b.producto,'es'));

    return {
      groups: result,
      onlyDonations,
      buys,
      donations,
      responsableOptions,
      totalRows: rowsAll.length,
      eventSummary: {
        totalCompra: eventTotalCompra,
        totalCompraTk: eventTotalCompraTk,
        totalCompraPte: eventTotalCompraPte,
        totalDonado: eventTotalDonado,
        productsWithDonations: eventProductsWithDonations,
        necesidadValor: eventTotalCompra + eventTotalDonado
      }
    };
  }

  function filterLabel(options){
    if(!selectedResponsables || selectedResponsables.size === 0) return 'Todos los responsables';
    const names = options.filter(o => selectedResponsables.has(o.id)).map(o => o.name);
    if(!names.length) return 'Sin responsables seleccionados';
    if(names.length <= 2) return names.join(', ');
    return `${names.length} responsables seleccionados`;
  }
  function renderResponsableFilter(options){
    if(!options.length){
      return `<div class="mapa-filter muted"><strong>Responsables</strong><span>No hay responsables SOCIO asignados.</span></div>`;
    }
    const allChecked = !selectedResponsables || selectedResponsables.size === 0;
    return `<div class="mapa-filter mapa-filter-v3013" id="${FILTER_ID}">
      <button type="button" class="mapa-filter-toggle" data-mapa-filter-toggle="1" aria-expanded="false">
        <strong>Responsables</strong><span>${esc(filterLabel(options))}</span><em>▾</em>
      </button>
      <div class="mapa-filter-panel" data-mapa-filter-panel="1" hidden>
        <label class="mapa-filter-option all"><input type="checkbox" value="__ALL__" ${allChecked ? 'checked' : ''}> Todos los responsables</label>
        ${options.map(opt => `<label class="mapa-filter-option"><input type="checkbox" value="${esc(opt.id)}" ${!allChecked && selectedResponsables.has(opt.id) ? 'checked' : ''}> ${esc(opt.name)}</label>`).join('')}
      </div>
      <div class="mapa-filter-help">Elige todos, uno o varios socios responsables.</div>
    </div>`;
  }
  function bindResponsableFilter(options){
    const filter = $(FILTER_ID);
    if(!filter || filter.__ceBoundV3013) return;
    filter.__ceBoundV3013 = true;
    const panel = filter.querySelector('[data-mapa-filter-panel]');
    const toggle = filter.querySelector('[data-mapa-filter-toggle]');
    const syncToggle = () => {
      if(!toggle || !panel) return;
      const open = !panel.hidden;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      const em = toggle.querySelector('em'); if(em) em.textContent = open ? '▴' : '▾';
    };
    toggle?.addEventListener('click', event => {
      try{ event.preventDefault(); event.stopPropagation(); }catch(_){ }
      if(panel) panel.hidden = !panel.hidden;
      syncToggle();
    });
    const applySelection = (input) => {
      const all = filter.querySelector('input[value="__ALL__"]');
      const items = Array.from(filter.querySelectorAll('input[type="checkbox"]')).filter(el => el.value !== '__ALL__');
      if(input && input.value === '__ALL__'){
        if(input.checked){ selectedResponsables = null; items.forEach(el => { el.checked = false; }); }
        else if(!items.some(el => el.checked)){ input.checked = true; selectedResponsables = null; }
      }else{
        if(all) all.checked = false;
        const selected = items.filter(el => el.checked).map(el => el.value);
        if(!selected.length){ selectedResponsables = null; if(all) all.checked = true; }
        else selectedResponsables = new Set(selected);
      }
      renderMapaProductos();
      const next = $(FILTER_ID);
      const nextPanel = next?.querySelector('[data-mapa-filter-panel]');
      const nextToggle = next?.querySelector('[data-mapa-filter-toggle]');
      if(nextPanel && nextToggle){ nextPanel.hidden = false; nextToggle.setAttribute('aria-expanded','true'); const em = nextToggle.querySelector('em'); if(em) em.textContent = '▴'; }
    };
    filter.addEventListener('change', event => {
      const input = event.target;
      if(!input || input.tagName !== 'INPUT') return;
      try{ event.stopPropagation(); }catch(_){ }
      applySelection(input);
    });
  }

  function renderMetric(label, value, note, kind){
    return `<div class="mapa-metric ${kind || ''}"><div class="mapa-metric-label">${esc(label)}</div><div class="mapa-metric-value">${esc(value)}</div>${note ? `<div class="mapa-metric-note">${esc(note)}</div>` : ''}</div>`;
  }
  function renderDonationRows(items){
    if(!items.length) return '<div class="mapa-donation-empty">Sin donaciones registradas de este producto para el filtro actual.</div>';
    return `<div class="mapa-donation-list">${items.map(item => `
      <div class="mapa-donation-row">
        <div class="donor"><strong>${esc(item.donor)}</strong><span>${esc(item.tipo)}</span></div>
        <div><strong>${esc(qtyFmt(item.unidades))}</strong><span>uds.</span></div>
        <div><strong>${esc(unitPriceFmtFrom(item.unidades, item.valor))}</strong><span>precio</span></div>
        <div><strong>${esc(moneyFmt(item.valor))}</strong><span>valor</span></div>
        <div><strong>${esc(item.responsable || '—')}</strong><span>resp.</span></div>
      </div>`).join('')}</div>`;
  }

  function renderTicketLine(group){ return group.ticket || 'Pte. Comprar u otros gastos'; }
  function pct(part, total){
    const n = total > 0 ? Math.max(0, Math.min(100, (Number(part || 0) / total) * 100)) : 0;
    return String(Math.round(n * 10) / 10).replace(',', '.');
  }
  function renderNeedStrip(group){
    const total = Number(group.necesidadUnidades || 0);
    const compraPct = pct(group.unidadesCompra, total);
    const donadoPct = pct(group.unidadesDonadas, total);
    return `<div class="mapa-need-strip" aria-label="Necesidad del producto">
      <div class="mapa-need-title"><strong>Necesidad del evento</strong><span>${esc(qtyFmt(total))} uds.</span></div>
      <div class="mapa-need-bar"><i class="buy" style="width:${compraPct}%"></i><i class="don" style="width:${donadoPct}%"></i></div>
      <div class="mapa-need-legend"><span><i class="buy"></i>COMPRAS PRODUCTO: ${esc(qtyFmt(group.unidadesCompra))}</span><span><i class="don"></i>Donado: ${esc(qtyFmt(group.unidadesDonadas))}</span></div>
    </div>`;
  }

  function renderProductSearch(){
    return `<div class="mapa-product-search" id="mapaProductoSearchBox">
      <div class="field"><label>Buscar producto</label><input id="${SEARCH_ID}" value="${esc(productSearchText)}" placeholder="Teclea parte del producto..." autocomplete="off" /></div>
      <button type="button" class="outline small" id="${SEARCH_ID}Btn">Buscar</button>
      <span class="mapa-search-help">Busca el primer registro que contenga el texto y se posiciona en la lista.</span>
    </div>`;
  }
  function productSearchTextOfCard(card){ return up(card?.dataset?.productText || card?.textContent || ''); }
  function focusFirstProduct(query){
    const q = up(query || productSearchText || '');
    document.querySelectorAll('#mapaProductosList .mapa-product-card.mapa-search-found').forEach(el => el.classList.remove('mapa-search-found'));
    if(!q) return false;
    const cards = Array.from(document.querySelectorAll('#mapaProductosList .mapa-product-card'));
    const found = cards.find(card => productSearchTextOfCard(card).includes(q));
    if(found){
      found.classList.add('mapa-search-found');
      try{ found.setAttribute('tabindex','-1'); found.focus({preventScroll:true}); }catch(_){ }
      try{ found.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ found.scrollIntoView(); }
      return true;
    }
    return false;
  }
  function bindProductSearch(){
    const input = $(SEARCH_ID), btn = $(SEARCH_ID + 'Btn');
    if(!input || input.__ceMapaSearchBound) return;
    input.__ceMapaSearchBound = true;
    const run = () => { productSearchText = input.value || ''; focusFirstProduct(productSearchText); };
    // V31.1: no buscar en cada pulsación; solo al pulsar Buscar o Enter.
    input.addEventListener('keydown', event => { if(event.key === 'Enter'){ event.preventDefault(); run(); } });
    btn?.addEventListener('click', event => { try{ event.preventDefault(); }catch(_){ } run(); });
    if(productSearchText) setTimeout(() => focusFirstProduct(productSearchText), 80);
  }
  function scrollToDonationHeader(){
    const target = document.getElementById('mapaOnlyDonationsHead') || document.querySelector('#mapaProductosList .mapa-only-donations-head') || document.querySelector('#mapaProductosList .mapa-donation-block');
    if(!target) return false;
    try{ target.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){ target.scrollIntoView(); }
    try{ target.classList.add('mapa-donation-head-focus'); setTimeout(() => target.classList.remove('mapa-donation-head-focus'), 1400); }catch(_){ }
    return true;
  }
  function bindDonationSummaryJump(){
    const btn = document.querySelector('[data-mapa-jump-donados="1"]');
    if(!btn || btn.__ceDonationJumpBound) return;
    btn.__ceDonationJumpBound = true;
    btn.addEventListener('click', event => { try{ event.preventDefault(); event.stopPropagation(); }catch(_){ } scrollToDonationHeader(); });
    btn.addEventListener('keydown', event => { if(event.key === 'Enter' || event.key === ' '){ try{ event.preventDefault(); }catch(_){ } scrollToDonationHeader(); } });
  }
  function dataProductText(parts){ return esc(parts.filter(Boolean).join(' · ')); }

  function renderMapaProductos(){
    const wrap = $('mapaProductosList');
    const summary = $('mapaProductosSummary');
    if(!wrap || !summary) return;
    if(!hasEvent()){
      summary.innerHTML = '';
      wrap.innerHTML = '<div class="empty">Selecciona un evento para ver el mapa de recursos.</div>';
      return;
    }
    const currentEventId = selectedId();
    if(lastRenderedEventId !== currentEventId){
      selectedResponsables = null;
      lastRenderedEventId = currentEventId;
    }
    const data = buildMapaProductos();
    const eventSummary = data.eventSummary || {};
    summary.innerHTML = `
      ${renderResponsableFilter(data.responsableOptions)}
      ${renderProductSearch()}
      <div class="mapa-summary-metrics">
        ${renderMetric('Necesidad valorada', moneyFmt(eventSummary.necesidadValor || 0), 'Total del evento, no cambia por responsable', 'ok')}
        ${renderMetric('Compras producto', moneyFmt(eventSummary.totalCompra || 0), `TKxx: ${moneyFmt(eventSummary.totalCompraTk || 0)} · Pte.Compra: ${moneyFmt(eventSummary.totalCompraPte || 0)}`, 'warn split')}
        ${renderMetric('Donado producto', moneyFmt(eventSummary.totalDonado || 0), `${eventSummary.productsWithDonations || 0} productos con donación del evento · pulsar para ir a donados`, 'ok jump-donados')}
      </div>`;
    bindResponsableFilter(data.responsableOptions);
    bindProductSearch();
    const donationMetric = summary.querySelector('.mapa-metric.jump-donados');
    if(donationMetric){ donationMetric.setAttribute('data-mapa-jump-donados','1'); donationMetric.setAttribute('role','button'); donationMetric.setAttribute('tabindex','0'); donationMetric.setAttribute('title','Ir a productos donados'); }
    bindDonationSummaryJump();

    if(!data.groups.length && !data.onlyDonations.length){
      wrap.innerHTML = '<div class="empty">No hay compras ni donaciones de producto para el filtro actual.</div>';
      return;
    }

    const cards = data.groups.map(group => {
      const responsablesTxt = Array.from(group.responsables.values()).join(', ') || '—';
      const donorTxt = group.donationRows.map(item => item.donor).join(', ');
      const searchText = dataProductText([group.tienda, group.ticket, group.producto, group.segmento, group.destino, responsablesTxt, donorTxt]);
      return `
      <article class="mapa-product-card ${group.isResolvedTk ? 'resolved-tk' : 'pending-buy'}" data-product-text="${searchText}">
        <div class="mapa-product-head">
          <div><span class="mapa-store">${esc(group.tienda)}</span><h3>${esc(group.producto)}</h3></div>
          <div class="mapa-tags"><span class="ticket ${group.isResolvedTk ? 'tk' : 'pending'}">${esc(group.ticket)}</span><span>${esc(group.segmento)}</span><span>${esc(group.destino)}</span></div>
        </div>
        ${renderNeedStrip(group)}
        <div class="mapa-product-kpis" role="list">
          <div role="listitem"><span>COMPRAS PRODUCTO</span><strong>${esc(qtyFmt(group.unidadesCompra))} uds. · ${esc(unitPriceFmtFrom(group.unidadesCompra, group.importeCompra))}</strong></div>
          <div role="listitem"><span>Importe compra</span><strong>${esc(moneyFmt(group.importeCompra))}</strong></div>
          <div role="listitem"><span>Necesidad total</span><strong>${esc(qtyFmt(group.necesidadUnidades))} uds. · ${esc(moneyFmt(group.necesidadValor))}</strong></div>
          <div role="listitem"><span>Donado</span><strong>${esc(qtyFmt(group.unidadesDonadas))} uds. · ${esc(unitPriceFmtFrom(group.unidadesDonadas, group.valorDonado))} · ${esc(moneyFmt(group.valorDonado))}</strong></div>
        </div>
        <div class="mapa-product-meta">
          <div><b>Ticket / estado:</b> ${esc(renderTicketLine(group))}</div>
          <div><b>Responsable:</b> ${esc(responsablesTxt)}</div>
        </div>
        <div class="mapa-donation-block">
          <div class="mapa-subtitle">Donantes de este producto</div>
          ${renderDonationRows(group.donationRows)}
        </div>
      </article>`;
    }).join('');

    const onlyDonationValue = data.onlyDonations.reduce((sum, item) => sum + Number(item.valorDonado || 0), 0);
    const onlyDonationBlock = data.onlyDonations.length ? `
      <section class="mapa-only-donations" id="mapaOnlyDonationsSection">
        <div class="mapa-only-donations-head" id="mapaOnlyDonationsHead"><strong>${esc(String(data.onlyDonations.length))} PRODUCTOS DONADOS PARA LOS RESPONSABLES SELECCIONADOS. VALOR ESTIMADO ${esc(moneyFmt(onlyDonationValue))}</strong></div>
        ${data.onlyDonations.map(item => {
          const donorTxt = item.donationRows.map(row => row.donor).join(', ');
          const searchText = dataProductText(['Solo donación', item.producto, item.segmento, item.destino, donorTxt]);
          return `
          <article class="mapa-product-card donation-only" data-product-text="${searchText}">
            <div class="mapa-product-head"><div><span class="mapa-store">Solo donación</span><h3>${esc(item.producto)}</h3></div><div class="mapa-tags"><span>${esc(item.segmento)}</span><span>${esc(item.destino)}</span></div></div>
            <div class="mapa-product-kpis compact"><div><span>Donado</span><strong>${esc(qtyFmt(item.unidadesDonadas))} uds. · ${esc(unitPriceFmtFrom(item.unidadesDonadas, item.valorDonado))} · ${esc(moneyFmt(item.valorDonado))}</strong></div></div>
            ${renderDonationRows(item.donationRows)}
          </article>`;
        }).join('')}
      </section>` : '';

    wrap.innerHTML = cards + onlyDonationBlock;
    normalizeMapaLabelsV3013();
    if(productSearchText) setTimeout(() => focusFirstProduct(productSearchText), 80);
  }

  function normalizeMapaLabelsV3013(){
    const panel = $(PANEL_ID); if(!panel) return;
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    const fixes = [[/PENDIENTE\s+COMPRAR/gi, 'COMPRAS PRODUCTO'],[/Pendiente\s+comprar/g, 'COMPRAS PRODUCTO'],[/Pendiente\s+de\s+comprar/g, 'COMPRAS PRODUCTO'],[/Pdte\.Compra/g, 'COMPRAS PRODUCTO'],[/Mapa de recursos/g, 'Mapa de recursos']];
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { let text = node.nodeValue || ''; const old = text; fixes.forEach(([rx, value]) => { text = text.replace(rx, value); }); if(text !== old) node.nodeValue = text; });
  }
  function closeMobileDrawer(){ try{ document.body.classList.remove('mobile-drawer-open'); }catch(_){ } }
  function isAuthVisible(){
    try{
      const auth = document.getElementById('authOverlay') || document.querySelector('.auth-overlay,.login-overlay,[data-auth-overlay]');
      if(!auth) return false;
      const cs = window.getComputedStyle ? getComputedStyle(auth) : null;
      return !auth.classList.contains('hidden') && auth.getAttribute('aria-hidden') !== 'true' && (!cs || (cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0));
    }catch(_){ return false; }
  }
  function applyMapVisibility(){
    if(isAuthVisible()) return;
    // V31.1: no forzar de nuevo la pestaña Mapa en cada render; evita secuestrar el menú móvil.
    const active = currentTab() === TAB_NAME;
    const eventReady = hasEvent();
    const panel = $(PANEL_ID), btn = $(BUTTON_ID);
    if(panel) panel.classList.toggle('hidden', !active || !eventReady);
    if(btn){ btn.classList.toggle('active', active); btn.classList.remove('hidden-by-role-v228'); btn.style.removeProperty('display'); btn.removeAttribute('aria-hidden'); btn.disabled = false; btn.removeAttribute('aria-disabled'); }
    document.querySelectorAll('.mobile-menu-action[data-target="tabMapaBtn"]').forEach(el => { el.classList.remove('hidden-by-role-v228'); el.style.removeProperty('display'); el.removeAttribute('aria-hidden'); el.disabled = false; el.removeAttribute('aria-disabled'); el.classList.toggle('primary', active); });
    bindDirectMapaButton();
  }
  function forceShowMapa(options = {}){
    mapPinned = true; setCurrentTab(TAB_NAME);
    KNOWN_PANELS.forEach(id => { const el = $(id); if(el) el.classList.toggle('hidden', id !== PANEL_ID || !hasEvent()); });
    KNOWN_BUTTONS.forEach(id => { const el = $(id); if(el) el.classList.toggle('active', id === BUTTON_ID); });
    applyMapVisibility(); renderMapaProductos(); normalizeMapaLabelsV3013(); closeMobileDrawer();
    try{ window.ControlEventModules?.activate?.(TAB_NAME, {reason: options.reason || 'mapa-force-show'}); }catch(_){ }
  }
  function ensureMobileMenuAction(){
    if(isAuthVisible()) return;
    Array.from(document.querySelectorAll('.mobile-menu-grid')).forEach(grid => {
      const existing = grid.querySelector('.mobile-menu-action[data-target="tabMapaBtn"]');
      if(existing){
        const desired = '<span class="mi">🧭</span>Mapa de recursos';
        if(existing.innerHTML.trim() !== desired) existing.innerHTML = desired;
        return;
      }
      const compras = grid.querySelector('.mobile-menu-action[data-target="tabComprasBtn"]');
      const resumen = grid.querySelector('.mobile-menu-action[data-target="tabResumenBtn"]');
      if(!compras && !resumen) return;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'mobile-menu-action'; btn.dataset.target = 'tabMapaBtn'; btn.innerHTML = '<span class="mi">🧭</span>Mapa de recursos';
      (compras || resumen).insertAdjacentElement(compras ? 'afterend' : 'beforebegin', btn);
    });
    bindDirectMapaButton();
  }

  const oldRenderTabVisibility = (typeof window.renderTabVisibility === 'function') ? window.renderTabVisibility : (function(){ try{ return typeof renderTabVisibility === 'function' ? renderTabVisibility : null; }catch(_){ return null; } })();
  function renderTabVisibilityV3013(){ const result = oldRenderTabVisibility ? oldRenderTabVisibility.apply(this, arguments) : undefined; applyMapVisibility(); return result; }
  const oldRender = (typeof window.render === 'function') ? window.render : (function(){ try{ return typeof render === 'function' ? render : null; }catch(_){ return null; } })();
  function renderV3013(){ const result = oldRender ? oldRender.apply(this, arguments) : undefined; applyMapVisibility(); ensureMobileMenuAction(); if(currentTab() === TAB_NAME) renderMapaProductos(); return result; }

  let lastOpenAt = 0;
  function isMapaTrigger(event){ return event.target?.closest?.('#tabMapaBtn,.mobile-menu-action[data-target="tabMapaBtn"]') || null; }
  function silenceMapTooltip(){
    try{
      document.querySelectorAll('#tabMapaBtn,.mobile-menu-action[data-target="tabMapaBtn"]').forEach(el => {
        const txt = 'Mapa de recursos'; el.setAttribute('aria-label', txt); el.removeAttribute('title'); el.removeAttribute('data-ce-tip'); el.removeAttribute('data-v181-tip'); el.removeAttribute('data-tip');
      });
      const tip = document.getElementById('ceTooltipV190') || document.getElementById('ceTooltipV181'); if(tip) tip.style.display = 'none';
    }catch(_){ }
  }
  function preserveScrollAfterOpen(x, y){ try{ requestAnimationFrame(() => window.scrollTo(x, y)); setTimeout(() => window.scrollTo(x, y), 80); }catch(_){ } }
  function openMapaFromEvent(event, reason){
    const auth = document.getElementById('authOverlay');
    if(auth && !auth.classList.contains('hidden')) return false;
    const target = isMapaTrigger(event); if(!target) return false;
    const t = Date.now(); if(t - lastOpenAt < 180){ try{ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ } return true; }
    lastOpenAt = t; const x = window.scrollX || window.pageXOffset || 0; const y = window.scrollY || window.pageYOffset || 0;
    try{ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
    silenceMapTooltip(); forceShowMapa({reason}); preserveScrollAfterOpen(x, y); return true;
  }
  function bindDirectMapaButton(){
    if(isAuthVisible()) return;
    silenceMapTooltip();
    document.querySelectorAll('#tabMapaBtn,.mobile-menu-action[data-target="tabMapaBtn"]').forEach(el => {
      if(el.__ceMapaV3013Bound) return; el.__ceMapaV3013Bound = true;
      el.addEventListener('click', ev => openMapaFromEvent(ev, 'direct-click'), true);
      el.addEventListener('keydown', ev => { if(ev.key === 'Enter' || ev.key === ' '){ openMapaFromEvent(ev, 'direct-keyboard'); } }, true);
      el.onclick = function(ev){ openMapaFromEvent(ev || window.event || {target:el}, 'direct-onclick'); return false; };
    });
  }

  document.addEventListener('click', event => {
    const other = event.target?.closest?.('#tabIngresosBtn,#tabDonacionesBtn,#tabComprasBtn,#tabResumenBtn,#tabGraficasBtn,.mobile-menu-action[data-target="tabIngresosBtn"],.mobile-menu-action[data-target="tabDonacionesBtn"],.mobile-menu-action[data-target="tabComprasBtn"],.mobile-menu-action[data-target="tabResumenBtn"],.mobile-menu-action[data-target="tabGraficasBtn"],#ceMobileMenuBtn');
    if(other) { mapPinned = false; try{ window.__ceMapaProductosPinned = false; }catch(_){ } }
  }, false);
  document.addEventListener('change', event => { if(event.target && event.target.id === 'selectedEvent' && currentTab() === TAB_NAME){ setTimeout(() => forceShowMapa({reason:'event-change', scroll:false}), 60); } }, true);

  try{ renderTabVisibility = renderTabVisibilityV3013; }catch(_){ }
  try{ window.renderTabVisibility = renderTabVisibilityV3013; }catch(_){ }
  try{ render = renderV3013; }catch(_){ }
  try{ window.render = renderV3013; }catch(_){ }
  try{ window.renderMapaProductos = renderMapaProductos; }catch(_){ }
  try{ window.buildMapaProductos = buildMapaProductos; }catch(_){ }
  try{ window.showMapaProductos = forceShowMapa; }catch(_){ }

  function patchAppActions(){
    try{ const actions = window.ControlEventApp?.actions; if(actions){ actions.render = (...args) => window.render(...args); actions.renderTabVisibility = (...args) => window.renderTabVisibility(...args); actions.renderMapaProductos = (...args) => window.renderMapaProductos(...args); actions.showMapaProductos = (...args) => window.showMapaProductos(...args); } }catch(_){ }
  }
  patchAppActions(); bindDirectMapaButton();
  window.addEventListener('controlevent:app-ready', patchAppActions);
  window.addEventListener('controlevent:runtime-ready', () => { applyMapVisibility(); ensureMobileMenuAction(); bindDirectMapaButton(); patchAppActions(); });
  const scheduleMapaSync = (() => {
    let pending = false;
    return () => {
      if(pending || isAuthVisible()) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        ensureMobileMenuAction();
        applyMapVisibility();
        bindDirectMapaButton();
        if(currentTab() === TAB_NAME) renderMapaProductos();
      }, 80);
    };
  })();
  // V31.1: sin MutationObserver global para no repintar mientras se usa el menú o el filtro.
  [0, 120, 400, 900, 1800].forEach(ms => setTimeout(() => { if(isAuthVisible()) return; applyMapVisibility(); ensureMobileMenuAction(); bindDirectMapaButton(); if(currentTab() === TAB_NAME) renderMapaProductos(); }, ms));
  window.ControlEventMapaProductos = {version: VERSION, mode: 'mapa-recursos-v311', render: renderMapaProductos, build: buildMapaProductos, show: forceShowMapa, sync: () => { applyMapVisibility(); ensureMobileMenuAction(); if(currentTab() === TAB_NAME) renderMapaProductos(); }};
})();
