/* ControlEvent v19_prod - Vista grafica global desde Mapa de recursos.
   - Boton icono en la cabecera del Mapa de recursos.
   - Modal ligero: ingresos en queso + recursos comprados/donados por segmento y destino.
   - Detalles bajo demanda: personas/justificantes y productos A-Z. */
(function(){
  'use strict';
  if(window.__ceV19MapaRecursosGlobal) return;
  window.__ceV19MapaRecursosGlobal = true;

  const VERSION = 'ControlEvent v19_prod';
  const BUTTON_ID = 'ceMapaGlobalBtn';
  const OVERLAY_ID = 'ceMapaGlobalOverlay';
  const DETAIL_ID = 'ceMapaGlobalDetail';
  const DONATION_TYPES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? '').trim();
  const up = value => norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const slug = value => up(value || 'SIN_DEFINIR').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'SIN_DEFINIR';

  const COLORS = {
    incomeSocioBanco:'#2563eb', incomeSocioBizum:'#16a34a', incomeSocioEfectivo:'#84cc16',
    incomeNoSocioBanco:'#60a5fa', incomeNoSocioBizum:'#34d399', incomeNoSocioEfectivo:'#bef264',
    incomePendiente:'#f59e0b', incomeOther:'#64748b',
    compra:'#dc2626', corriente:'#111827', pendiente:'#fb7185',
    donTienda:'#fcd34d', donSocio:'#f59e0b', donOtros:'#b45309', neutral:'#e5e7eb'
  };

  function state(){
    try{ if(typeof window.state !== 'undefined' && window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    try{ if(window.ControlEventRuntime?.app?.state) return window.ControlEventRuntime.app.state; }catch(_){ }
    return {};
  }
  function arr(name){ const value = state()[name]; return Array.isArray(value) ? value : []; }
  function selectedId(){
    try{ const ev = typeof window.selectedEvent === 'function' ? window.selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ }
    return String(state().selectedEventId || $('selectedEvent')?.value || '');
  }
  function byId(list, id){ const sid = String(id || ''); return arr(list).find(item => same(item?.id, sid)) || null; }
  function selectedEvent(){ const id = selectedId(); return byId('eventos', id) || {}; }
  function persona(id){ return byId('personas', id) || {}; }
  function producto(id){ return byId('productos', id) || {}; }
  function tienda(id){ return byId('tiendas', id) || {}; }
  function parseAmount(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let text = String(value ?? '').replace(/[^0-9,.-]/g,'').trim();
    if(!text) return 0;
    if(text.includes(',') && text.includes('.')) text = text.replace(/\./g,'').replace(',','.');
    else if(text.includes(',')) text = text.replace(',','.');
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  }
  function money(value){
    try{ if(typeof window.money === 'function') return window.money(Number(value || 0)); }catch(_){ }
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value||0)); }catch(_){ return `${Number(value||0).toFixed(2)} €`; }
  }
  function qty(value){
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(value || 0)); }catch(_){ return String(Number(value || 0)); }
  }
  function isDonation(ticket){
    try{ if(typeof window.isDonationTicket === 'function') return !!window.isDonationTicket(ticket); }catch(_){ }
    return DONATION_TYPES.includes(up(ticket));
  }
  function isCurrentExpense(ticket){
    try{ if(typeof window.isCurrentExpenseTicket === 'function') return !!window.isCurrentExpenseTicket(ticket); }catch(_){ }
    return up(ticket) === 'GASTOS CORRIENTES' || up(ticket).includes('GASTOS CORRIENTES');
  }
  function isPendingTicket(ticket){
    const t = up(ticket);
    return !t || t.includes('PTE') || t.includes('PENDIENTE') || t.includes('COMPRA');
  }
  function unitPrice(row){
    const p = producto(row?.productoId);
    const candidates = [row?.precio, row?.precioCalc, row?.defaultPrecio, p.precio, p.defaultPrecio];
    for(const item of candidates){ const n = parseAmount(item); if(Number.isFinite(n) && n > 0) return n; }
    return 0;
  }
  function rowValue(row){
    const directKeys = ['importe','valor','total','importeCompra','importeTotal'];
    for(const key of directKeys){
      if(row && row[key] !== undefined && row[key] !== null && row[key] !== ''){
        const n = parseAmount(row[key]);
        if(Number.isFinite(n) && Math.abs(n) > 0) return n;
      }
    }
    return Number(row?.unidades || 0) * unitPrice(row);
  }
  function unitPriceFrom(unidades, total){
    const u = Number(unidades || 0), t = Number(total || 0);
    return u > 0 ? t / u : 0;
  }
  function eventTitle(){ return norm(selectedEvent().titulo || selectedEvent().nombre || $('selectedEvent')?.selectedOptions?.[0]?.textContent || 'Evento'); }

  function collabRows(){
    const eventId = selectedId();
    const ev = selectedEvent();
    const price = parseAmount(ev?.precio || ev?.EVENTOS_PRECIO || 0);
    return arr('colaboradores').filter(row => same(row?.eventId, eventId)).map(row => {
      const per = persona(row?.personaId);
      const rango = norm(per.rango || row.rango || row.personaRango || '');
      const socio = up(rango) === 'SOCIO';
      const numero = Number(row.numero || 0);
      const obligatorio = socio ? numero * price : 0;
      const voluntario = parseAmount(row.importe ?? row.importeVoluntario ?? row.voluntario ?? row.extra ?? 0);
      const total = parseAmount(row.__ceV259Parts?.total ?? row.total ?? 0) || (obligatorio + voluntario);
      return {...row, persona: per, rango, socio, numero, obligatorio, voluntario, total};
    });
  }
  function comprasRows(){
    const eventId = selectedId();
    return arr('compras').filter(row => same(row?.eventId, eventId)).map(row => {
      const p = producto(row?.productoId);
      const t = tienda(row?.tiendaId || p.tiendaId || p.defaultTiendaId);
      const resp = persona(row?.responsableId || row?.responsable || row?.socioResponsableId);
      const ticket = norm(row?.ticketDonacion || row?.ticket || '');
      const donation = isDonation(ticket);
      const value = rowValue(row);
      const unidades = Number(row?.unidades || 0);
      let kind = 'compra', subtype = 'Compras', color = COLORS.compra;
      if(donation){
        kind = 'donacion'; subtype = ticket || 'Donación';
        color = up(ticket) === 'DONADO TIENDA' ? COLORS.donTienda : (up(ticket) === 'DONADO SOCIO' ? COLORS.donSocio : COLORS.donOtros);
      }else if(isCurrentExpense(ticket)){ subtype = 'Gastos corrientes'; color = COLORS.corriente; }
      else if(isPendingTicket(ticket)){ subtype = 'Pte.Compra'; color = COLORS.pendiente; }
      else { subtype = 'Comprado / TK'; color = COLORS.compra; }
      return {
        ...row,
        productoObj:p, tiendaObj:t, responsableObj:resp,
        productoNombre:norm(p.nombre || row.producto || 'Producto sin nombre'),
        segmento:norm(p.segmento || row.segmento || 'Sin segmento'),
        destino:norm(p.destino || row.destino || 'Sin destino'),
        tiendaNombre:norm(t.nombre || row.tienda || 'Sin tienda'),
        responsableNombre:norm(resp.nombre || ''),
        ticket, donation, kind, subtype, color, value, unidades,
        precioUnitario: unitPriceFrom(unidades, value) || unitPrice(row)
      };
    });
  }
  function incomePayment(row){
    const raw = norm(row.situacion || row.ingreso || row.formaPago || row.estadoIngreso || 'Pendiente');
    const u = up(raw);
    if(!raw || u.includes('PENDIENTE')) return 'Pendiente';
    if(u.includes('BANCO')) return 'Banco';
    if(u.includes('BIZUM')) return 'Bizum';
    if(u.includes('EFECTIVO')) return 'Efectivo';
    return raw;
  }
  function incomeKey(row){
    const pay = incomePayment(row);
    if(pay === 'Pendiente') return 'PENDIENTE';
    const prefix = row.socio ? 'SOCIO' : 'NOSOCIO';
    return `${prefix}_${slug(pay)}`;
  }
  function incomeLabel(key, sample){
    const pay = incomePayment(sample || {});
    if(key === 'PENDIENTE') return 'Pendiente de ingresar';
    return `${sample?.socio ? 'Socios' : 'No socios'} ${pay}`;
  }
  function incomeColor(key, sample){
    if(key === 'PENDIENTE') return COLORS.incomePendiente;
    const pay = up(incomePayment(sample || {}));
    if(sample?.socio && pay === 'BANCO') return COLORS.incomeSocioBanco;
    if(sample?.socio && pay === 'BIZUM') return COLORS.incomeSocioBizum;
    if(sample?.socio && pay === 'EFECTIVO') return COLORS.incomeSocioEfectivo;
    if(!sample?.socio && pay === 'BANCO') return COLORS.incomeNoSocioBanco;
    if(!sample?.socio && pay === 'BIZUM') return COLORS.incomeNoSocioBizum;
    if(!sample?.socio && pay === 'EFECTIVO') return COLORS.incomeNoSocioEfectivo;
    return COLORS.incomeOther;
  }
  function buildIncomeItems(rows){
    const map = new Map();
    rows.forEach(row => {
      const key = incomeKey(row);
      if(!map.has(key)) map.set(key, {key, label:incomeLabel(key,row), color:incomeColor(key,row), value:0, rows:[]});
      const item = map.get(key);
      item.value += Number(row.total || 0);
      item.rows.push(row);
    });
    const order = ['SOCIO_BANCO','SOCIO_BIZUM','SOCIO_EFECTIVO','NOSOCIO_BANCO','NOSOCIO_BIZUM','NOSOCIO_EFECTIVO','PENDIENTE'];
    return Array.from(map.values()).sort((a,b) => {
      const ia = order.indexOf(a.key), ib = order.indexOf(b.key);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.label.localeCompare(b.label,'es');
    });
  }
  function groupResources(rows, field){
    const map = new Map();
    rows.forEach(row => {
      const label = norm(row[field] || (field === 'segmento' ? 'Sin segmento' : 'Sin destino'));
      if(!map.has(label)) map.set(label, {key:label, label, compras:0, donaciones:0, total:0, rows:[], products:new Map(), comprasDetalle:{comprado:0,corriente:0,pendiente:0}, donDetalle:{tienda:0,socio:0,otros:0}});
      const group = map.get(label);
      group.rows.push(row);
      const val = Number(row.value || 0);
      group.total += val;
      if(row.kind === 'donacion'){
        group.donaciones += val;
        const t = up(row.ticket);
        if(t === 'DONADO TIENDA') group.donDetalle.tienda += val; else if(t === 'DONADO SOCIO') group.donDetalle.socio += val; else group.donDetalle.otros += val;
      }else{
        group.compras += val;
        if(row.subtype === 'Gastos corrientes') group.comprasDetalle.corriente += val; else if(row.subtype === 'Pte.Compra') group.comprasDetalle.pendiente += val; else group.comprasDetalle.comprado += val;
      }
      const pid = norm(row.productoId || row.productoNombre);
      if(!group.products.has(pid)) group.products.set(pid, {id:pid, producto:row.productoNombre, segmento:row.segmento, destino:row.destino, compras:0, donaciones:0, total:0, unidadesCompra:0, unidadesDonadas:0, rows:[]});
      const product = group.products.get(pid);
      product.rows.push(row);
      product.total += val;
      if(row.kind === 'donacion'){ product.donaciones += val; product.unidadesDonadas += Number(row.unidades || 0); }
      else { product.compras += val; product.unidadesCompra += Number(row.unidades || 0); }
    });
    return Array.from(map.values()).map(group => ({
      ...group,
      products: Array.from(group.products.values()).sort((a,b) => a.producto.localeCompare(b.producto,'es',{sensitivity:'base'}))
    })).sort((a,b) => b.total - a.total || a.label.localeCompare(b.label,'es'));
  }
  function buildModel(){
    const ingresos = collabRows();
    const compras = comprasRows();
    const incomeItems = buildIncomeItems(ingresos);
    const resourceRows = compras.filter(row => row.kind === 'compra' || row.kind === 'donacion');
    const compraRows = resourceRows.filter(row => row.kind === 'compra');
    const donationRows = resourceRows.filter(row => row.kind === 'donacion');
    const totalIncome = incomeItems.reduce((sum,item) => sum + Number(item.value || 0), 0);
    const totalCompras = compraRows.reduce((sum,row) => sum + Number(row.value || 0), 0);
    const totalDonaciones = donationRows.reduce((sum,row) => sum + Number(row.value || 0), 0);
    const segmentos = groupResources(resourceRows, 'segmento');
    const destinos = groupResources(resourceRows, 'destino');
    return {eventId:selectedId(), title:eventTitle(), ingresos, compras:resourceRows, incomeItems, totalIncome, totalCompras, totalDonaciones, totalRecursos:totalCompras + totalDonaciones, segmentos, destinos};
  }

  function valueToSrc(value){
    if(!value) return '';
    if(typeof value === 'string') return value;
    if(typeof value === 'object') return value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.base64 || value.dataUrl || value.dataURL || value.image || value.src || '';
    return '';
  }
  function receiptKeys(id){ const ev = selectedId(); const sid = String(id || ''); return [`${ev}|INGRESO:${sid}`, `${ev}|INGRESO|${sid}`, `INGRESO:${ev}|${sid}`, `INGRESO:${sid}`]; }
  function jsonGet(key){ try{ return JSON.parse(localStorage.getItem(key) || '') || {}; }catch(_){ return {}; } }
  function receiptSrc(id){
    const s = state(); const stores = [s.ticketImages, s.ticketImageRefs, jsonGet('ControlEvent_ingreso_receipts_v468')].filter(Boolean);
    for(const store of stores){
      for(const key of receiptKeys(id)){ const src = valueToSrc(store[key]); if(src) return src; }
    }
    return '';
  }

  function polar(cx, cy, r, angle){ const rad = (angle - 90) * Math.PI / 180; return {x:cx + r * Math.cos(rad), y:cy + r * Math.sin(rad)}; }
  function arcPath(cx, cy, r, start, end){ const s = polar(cx,cy,r,end), e = polar(cx,cy,r,start); const large = end - start <= 180 ? 0 : 1; return `M ${cx} ${cy} L ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(3)} ${e.y.toFixed(3)} Z`; }
  function pieSvg(items, total, type){
    const valid = items.filter(item => Math.abs(Number(item.value || 0)) > 0);
    if(!valid.length) return `<svg class="ce-v19-pie" viewBox="0 0 100 100" aria-label="Sin datos"><circle cx="50" cy="50" r="42" fill="${COLORS.neutral}"></circle><circle cx="50" cy="50" r="22" fill="#fff"></circle></svg>`;
    let angle = 0;
    const paths = valid.map(item => {
      const inc = valid.length === 1 ? 360 : Math.max(7, Math.abs(Number(item.value || 0)) / Math.max(0.0001,total) * 360);
      const start = angle; angle += inc;
      const common = `data-v19-${type}-key="${esc(item.key)}" tabindex="0" role="button" aria-label="${esc(item.label)} ${esc(money(item.value))}"`;
      if(valid.length === 1 || inc >= 359.9){
        return `<g ${common}><circle class="ce-v19-pie-slice" cx="50" cy="50" r="42" fill="${esc(item.color)}"></circle></g>`;
      }
      return `<g ${common}><path class="ce-v19-pie-slice" d="${arcPath(50,50,42,start,angle)}" fill="${esc(item.color)}"></path></g>`;
    }).join('');
    return `<svg class="ce-v19-pie" viewBox="0 0 100 100" aria-label="Gráfica de ingresos">${paths}<circle cx="50" cy="50" r="22" fill="#fff"></circle></svg>`;
  }
  function legendRows(items, type){
    const valid = items.filter(item => Math.abs(Number(item.value || 0)) > 0);
    if(!valid.length) return '<div class="ce-v19-empty-small">Sin datos.</div>';
    return valid.map(item => `<button type="button" class="ce-v19-legend-row" data-v19-${type}-key="${esc(item.key)}"><span class="ce-v19-dot" style="background:${esc(item.color)}"></span><span>${esc(item.label)}</span><strong>${esc(money(item.value))}</strong></button>`).join('');
  }
  function metric(label, value, cls){ return `<div class="ce-v19-metric ${cls||''}"><span>${esc(label)}</span><strong>${esc(money(value))}</strong></div>`; }
  function groupBars(groups, kind){
    if(!groups.length) return '<div class="ce-v19-empty-small">Sin recursos.</div>';
    const max = Math.max(1, ...groups.map(g => Number(g.total || 0)));
    return groups.map(group => {
      const w = Math.max(5, Number(group.total || 0) / max * 100);
      const compraPct = group.total > 0 ? group.compras / group.total * 100 : 0;
      const donPct = group.total > 0 ? group.donaciones / group.total * 100 : 0;
      return `<button type="button" class="ce-v19-bar-row" data-v19-group-kind="${esc(kind)}" data-v19-group-key="${esc(group.key)}">
        <div class="ce-v19-bar-top"><span>${esc(group.label)}</span><strong>${esc(money(group.total))}</strong></div>
        <div class="ce-v19-bar-track"><div class="ce-v19-bar-inner" style="width:${w.toFixed(2)}%"><i class="buy" style="width:${compraPct.toFixed(2)}%"></i><i class="don" style="width:${donPct.toFixed(2)}%"></i></div></div>
        <div class="ce-v19-bar-foot"><span>Compras ${esc(money(group.compras))}</span><span>Donado ${esc(money(group.donaciones))}</span><span>${group.products.length} producto(s)</span></div>
      </button>`;
    }).join('');
  }
  function renderModal(model){
    return `<div class="ce-v19-global-backdrop">
      <div class="ce-v19-global-card" role="dialog" aria-modal="true" aria-label="Vista gráfica completa del evento">
        <div class="ce-v19-global-head">
          <div><h2>📊 Vista gráfica completa del evento</h2><p>${esc(model.title)} · ${esc(VERSION)}</p></div>
          <button type="button" class="ce-v19-close" data-v19-close="1" aria-label="Cerrar">Cerrar</button>
        </div>
        <div class="ce-v19-metrics">
          ${metric('INGRESOS', model.totalIncome, 'income')}
          ${metric('COMPRAS', model.totalCompras, 'buy')}
          ${metric('DONACIONES', model.totalDonaciones, 'don')}
          ${metric('COMPRAS + DONACIONES', model.totalRecursos, 'total')}
        </div>
        <div class="ce-v19-global-grid">
          <section class="ce-v19-panel ce-v19-income-panel">
            <div class="ce-v19-panel-title"><span>INGRESOS</span><strong>${esc(money(model.totalIncome))}</strong></div>
            <div class="ce-v19-pie-wrap">${pieSvg(model.incomeItems, model.totalIncome, 'income')}<div class="ce-v19-legend">${legendRows(model.incomeItems, 'income')}</div></div>
            <div class="ce-v19-hint">Pulsa una porción o una línea para ver personas y justificantes.</div>
          </section>
          <section class="ce-v19-panel ce-v19-resources-panel">
            <div class="ce-v19-panel-title"><span>COMPRAS + DONACIONES</span><strong>${esc(money(model.totalRecursos))}</strong></div>
            <div class="ce-v19-resource-legend"><span><i class="buy"></i>Compras</span><span><i class="don"></i>Donaciones</span></div>
            <div class="ce-v19-bars-grid">
              <div><h3>Por segmento</h3>${groupBars(model.segmentos, 'segmento')}</div>
              <div><h3>Por destino</h3>${groupBars(model.destinos, 'destino')}</div>
            </div>
            <div class="ce-v19-hint">Pulsa un segmento para ver sus productos de todos los destinos combinados. Pulsa un destino para ver sus productos A-Z.</div>
          </section>
        </div>
        <section id="${DETAIL_ID}" class="ce-v19-detail"><div class="ce-v19-detail-empty">Selecciona un ingreso, segmento o destino para ver el detalle ordenado.</div></section>
      </div>
    </div>`;
  }
  function renderIncomeDetail(key){
    const model = buildModel();
    const item = model.incomeItems.find(x => x.key === key);
    const detail = $(DETAIL_ID); if(!detail || !item) return;
    const rows = item.rows.slice().sort((a,b) => (a.socio === b.socio ? 0 : (a.socio ? -1 : 1)) || norm(a.persona?.nombre || '').localeCompare(norm(b.persona?.nombre || ''),'es',{sensitivity:'base'}));
    detail.innerHTML = `<div class="ce-v19-detail-head"><div><h3>Ingresos · ${esc(item.label)}</h3><p>${rows.length} persona(s) · ${esc(money(item.value))}</p></div><button type="button" class="ce-v19-detail-clear" data-v19-clear-detail="1">Limpiar</button></div>
      <div class="ce-v19-income-list">${rows.map(row => {
        const name = norm(row.persona?.nombre || persona(row.personaId).nombre || 'Sin nombre');
        const src = receiptSrc(row.id);
        const thumb = src ? `<button type="button" class="ce-v19-receipt-thumb" data-v19-receipt-id="${esc(row.id)}" data-v19-receipt-src="${esc(src)}" aria-label="Ver justificante de ${esc(name)}"><img src="${esc(src)}" alt="Justificante"></button>` : '<span class="ce-v19-no-receipt">📷</span>';
        return `<article class="ce-v19-income-row">${thumb}<div><strong>${esc(name)}</strong><span>${esc(row.rango || '—')} · ${esc(incomePayment(row))} · Nº ${esc(qty(row.numero))}</span></div><div class="ce-v19-income-money"><strong>${esc(money(row.total))}</strong><span>Obl. ${esc(money(row.obligatorio))} · Vol. ${esc(money(row.voluntario))}</span></div></article>`;
      }).join('') || '<div class="ce-v19-empty-small">Sin registros.</div>'}</div>`;
  }
  function rowTicket(row){ return norm(row.ticket || row.ticketDonacion || 'Pte.Compra'); }
  function renderProductDetail(kind, key){
    const model = buildModel();
    const groups = kind === 'segmento' ? model.segmentos : model.destinos;
    const group = groups.find(x => x.key === key);
    const detail = $(DETAIL_ID); if(!detail || !group) return;
    detail.innerHTML = `<div class="ce-v19-detail-head"><div><h3>${kind === 'segmento' ? 'Segmento' : 'Destino'} · ${esc(group.label)}</h3><p>${group.products.length} producto(s) A-Z · Compras ${esc(money(group.compras))} · Donado ${esc(money(group.donaciones))}</p></div><button type="button" class="ce-v19-detail-clear" data-v19-clear-detail="1">Limpiar</button></div>
      <div class="ce-v19-products-table">
        <div class="ce-v19-products-head"><span>Producto</span><span>Segmento</span><span>Destino</span><span>Compras</span><span>Donado</span><span>Total</span></div>
        ${group.products.map(product => `<article class="ce-v19-product-line">
          <strong>${esc(product.producto)}</strong><span>${esc(product.segmento)}</span><span>${esc(product.destino)}</span><span>${esc(qty(product.unidadesCompra))} uds. · ${esc(money(product.compras))}</span><span>${esc(qty(product.unidadesDonadas))} uds. · ${esc(money(product.donaciones))}</span><strong>${esc(money(product.total))}</strong>
          <details><summary>Ver líneas</summary><div class="ce-v19-product-subrows">${product.rows.slice().sort((a,b)=>a.productoNombre.localeCompare(b.productoNombre,'es')).map(row => `<div><span>${esc(row.kind === 'donacion' ? 'Donación' : 'Compra')}</span><span>${esc(rowTicket(row))}</span><span>${esc(row.tiendaNombre)}</span><span>${esc(qty(row.unidades))} uds.</span><strong>${esc(money(row.value))}</strong></div>`).join('')}</div></details>
        </article>`).join('') || '<div class="ce-v19-empty-small">Sin productos.</div>'}
      </div>`;
  }
  function showImage(src, title){
    if(!src) return;
    const old = $('ceV19ImageViewer'); if(old) old.remove();
    const viewer = document.createElement('div'); viewer.id = 'ceV19ImageViewer'; viewer.className = 'ce-v19-image-viewer';
    viewer.innerHTML = `<div class="ce-v19-image-card"><div><strong>${esc(title || 'Justificante')}</strong><button type="button" data-v19-image-close="1">Cerrar</button></div><img src="${esc(src)}" alt="${esc(title || 'Justificante')}"></div>`;
    viewer.addEventListener('click', ev => { if(ev.target === viewer || ev.target.closest('[data-v19-image-close]')) viewer.remove(); });
    document.body.appendChild(viewer);
  }
  function openModal(){
    if(!selectedId()){ alert('Selecciona un evento para ver la vista gráfica.'); return; }
    const old = $(OVERLAY_ID); if(old) old.remove();
    const model = buildModel();
    const overlay = document.createElement('div'); overlay.id = OVERLAY_ID; overlay.innerHTML = renderModal(model);
    document.body.appendChild(overlay);
    try{ document.body.classList.add('ce-v19-modal-open'); }catch(_){ }
    const close = () => { overlay.remove(); document.body.classList.remove('ce-v19-modal-open'); document.removeEventListener('keydown', escClose, true); };
    const escClose = ev => { if(ev.key === 'Escape') close(); };
    overlay.__ceV19Close = close;
    overlay.addEventListener('click', ev => {
      if(ev.target?.classList?.contains('ce-v19-global-backdrop') || ev.target?.closest?.('.ce-v19-close,[data-v19-close]')){ ev.preventDefault(); close(); return; }
      const income = ev.target?.closest?.('[data-v19-income-key]');
      if(income){ ev.preventDefault(); renderIncomeDetail(income.getAttribute('data-v19-income-key')); return; }
      const group = ev.target?.closest?.('[data-v19-group-kind]');
      if(group){ ev.preventDefault(); renderProductDetail(group.getAttribute('data-v19-group-kind'), group.getAttribute('data-v19-group-key')); return; }
      if(ev.target?.closest?.('[data-v19-clear-detail]')){ ev.preventDefault(); const d=$(DETAIL_ID); if(d) d.innerHTML='<div class="ce-v19-detail-empty">Selecciona un ingreso, segmento o destino para ver el detalle ordenado.</div>'; return; }
      const receipt = ev.target?.closest?.('[data-v19-receipt-id]');
      if(receipt){
        ev.preventDefault();
        const id = receipt.getAttribute('data-v19-receipt-id');
        try{ if(window.ControlEventV469?.showReceiptModal){ window.ControlEventV469.showReceiptModal(id); return; } }catch(_){ }
        showImage(receipt.getAttribute('data-v19-receipt-src'), 'Justificante');
      }
    }, true);
    overlay.addEventListener('keydown', ev => {
      if((ev.key === 'Enter' || ev.key === ' ') && ev.target?.matches?.('[data-v19-income-key],[data-v19-group-kind]')){ ev.preventDefault(); ev.target.click(); }
    }, true);
    document.addEventListener('keydown', escClose, true);
  }

  function injectStyle(){
    if($('ceV19MapaGlobalStyle')) return;
    const style = document.createElement('style'); style.id = 'ceV19MapaGlobalStyle';
    style.textContent = `
      #tabMapaProductos .section-title.ce-v19-map-head{display:flex!important;align-items:center!important;gap:12px!important;}
      #tabMapaProductos .section-title.ce-v19-map-head > div:nth-child(2){min-width:0;}
      .ce-v19-map-head-spacer{flex:1 1 auto;}
      #${BUTTON_ID}.ce-mapa-global-btn{margin-left:auto;width:44px;height:44px;min-width:44px;border-radius:16px;border:1px solid rgba(14,165,233,.35);background:linear-gradient(135deg,#eff6ff,#e0f2fe);box-shadow:0 10px 24px rgba(2,132,199,.12);display:inline-flex;align-items:center;justify-content:center;font-size:23px;line-height:1;padding:0;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;}
      #${BUTTON_ID}.ce-mapa-global-btn:hover{transform:translateY(-1px);box-shadow:0 16px 34px rgba(2,132,199,.2);}
      .ce-v19-modal-open{overflow:hidden;}
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:1000003;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
      .ce-v19-global-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:18px;}
      .ce-v19-global-card{width:min(1320px,96vw);max-height:94vh;overflow:auto;background:#f8fafc;border:1px solid rgba(226,232,240,.95);border-radius:26px;box-shadow:0 32px 100px rgba(15,23,42,.42);padding:18px;color:#0f172a;}
      .ce-v19-global-head{position:sticky;top:0;z-index:2;margin:-18px -18px 14px;padding:16px 18px;background:rgba(248,250,252,.94);backdrop-filter:blur(8px);border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:12px;}
      .ce-v19-global-head h2{margin:0;font-size:22px;font-weight:950;letter-spacing:-.02em;}.ce-v19-global-head p{margin:4px 0 0;color:#64748b;font-size:13px;font-weight:800;}
      .ce-v19-close,.ce-v19-detail-clear{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:999px;padding:9px 14px;font-weight:950;cursor:pointer;}
      .ce-v19-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px;}.ce-v19-metric{border-radius:18px;background:#fff;border:1px solid #e2e8f0;padding:13px;box-shadow:0 8px 24px rgba(15,23,42,.06);}.ce-v19-metric span{display:block;font-size:11px;font-weight:950;color:#64748b;letter-spacing:.05em;}.ce-v19-metric strong{display:block;margin-top:5px;font-size:24px;font-weight:1000;}.ce-v19-metric.income strong{color:#0369a1}.ce-v19-metric.buy strong{color:#dc2626}.ce-v19-metric.don strong{color:#b45309}.ce-v19-metric.total strong{color:#0f766e}
      .ce-v19-global-grid{display:grid;grid-template-columns:minmax(320px,430px) minmax(0,1fr);gap:12px;align-items:start;}.ce-v19-panel{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:14px;box-shadow:0 8px 26px rgba(15,23,42,.06);}.ce-v19-panel-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}.ce-v19-panel-title span{font-weight:1000;color:#0f172a;}.ce-v19-panel-title strong{font-size:18px;color:#0f766e;}
      .ce-v19-pie-wrap{display:grid;grid-template-columns:170px minmax(0,1fr);gap:12px;align-items:center;}.ce-v19-pie{width:170px;height:170px;filter:drop-shadow(0 14px 22px rgba(15,23,42,.12));}.ce-v19-pie-slice{cursor:pointer;transition:filter .15s ease,transform .15s ease;transform-origin:50% 50%;}.ce-v19-pie g:hover .ce-v19-pie-slice{filter:brightness(1.06);transform:scale(1.018);}.ce-v19-legend{display:flex;flex-direction:column;gap:6px;}.ce-v19-legend-row{display:grid;grid-template-columns:14px minmax(0,1fr) auto;align-items:center;gap:8px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:7px 8px;text-align:left;cursor:pointer;}.ce-v19-legend-row span:nth-child(2){font-size:12px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ce-v19-legend-row strong{font-size:12px;}.ce-v19-dot,.ce-v19-resource-legend i{width:11px;height:11px;border-radius:999px;display:inline-block;}.ce-v19-hint{margin-top:10px;font-size:12px;color:#64748b;font-weight:800;}
      .ce-v19-resource-legend{display:flex;gap:12px;align-items:center;justify-content:flex-end;margin:-6px 0 8px;font-size:12px;font-weight:950;color:#475569;}.ce-v19-resource-legend span{display:inline-flex;align-items:center;gap:5px;}.ce-v19-resource-legend .buy{background:#dc2626}.ce-v19-resource-legend .don{background:#f59e0b}.ce-v19-bars-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}.ce-v19-bars-grid h3{font-size:15px;margin:0 0 8px;font-weight:1000;color:#0f172a;}
      .ce-v19-bar-row{display:block;width:100%;border:1px solid #e2e8f0;background:#fff;border-radius:15px;padding:9px;margin:0 0 8px;text-align:left;cursor:pointer;box-shadow:0 3px 10px rgba(15,23,42,.04);}.ce-v19-bar-row:hover{border-color:#93c5fd;background:#f8fbff}.ce-v19-bar-top{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;font-weight:950;}.ce-v19-bar-top span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.ce-v19-bar-track{height:13px;background:#eef2f7;border-radius:999px;overflow:hidden;margin:7px 0;}.ce-v19-bar-inner{height:100%;display:flex;border-radius:999px;overflow:hidden;min-width:4px;}.ce-v19-bar-inner .buy{background:#dc2626}.ce-v19-bar-inner .don{background:#f59e0b}.ce-v19-bar-foot{display:flex;gap:8px;flex-wrap:wrap;color:#64748b;font-size:11px;font-weight:850;}
      .ce-v19-detail{margin-top:12px;background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:13px;box-shadow:0 8px 26px rgba(15,23,42,.05);}.ce-v19-detail-empty,.ce-v19-empty-small{color:#64748b;font-weight:900;padding:12px;text-align:center;background:#f8fafc;border-radius:14px;}.ce-v19-detail-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}.ce-v19-detail-head h3{margin:0;font-size:18px;font-weight:1000;}.ce-v19-detail-head p{margin:4px 0 0;color:#64748b;font-size:12px;font-weight:850;}
      .ce-v19-income-list{display:flex;flex-direction:column;gap:7px;}.ce-v19-income-row{display:grid;grid-template-columns:48px minmax(0,1fr) minmax(180px,auto);gap:10px;align-items:center;border:1px solid #e2e8f0;border-radius:15px;padding:8px;background:#fff;}.ce-v19-income-row strong{font-weight:1000;}.ce-v19-income-row span{display:block;color:#64748b;font-size:12px;font-weight:800;}.ce-v19-income-money{text-align:right;}.ce-v19-receipt-thumb{width:44px;height:44px;border:1px solid #cbd5e1;border-radius:12px;padding:0;overflow:hidden;background:#f8fafc;cursor:pointer;}.ce-v19-receipt-thumb img{width:100%;height:100%;object-fit:cover;display:block;}.ce-v19-no-receipt{width:44px;height:44px;display:flex!important;align-items:center;justify-content:center;border-radius:12px;background:#f1f5f9;border:1px solid #e2e8f0;}
      .ce-v19-products-table{display:flex;flex-direction:column;gap:7px;}.ce-v19-products-head,.ce-v19-product-line{display:grid;grid-template-columns:minmax(190px,1.3fr) minmax(110px,.8fr) minmax(110px,.8fr) minmax(120px,.8fr) minmax(120px,.8fr) minmax(100px,.7fr);gap:8px;align-items:center;}.ce-v19-products-head{font-size:11px;font-weight:1000;color:#64748b;padding:0 9px;}.ce-v19-product-line{border:1px solid #e2e8f0;border-radius:15px;padding:9px;background:#fff;font-size:13px;}.ce-v19-product-line > strong:first-child{font-size:14px;}.ce-v19-product-line span{color:#475569;font-weight:850;}.ce-v19-product-line details{grid-column:1/-1;background:#f8fafc;border-radius:12px;padding:6px 8px;}.ce-v19-product-line summary{font-weight:950;cursor:pointer;color:#0369a1;}.ce-v19-product-subrows{display:flex;flex-direction:column;gap:4px;margin-top:7px;}.ce-v19-product-subrows div{display:grid;grid-template-columns:90px 130px 1fr 90px 90px;gap:8px;border-top:1px dashed #e2e8f0;padding-top:4px;}
      .ce-v19-image-viewer{position:fixed;inset:0;z-index:1000005;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;padding:18px;}.ce-v19-image-card{background:#fff;border-radius:18px;padding:12px;max-width:min(980px,96vw);max-height:94vh;display:flex;flex-direction:column;gap:10px;box-shadow:0 26px 86px rgba(0,0,0,.42);}.ce-v19-image-card>div{display:flex;align-items:center;justify-content:space-between;gap:10px;}.ce-v19-image-card button{border:1px solid #cbd5e1;border-radius:999px;background:#fff;padding:7px 12px;font-weight:950;}.ce-v19-image-card img{max-width:100%;max-height:80vh;object-fit:contain;border-radius:12px;background:#f8fafc;}
      @media(max-width:1040px){.ce-v19-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.ce-v19-global-grid{grid-template-columns:1fr}.ce-v19-pie-wrap{grid-template-columns:150px 1fr}.ce-v19-pie{width:150px;height:150px}.ce-v19-products-head{display:none}.ce-v19-product-line{grid-template-columns:1fr 1fr}.ce-v19-product-line details{grid-column:1/-1}.ce-v19-product-subrows div{grid-template-columns:1fr 1fr;}}
      @media(max-width:720px){.ce-v19-global-backdrop{padding:8px;align-items:flex-start}.ce-v19-global-card{width:100vw;max-height:96vh;border-radius:18px;padding:12px}.ce-v19-global-head{margin:-12px -12px 10px;padding:12px}.ce-v19-global-head h2{font-size:18px}.ce-v19-metrics{grid-template-columns:1fr 1fr}.ce-v19-metric{padding:10px}.ce-v19-metric strong{font-size:18px}.ce-v19-pie-wrap{grid-template-columns:1fr}.ce-v19-pie{margin:auto}.ce-v19-bars-grid{grid-template-columns:1fr}.ce-v19-income-row{grid-template-columns:44px 1fr}.ce-v19-income-money{grid-column:2;text-align:left}.ce-v19-product-line{grid-template-columns:1fr}.ce-v19-product-subrows div{grid-template-columns:1fr}.ce-v19-resource-legend{justify-content:flex-start;}}
    `;
    document.head.appendChild(style);
  }
  function ensureButton(){
    injectStyle();
    const section = document.querySelector('#tabMapaProductos .section-title');
    if(!section) return false;
    section.classList.add('ce-v19-map-head');
    let spacer = section.querySelector('.ce-v19-map-head-spacer');
    if(!spacer){ spacer = document.createElement('span'); spacer.className = 'ce-v19-map-head-spacer'; section.appendChild(spacer); }
    let btn = $(BUTTON_ID);
    if(!btn){
      btn = document.createElement('button'); btn.type = 'button'; btn.id = BUTTON_ID; btn.className = 'ce-mapa-global-btn'; btn.textContent = '📊';
      btn.setAttribute('aria-label','Vista gráfica completa de ingresos, compras y donaciones');
      btn.title = 'Vista gráfica completa';
      section.appendChild(btn);
    }
    if(!btn.__ceV19Bound){ btn.__ceV19Bound = true; btn.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); openModal(); }, true); }
    return true;
  }

  function scheduleEnsure(){ [0,80,260,800,1600].forEach(ms => setTimeout(ensureButton, ms)); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnsure, {once:true}); else scheduleEnsure();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:event-loaded','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, scheduleEnsure));
  window.ControlEventMapaGlobalV19 = {version:VERSION, ensureButton, open:openModal, build:buildModel};
})();
