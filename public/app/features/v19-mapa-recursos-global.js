/* ControlEvent v19_prod - Vista aerea desde Mapa de recursos.
   FIX6:
   - Sustituye RadioButton por grafica de barras SEGMENTO + DESTINO.
   - Añade SALDO ACTUAL y SALDO OPERATIVO en cabecera.
   - Titulo Vista aerea, evento coloreado por estado y auto-scroll a registros.
   - Cabeceras de registros en gris claro y mas legibles. */
(function(){
  'use strict';
  if(window.__ceV19MapaRecursosGlobal) return;
  window.__ceV19MapaRecursosGlobal = true;

  const VERSION = 'ControlEvent v19_prod';
  const BUTTON_ID = 'ceMapaGlobalBtn';
  const OVERLAY_ID = 'ceMapaGlobalOverlay';
  const DETAIL_ID = 'ceMapaGlobalDetail';
  const DONATION_TYPES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const KNOWN_SEGMENTS = ['Comida','Bebida','Infraestructura'];
  const KNOWN_DESTINOS = ['Aperitivo','Comida','Cubatas','Cena','Infraestructura'];
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
    compra:'#dc2626', compraOk:'#16a34a', corriente:'#16a34a', pendiente:'#dc2626',
    donTienda:'#fcd34d', donSocio:'#f59e0b', donOtros:'#b45309', neutral:'#e5e7eb'
  };

  let currentView = {type:'products', kind:'', key:''};
  const sortState = {
    products:{field:'producto', dir:'asc'},
    income:{field:'nombre', dir:'asc'}
  };
  const NUMERIC_SORTS = new Set(['compras','donado','importe','obligatorio','voluntario','total','just']);
  function sortButton(mode, field, label){
    const st = sortState[mode] || {};
    const active = st.field === field;
    const arrow = active ? (st.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return `<button type="button" class="ce-v19-sort-head${active ? ' active' : ''}" data-v19-sort-mode="${esc(mode)}" data-v19-sort-field="${esc(field)}" title="Ordenar por ${esc(label)}">${esc(label)}${arrow}</button>`;
  }
  function cmpValues(a,b, numeric){
    if(numeric){
      const na = Number(a || 0), nb = Number(b || 0);
      return na === nb ? 0 : (na < nb ? -1 : 1);
    }
    return String(a ?? '').localeCompare(String(b ?? ''),'es',{sensitivity:'base', numeric:true});
  }

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
  function isTk(ticket){ return /^TK\s*\d+/i.test(norm(ticket)); }
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
  function eventStatusInfo(){
    const ev = selectedEvent();
    const raw = norm(ev.situacion || ev.estado || ev.status || document.querySelector('.event-status,.status-badge,.badge-status')?.textContent || 'En curso');
    const fin = up(raw).includes('FINAL');
    return {label: fin ? 'Finalizado' : 'En curso', cls: fin ? 'finalizado' : 'curso'};
  }
  function refName(ref){
    const clean = norm(ref);
    if(!clean) return '';
    const parts = clean.split(':');
    const kind = up(parts.shift() || '');
    const id = parts.join(':');
    if((kind === 'P' || kind === 'PERSONA') && id) return norm(persona(id).nombre) || clean;
    if((kind === 'T' || kind === 'TIENDA') && id) return norm(tienda(id).nombre) || clean;
    return norm(persona(clean).nombre || tienda(clean).nombre) || clean;
  }
  function donorName(row, storeObj){
    const ref = norm(row?.donorRef || row?.donanteRef || row?.donanteId || '');
    if(ref) return refName(ref);
    const direct = norm(row?.donanteNombre || row?.donante || row?.donorLabel || row?.donor || '');
    if(direct) return direct;
    if(row?.personaId && isDonation(row?.ticketDonacion || row?.ticket)) return norm(persona(row.personaId).nombre || '');
    return norm(storeObj?.nombre || tienda(row?.tiendaId).nombre || 'Sin donante');
  }

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
      let kind = 'compra', subtype = 'Compra', color = COLORS.compraOk, statusClass = 'ok';
      if(donation){
        kind = 'donacion'; subtype = ticket || 'Donación'; statusClass = 'donacion';
        color = up(ticket) === 'DONADO TIENDA' ? COLORS.donTienda : (up(ticket) === 'DONADO SOCIO' ? COLORS.donSocio : COLORS.donOtros);
      }else if(isCurrentExpense(ticket)){ subtype = 'GASTOS CORRIENTES'; color = COLORS.corriente; statusClass = 'ok'; }
      else if(isPendingTicket(ticket)){ subtype = 'Pte.Compra'; color = COLORS.pendiente; statusClass = 'pending'; }
      else { subtype = isTk(ticket) ? ticket : 'Compra'; color = COLORS.compraOk; statusClass = 'ok'; }
      return {
        ...row,
        productoObj:p, tiendaObj:t, responsableObj:resp,
        productoNombre:norm(p.nombre || row.producto?.nombre || row.productoNombre || row.producto || 'Producto sin nombre'),
        segmento:norm(p.segmento || row.segmento || 'Sin segmento'),
        destino:norm(p.destino || row.destino || 'Sin destino'),
        tiendaNombre:norm(t.nombre || row.tienda?.nombre || row.tienda || 'Sin tienda'),
        responsableNombre:norm(resp.nombre || row.responsableNombre || ''),
        donanteNombre: donorName(row, t),
        ticket, donation, kind, subtype, color, statusClass, value, unidades,
        precioUnitario: unitPriceFrom(unidades, value) || unitPrice(row)
      };
    });
  }
  function incomePayment(row){
    const raw = norm(row.situacion || row.estado || row.ingreso || row.formaPago || row.estadoIngreso || 'Pendiente');
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
      if(!map.has(label)) map.set(label, {key:label, label, compras:0, donaciones:0, total:0, rows:[], count:0});
      const group = map.get(label);
      group.rows.push(row);
      group.count += 1;
      const val = Number(row.value || 0);
      group.total += val;
      if(row.kind === 'donacion') group.donaciones += val; else group.compras += val;
    });
    return Array.from(map.values()).sort((a,b) => b.total - a.total || a.label.localeCompare(b.label,'es'));
  }
  function buildModel(){
    const ingresos = collabRows();
    const compras = comprasRows();
    const incomeItems = buildIncomeItems(ingresos);
    const resourceRows = compras.filter(row => row.kind === 'compra' || row.kind === 'donacion');
    const compraRows = resourceRows.filter(row => row.kind === 'compra');
    const donationRows = resourceRows.filter(row => row.kind === 'donacion');
    const totalIncome = incomeItems.reduce((sum,item) => sum + Number(item.value || 0), 0);
    const totalIncomeRealizado = ingresos.filter(row => incomePayment(row) !== 'Pendiente').reduce((sum,row) => sum + Number(row.total || 0), 0);
    const totalCompras = compraRows.reduce((sum,row) => sum + Number(row.value || 0), 0);
    const totalDonaciones = donationRows.reduce((sum,row) => sum + Number(row.value || 0), 0);
    const totalGastoRealizado = compraRows.filter(row => !isPendingTicket(rowTicket(row))).reduce((sum,row) => sum + Number(row.value || 0), 0);
    const saldoActual = totalIncomeRealizado - totalGastoRealizado;
    const saldoOperativo = totalIncome - totalCompras;
    const segmentos = groupResources(resourceRows, 'segmento');
    const destinos = groupResources(resourceRows, 'destino');
    const status = eventStatusInfo();
    return {eventId:selectedId(), title:eventTitle(), statusLabel:status.label, statusCls:status.cls, ingresos, compras:resourceRows, incomeItems, totalIncome, totalIncomeRealizado, totalCompras, totalDonaciones, totalGastoRealizado, saldoActual, saldoOperativo, totalRecursos:totalCompras + totalDonaciones, segmentos, destinos};
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
      const common = `data-v19-${type}-key="${esc(item.key)}" role="button" aria-label="${esc(item.label)} ${esc(money(item.value))}"`;
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
    return valid.map(item => `<button type="button" class="ce-v19-legend-row" style="color:${esc(item.color)}!important" data-v19-${type}-key="${esc(item.key)}"><span class="ce-v19-dot" style="background:${esc(item.color)}"></span><span style="color:${esc(item.color)}!important">${esc(item.label)}</span><strong style="color:${esc(item.color)}!important">${esc(money(item.value))}</strong></button>`).join('');
  }
  function metric(label, value, cls){ return `<div class="ce-v19-metric ${cls||''}"><span>${esc(label)}</span><strong>${esc(money(value))}</strong></div>`; }
  function orderIndex(list, label){ const key = up(label); const idx = list.map(up).indexOf(key); return idx === -1 ? 999 : idx; }
  function orderedGroups(groups, kind){
    const known = kind === 'segmento' ? KNOWN_SEGMENTS : KNOWN_DESTINOS;
    const map = new Map(groups.map(g => [up(g.label), g]));
    return [
      ...known.map(label => map.get(up(label)) || {key:label, label, compras:0, donaciones:0, total:0, rows:[], count:0}),
      ...groups.filter(g => !known.map(up).includes(up(g.label))).sort((a,b)=>a.label.localeCompare(b.label,'es',{sensitivity:'base'}))
    ];
  }
  function resourceBars(segmentos, destinos){
    const segs = orderedGroups(segmentos || [], 'segmento');
    const dests = orderedGroups(destinos || [], 'destino');
    const all = [
      ...segs.map(group => ({...group, kind:'segmento', prefix:'SEG'})),
      ...dests.map(group => ({...group, kind:'destino', prefix:'DEST'}))
    ];
    const max = Math.max(1, ...all.map(group => Number(group.total || 0)));
    if(!all.length) return '<div class="ce-v19-empty-small compact">Sin datos.</div>';
    return `<div class="ce-v19-resource-bars" role="list" aria-label="Gráfica de barras por segmento y destino">${all.map(group => {
      const pct = Number(group.total || 0) > 0 ? Math.max(2, Number(group.total || 0) / max * 100) : 0;
      const compPct = group.total ? Math.max(0, Number(group.compras || 0) / Number(group.total || 1) * 100) : 0;
      const donPct = group.total ? Math.max(0, 100 - compPct) : 0;
      return `<button type="button" class="ce-v19-resource-bar" role="listitem" data-v19-filter-kind="${esc(group.kind)}" data-v19-filter-key="${esc(group.key)}" title="${esc(group.prefix)} · ${esc(group.label)} · ${esc(money(group.total))}">
        <span class="ce-v19-bar-top"><em>${esc(group.prefix)}</em><strong>${esc(group.label)}</strong><b>${esc(money(group.total))}</b></span>
        <span class="ce-v19-bar-track"><span class="ce-v19-bar-fill" style="width:${pct.toFixed(2)}%"><i class="buy" style="width:${compPct.toFixed(2)}%"></i><i class="don" style="width:${donPct.toFixed(2)}%"></i></span></span>
        <span class="ce-v19-bar-sub">Compras ${esc(money(group.compras))} · Donado ${esc(money(group.donaciones))} · ${esc(String(group.count || 0))} reg.</span>
      </button>`;
    }).join('')}</div>`;
  }
  function renderModal(model){
    const statusColor = model.statusCls === 'finalizado' ? '#dc2626' : '#16a34a';
    return `<div class="ce-v19-global-backdrop">
      <div class="ce-v19-global-card" role="dialog" aria-modal="true" aria-label="Vista aérea del evento">
        <div class="ce-v19-global-head">
          <div><h2>📊 Vista aérea</h2><p><span class="ce-v19-event-title ${esc(model.statusCls)}" style="color:${statusColor}!important">${esc(model.title)}</span> · <span class="ce-v19-event-state ${esc(model.statusCls)}" style="color:${statusColor}!important">${esc(model.statusLabel)}</span></p></div>
          <button type="button" class="ce-v19-close" data-v19-close="1" aria-label="Cerrar">Cerrar</button>
        </div>
        <div class="ce-v19-metrics">
          ${metric('INGRESOS', model.totalIncome, 'income')}
          ${metric('COMPRAS', model.totalCompras, 'buy')}
          ${metric('SALDO ACTUAL', model.saldoActual, model.saldoActual >= 0 ? 'saldo saldo-ok' : 'saldo saldo-bad')}
          ${metric('SALDO OPERATIVO', model.saldoOperativo, model.saldoOperativo >= 0 ? 'operativo saldo-ok' : 'operativo saldo-bad')}
          ${metric('DONACIONES', model.totalDonaciones, 'don')}
          ${metric('PRODUCTO DISPONIBLE', model.totalRecursos, 'total')}
        </div>
        <div class="ce-v19-global-grid">
          <div class="ce-v19-left-col">
            <section class="ce-v19-panel ce-v19-income-panel">
              <div class="ce-v19-panel-title"><span>INGRESOS</span><strong>${esc(money(model.totalIncome))}</strong></div>
              <button type="button" class="ce-v19-income-all" data-v19-income-all="1">Ver todo</button>
              <div class="ce-v19-pie-wrap">${pieSvg(model.incomeItems, model.totalIncome, 'income')}<div class="ce-v19-legend">${legendRows(model.incomeItems, 'income')}</div></div>
              <div class="ce-v19-hint">Pulsa una porción o una línea para ver personas y justificantes.</div>
            </section>
            <section class="ce-v19-panel ce-v19-resources-panel">
              <div class="ce-v19-panel-title"><span>PRODUCTO DISPONIBLE</span><strong>${esc(money(model.totalRecursos))}</strong></div>
              <div class="ce-v19-resource-legend"><span><i class="buy"></i>Compras</span><span><i class="don"></i>Donaciones</span></div>
              ${resourceBars(model.segmentos, model.destinos)}
              <button type="button" class="ce-v19-clear-filter" data-v19-clear-filter="1">Ver todo</button>
              <div class="ce-v19-hint">Pulsa una barra de segmento o destino. Con “Ver todo” vuelven a salir todos los productos.</div>
            </section>
          </div>
          <section id="${DETAIL_ID}" class="ce-v19-detail ce-v19-right-detail">${renderProductRowsContent(model.compras, 'Todos los productos', `Compras ${money(model.totalCompras)} · Donado ${money(model.totalDonaciones)}`)}</section>
        </div>
      </div>
    </div>`;
  }
  function rowTicket(row){ return norm(row.ticket || row.ticketDonacion || 'Pte.Compra'); }
  function productLineClass(row){ if(row.kind === 'donacion') return 'donacion'; return row.statusClass === 'pending' ? 'pending' : 'ok'; }
  function rowSituacion(row){
    if(row.kind === 'donacion') return rowTicket(row) || 'DONACIÓN';
    if(isCurrentExpense(rowTicket(row))) return 'GASTOS CORRIENTES';
    if(isPendingTicket(rowTicket(row))) return 'Pte.Compra';
    return rowTicket(row) || row.subtype || 'Compra';
  }
  function productTextColor(row){
    if(row.kind === 'donacion'){
      const c = row.color || COLORS.donSocio;
      return c === COLORS.donTienda ? COLORS.donOtros : c;
    }
    return productLineClass(row) === 'pending' ? COLORS.pendiente : COLORS.compraOk;
  }
  function incomeTextColor(row){
    return incomePayment(row) === 'Pendiente' ? COLORS.pendiente : COLORS.compraOk;
  }

  function productSortValue(row, field){
    switch(field){
      case 'producto': return row.productoNombre;
      case 'segmento': return row.segmento;
      case 'destino': return row.destino;
      case 'compras': return row.kind === 'compra' ? Number(row.value || 0) : 0;
      case 'tienda': return row.kind === 'donacion' ? '' : row.tiendaNombre;
      case 'donado': return row.kind === 'donacion' ? Number(row.value || 0) : 0;
      case 'donante': return row.kind === 'donacion' ? row.donanteNombre : '';
      case 'importe': return Number(row.value || 0);
      case 'situacion': return rowSituacion(row);
      case 'responsable': return row.responsableNombre;
      default: return row.productoNombre;
    }
  }
  function sortProductRows(rows){
    const st = sortState.products || {field:'producto', dir:'asc'};
    const dir = st.dir === 'desc' ? -1 : 1;
    const numeric = NUMERIC_SORTS.has(st.field);
    return (rows || []).slice().sort((a,b) => {
      const primary = cmpValues(productSortValue(a, st.field), productSortValue(b, st.field), numeric) * dir;
      if(primary) return primary;
      return cmpValues(a.productoNombre,b.productoNombre,false) || cmpValues(a.segmento,b.segmento,false) || cmpValues(a.destino,b.destino,false) || cmpValues(rowSituacion(a),rowSituacion(b),false);
    });
  }
  function incomeSortValue(row, field){
    const name = norm(row.persona?.nombre || persona(row.personaId).nombre || 'Sin nombre');
    switch(field){
      case 'just': return receiptSrc(row.id) ? 1 : 0;
      case 'nombre': return name;
      case 'rango': return row.rango || '';
      case 'obligatorio': return Number(row.obligatorio || 0);
      case 'voluntario': return Number(row.voluntario || 0);
      case 'total': return Number(row.total || 0);
      case 'estado': return incomePayment(row);
      default: return name;
    }
  }
  function sortIncomeRows(rows){
    const st = sortState.income || {field:'nombre', dir:'asc'};
    const dir = st.dir === 'desc' ? -1 : 1;
    const numeric = NUMERIC_SORTS.has(st.field);
    return (rows || []).slice().sort((a,b) => {
      const primary = cmpValues(incomeSortValue(a, st.field), incomeSortValue(b, st.field), numeric) * dir;
      if(primary) return primary;
      return cmpValues(incomeSortValue(a,'nombre'), incomeSortValue(b,'nombre'), false);
    });
  }
  function toggleSort(mode, field){
    if(!sortState[mode]) sortState[mode] = {field, dir:'asc'};
    else if(sortState[mode].field === field) sortState[mode].dir = sortState[mode].dir === 'asc' ? 'desc' : 'asc';
    else sortState[mode] = {field, dir:'asc'};
  }
  function rerenderCurrentDetail(){
    if(currentView.type === 'income' && currentView.key) renderIncomeDetail(currentView.key, false);
    else if(currentView.type === 'incomeAll') renderAllIncomeDetail(false);
    else renderFilteredProducts(currentView.kind || '', currentView.key || '', false);
  }
  function markSelectedBar(kind, key){
    const root = $(OVERLAY_ID);
    if(!root) return;
    root.querySelectorAll('.ce-v19-resource-bar.is-selected').forEach(btn => btn.classList.remove('is-selected'));
    if(kind && key){
      const btn = Array.from(root.querySelectorAll('.ce-v19-resource-bar[data-v19-filter-kind]')).find(item => item.getAttribute('data-v19-filter-kind') === kind && item.getAttribute('data-v19-filter-key') === key);
      if(btn) btn.classList.add('is-selected');
    }
  }
  function clearResourceSelection(){ const root = $(OVERLAY_ID); if(root) root.querySelectorAll('.ce-v19-resource-bar.is-selected').forEach(btn => btn.classList.remove('is-selected')); }
  function scrollDetailIntoView(force){
    const detail = $(DETAIL_ID);
    if(!detail) return;
    const mobileLike = force || (window.matchMedia && window.matchMedia('(max-width:1120px)').matches);
    if(!mobileLike) return;
    setTimeout(() => { try{ detail.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){ detail.scrollIntoView(true); } }, 60);
  }
  function renderProductRowsContent(rows, title, subtitle){
    const sorted = sortProductRows(rows || []);
    return `<div class="ce-v19-detail-head"><div><h3>${esc(title)}</h3><p>${esc(subtitle || '')} · ${sorted.length} registro(s)</p></div><button type="button" class="ce-v19-detail-clear" data-v19-clear-detail="1">Limpiar</button></div>
      <div class="ce-v19-products-table compact">
        <div class="ce-v19-products-head compact">${sortButton('products','producto','Producto')}${sortButton('products','segmento','Segmento')}${sortButton('products','destino','Destino')}${sortButton('products','compras','Compras')}${sortButton('products','tienda','Tienda')}${sortButton('products','donado','Donado')}${sortButton('products','donante','Donante')}${sortButton('products','importe','Importe')}${sortButton('products','situacion','Situación')}${sortButton('products','responsable','Resp')}</div>
        ${sorted.map(row => {
          const rowColor = productTextColor(row);
          const tiendaTexto = row.kind === 'donacion' ? '—' : (row.tiendaNombre || 'Sin tienda');
          const donanteTexto = row.kind === 'donacion' ? (row.donanteNombre || 'Sin donante') : '—';
          const compraTexto = row.kind === 'compra' ? `${esc(qty(row.unidades))} uds · ${esc(money(row.value))}` : '—';
          const donadoTexto = row.kind === 'donacion' ? `${esc(qty(row.unidades))} uds · ${esc(money(row.value))}` : '—';
          const cellStyle = `color:${esc(rowColor)}!important`;
          return `<article class="ce-v19-product-line compact ${productLineClass(row)}" style="--line-color:${esc(row.color || rowColor)};--row-text-color:${esc(rowColor)};color:${esc(rowColor)}!important">
          <span class="product" style="${cellStyle}" title="${esc(row.productoNombre)}">${esc(row.productoNombre)}</span>
          <span style="${cellStyle}" title="${esc(row.segmento)}">${esc(row.segmento)}</span>
          <span style="${cellStyle}" title="${esc(row.destino)}">${esc(row.destino)}</span>
          <span style="${cellStyle}">${compraTexto}</span>
          <span style="${cellStyle}" title="${esc(tiendaTexto)}">${esc(tiendaTexto)}</span>
          <span style="${cellStyle}">${donadoTexto}</span>
          <span style="${cellStyle}" title="${esc(donanteTexto)}">${esc(donanteTexto)}</span>
          <strong style="${cellStyle}">${esc(money(row.value))}</strong>
          <span style="${cellStyle}" title="${esc(rowSituacion(row))}">${esc(rowSituacion(row))}</span>
          <span style="${cellStyle}" title="${esc(row.responsableNombre)}">${esc(row.responsableNombre || '—')}</span>
        </article>`;
        }).join('') || '<div class="ce-v19-empty-small">Sin productos.</div>'}
      </div>`;
  }
  function renderIncomeDetail(key, doScroll){
    const model = buildModel();
    const item = model.incomeItems.find(x => x.key === key);
    const detail = $(DETAIL_ID); if(!detail || !item) return;
    currentView = {type:'income', kind:'income', key};
    clearResourceSelection();
    const rows = sortIncomeRows(item.rows || []);
    detail.innerHTML = `<div class="ce-v19-detail-head"><div><h3>Ingresos · ${esc(item.label)}</h3><p>${rows.length} persona(s) · ${esc(money(item.value))}</p></div><button type="button" class="ce-v19-detail-clear" data-v19-clear-detail="1">Limpiar</button></div>
      <div class="ce-v19-income-list compact">
        <div class="ce-v19-income-head">${sortButton('income','just','Just.')}${sortButton('income','nombre','Nombre')}${sortButton('income','rango','Rango')}${sortButton('income','obligatorio','Imp. obligado')}${sortButton('income','voluntario','Imp. voluntario')}${sortButton('income','total','Total')}</div>
        ${rows.map(row => {
          const name = norm(row.persona?.nombre || persona(row.personaId).nombre || 'Sin nombre');
          const src = receiptSrc(row.id);
          const thumb = src ? `<button type="button" class="ce-v19-receipt-thumb small" data-v19-receipt-id="${esc(row.id)}" data-v19-receipt-src="${esc(src)}" aria-label="Ver justificante de ${esc(name)}"><img src="${esc(src)}" alt="Justificante"></button>` : '<span class="ce-v19-no-receipt small">📷</span>';
          const paid = incomePayment(row) === 'Pendiente' ? 'pending' : 'paid';
          const rowColor = item.color || incomeColor(incomeKey(row), row) || incomeTextColor(row);
          const cellStyle = `color:${esc(rowColor)}!important`;
          return `<article class="ce-v19-income-row compact ${paid}" style="--income-row-color:${esc(rowColor)};color:${esc(rowColor)}!important">${thumb}<span style="${cellStyle}" title="${esc(name)}">${esc(name)}</span><span style="${cellStyle}">${esc(row.rango || '—')}</span><span style="${cellStyle}">${esc(money(row.obligatorio))}</span><span style="${cellStyle}">${esc(money(row.voluntario))}</span><strong style="${cellStyle}">${esc(money(row.total))}</strong></article>`;
        }).join('') || '<div class="ce-v19-empty-small">Sin registros.</div>'}
      </div>`;
    scrollDetailIntoView(doScroll !== false);
  }

  function renderAllIncomeDetail(doScroll){
    const model = buildModel();
    const detail = $(DETAIL_ID); if(!detail) return;
    currentView = {type:'incomeAll', kind:'incomeAll', key:''};
    clearResourceSelection();
    const rows = sortIncomeRows(model.ingresos || []);
    detail.innerHTML = `<div class="ce-v19-detail-head"><div><h3>Ingresos · Ver todo</h3><p>${rows.length} persona(s) · ${esc(money(model.totalIncome))}</p></div><button type="button" class="ce-v19-detail-clear" data-v19-clear-detail="1">Limpiar</button></div>
      <div class="ce-v19-income-list compact">
        <div class="ce-v19-income-head">${sortButton('income','just','Just.')}${sortButton('income','nombre','Nombre')}${sortButton('income','rango','Rango')}${sortButton('income','obligatorio','Imp. obligado')}${sortButton('income','voluntario','Imp. voluntario')}${sortButton('income','total','Total')}</div>
        ${rows.map(row => {
          const name = norm(row.persona?.nombre || persona(row.personaId).nombre || 'Sin nombre');
          const src = receiptSrc(row.id);
          const thumb = src ? `<button type="button" class="ce-v19-receipt-thumb small" data-v19-receipt-id="${esc(row.id)}" data-v19-receipt-src="${esc(src)}" aria-label="Ver justificante de ${esc(name)}"><img src="${esc(src)}" alt="Justificante"></button>` : '<span class="ce-v19-no-receipt small">📷</span>';
          const paid = incomePayment(row) === 'Pendiente' ? 'pending' : 'paid';
          const rowColor = incomeColor(incomeKey(row), row) || incomeTextColor(row);
          const cellStyle = `color:${esc(rowColor)}!important`;
          return `<article class="ce-v19-income-row compact ${paid}" style="--income-row-color:${esc(rowColor)};color:${esc(rowColor)}!important">${thumb}<span style="${cellStyle}" title="${esc(name)}">${esc(name)}</span><span style="${cellStyle}">${esc(row.rango || '—')}</span><span style="${cellStyle}">${esc(money(row.obligatorio))}</span><span style="${cellStyle}">${esc(money(row.voluntario))}</span><strong style="${cellStyle}">${esc(money(row.total))}</strong></article>`;
        }).join('') || '<div class="ce-v19-empty-small">Sin registros.</div>'}
      </div>`;
    scrollDetailIntoView(doScroll !== false);
  }
  function renderFilteredProducts(kind, key, doScroll){
    const model = buildModel();
    let rows = model.compras;
    let title = 'Todos los productos';
    let subtitle = `Compras ${money(model.totalCompras)} · Donado ${money(model.totalDonaciones)}`;
    if(kind && key){
      rows = model.compras.filter(row => norm(row[kind]) === norm(key));
      const compras = rows.filter(row => row.kind === 'compra').reduce((s,row)=>s+Number(row.value||0),0);
      const don = rows.filter(row => row.kind === 'donacion').reduce((s,row)=>s+Number(row.value||0),0);
      title = `${kind === 'segmento' ? 'Segmento' : 'Destino'} · ${key}`;
      subtitle = `Compras ${money(compras)} · Donado ${money(don)}`;
    }
    currentView = {type:'products', kind:kind || '', key:key || ''};
    markSelectedBar(kind || '', key || '');
    const detail = $(DETAIL_ID); if(detail) detail.innerHTML = renderProductRowsContent(rows, title, subtitle);
    scrollDetailIntoView(doScroll !== false && !!(kind || key));
  }
  function showImage(src, title){
    if(!src) return;
    const old = $('ceV19ImageViewer'); if(old) old.remove();
    const viewer = document.createElement('div'); viewer.id = 'ceV19ImageViewer'; viewer.className = 'ce-v19-image-viewer';
    viewer.innerHTML = `<div class="ce-v19-image-card"><div><strong>${esc(title || 'Justificante')}</strong><button type="button" data-v19-image-close="1">Cerrar</button></div><img src="${esc(src)}" alt="${esc(title || 'Justificante')}"></div>`;
    viewer.addEventListener('click', ev => { if(ev.target === viewer || ev.target.closest('[data-v19-image-close]')) viewer.remove(); });
    document.body.appendChild(viewer);
    markModalSafe(); unlockModalControls(viewer);
  }

  let __v19SafeUntil = 0;
  function modalRootFromTarget(target){
    try{ return target?.closest?.('#' + OVERLAY_ID + ',#ceV19ImageViewer'); }catch(_){ return null; }
  }
  function stopModalEvent(ev, prevent){
    try{ if(prevent) ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }catch(_){ }
    return false;
  }
  function markModalSafe(){ __v19SafeUntil = Date.now() + 2500; patchFinalizadoLocks(); }
  function isModalSafeElement(el){ try{ return !!(el && el.closest && el.closest('#' + OVERLAY_ID + ',#ceV19ImageViewer')); }catch(_){ return false; } }
  function patchFinalizadoLocks(){
    try{
      const old = (typeof window.isLocked === 'function') ? window.isLocked : (typeof isLocked === 'function' ? isLocked : null);
      if(old && !old.__ceV19MapaGlobalConsulta){
        const wrapped = function(){
          try{ if(Date.now() < __v19SafeUntil || isModalSafeElement(document.activeElement)) return false; }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__ceV19MapaGlobalConsulta = true; wrapped.__ceOriginal = old;
        window.isLocked = wrapped; try{ isLocked = wrapped; }catch(_){ }
      }
    }catch(_){ }
  }
  function unlockModalControls(root){
    try{
      const base = root || $(OVERLAY_ID) || $('ceV19ImageViewer');
      if(!base) return;
      [base, ...Array.from(base.querySelectorAll('button,input,select,textarea,[role="button"],[tabindex]'))].forEach(el => {
        try{ el.disabled = false; el.readOnly = false; el.inert = false; }catch(_){ }
        try{ el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.removeAttribute('aria-disabled'); el.removeAttribute('inert'); }catch(_){ }
        try{ el.classList.remove('locked','app-disabled','disabled','is-locked','readonly','read-only','ce-v225-ro-disabled'); }catch(_){ }
        try{ el.style.setProperty('pointer-events','auto','important'); el.style.setProperty('opacity','1','important'); el.style.setProperty('filter','none','important'); el.style.setProperty('visibility','visible','important'); }catch(_){ }
      });
    }catch(_){ }
  }

  function closestMatch(el, selector){
    try{
      let node = el;
      while(node && node !== document){
        try{ if(node.matches && node.matches(selector)) return node; }catch(_){ }
        node = node.parentElement || node.parentNode || (node.host || null);
      }
    }catch(_){ }
    return null;
  }
  function touchPoint(ev){
    const t = ev?.changedTouches?.[0] || ev?.touches?.[0] || ev;
    return {x:Number(t?.clientX || 0), y:Number(t?.clientY || 0)};
  }
  let __v19Touch = null;
  function handleModalAction(ev, hardStop){
    const target = ev && ev.target;
    const root = modalRootFromTarget(target);
    if(!root) return false;
    markModalSafe(); unlockModalControls(root);
    const type = ev.type;
    if(type === 'touchstart'){
      const pt = touchPoint(ev);
      __v19Touch = {x:pt.x,y:pt.y,moved:false,time:Date.now(),onFilter:!!closestMatch(target,'.ce-v19-resource-bar[data-v19-filter-kind]')};
      return stopModalEvent(ev, false);
    }
    if(type === 'touchmove'){
      if(__v19Touch){ const pt = touchPoint(ev); if(Math.abs(pt.x-__v19Touch.x)>10 || Math.abs(pt.y-__v19Touch.y)>10) __v19Touch.moved = true; }
      return false;
    }
    if(type === 'keydown'){
      if(ev.key === 'Escape'){
        if(root.id === 'ceV19ImageViewer') root.remove();
        else if(root.id === OVERLAY_ID && root.__ceV19Close) root.__ceV19Close();
        return stopModalEvent(ev, true);
      }
      if((ev.key === 'Enter' || ev.key === ' ') && target?.matches?.('[data-v19-income-key]')){
        renderIncomeDetail(target.getAttribute('data-v19-income-key'));
        return stopModalEvent(ev, true);
      }
      return hardStop ? stopModalEvent(ev, false) : false;
    }
    if(type === 'pointerdown' || type === 'mousedown' || type === 'touchstart') return stopModalEvent(ev, false);
    if(root.id === 'ceV19ImageViewer'){
      if(target === root || closestMatch(target,'[data-v19-image-close]')){ root.remove(); return stopModalEvent(ev, true); }
      return hardStop ? stopModalEvent(ev, false) : false;
    }
    if(target?.classList?.contains('ce-v19-global-backdrop') || closestMatch(target,'.ce-v19-close,[data-v19-close]')){
      if(root.__ceV19Close) root.__ceV19Close();
      return stopModalEvent(ev, true);
    }
    const sort = closestMatch(target,'[data-v19-sort-mode][data-v19-sort-field]');
    if(sort){ toggleSort(sort.getAttribute('data-v19-sort-mode'), sort.getAttribute('data-v19-sort-field')); rerenderCurrentDetail(); return stopModalEvent(ev, true); }
    const income = closestMatch(target,'[data-v19-income-key]');
    if(income){ clearResourceSelection(); renderIncomeDetail(income.getAttribute('data-v19-income-key')); return stopModalEvent(ev, true); }
    if(closestMatch(target,'[data-v19-income-all]')){ clearResourceSelection(); renderAllIncomeDetail(); return stopModalEvent(ev, true); }
    if(closestMatch(target,'[data-v19-clear-filter]') || closestMatch(target,'[data-v19-clear-detail]')){ clearResourceSelection(); renderFilteredProducts('', '', false); return stopModalEvent(ev, true); }
    const filterBar = closestMatch(target,'.ce-v19-resource-bar[data-v19-filter-kind]');
    if(filterBar && (type === 'click' || type === 'touchend' || type === 'pointerup')){
      if(__v19Touch?.onFilter && __v19Touch.moved && Date.now() - __v19Touch.time < 900){ __v19Touch = null; return stopModalEvent(ev, true); }
      renderFilteredProducts(filterBar.getAttribute('data-v19-filter-kind'), filterBar.getAttribute('data-v19-filter-key'));
      return stopModalEvent(ev, true);
    }
    const receipt = closestMatch(target,'[data-v19-receipt-id]');
    if(receipt){ showImage(receipt.getAttribute('data-v19-receipt-src'), 'Justificante'); return stopModalEvent(ev, true); }
    return hardStop ? stopModalEvent(ev, false) : false;
  }
  ['pointerdown','pointerup','mousedown','touchstart','touchmove','click','touchend','change','keydown'].forEach(evt => {
    try{ window.addEventListener(evt, function(ev){ handleModalAction(ev, true); }, {capture:true, passive:false}); }catch(_){ }
  });
  let __lastSafeOpenAt = 0;
  function safeOpen(ev){
    try{ if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); } }catch(_){ }
    const now = Date.now();
    if(now - __lastSafeOpenAt < 450) return false;
    __lastSafeOpenAt = now;
    try{ openModal(); }catch(err){
      try{ console.error('[ControlEvent v19_prod] Error abriendo vista aérea', err); }catch(_){ }
      try{ alert('No he podido abrir la vista aérea. Revisa la consola para ver el error.'); }catch(_){ }
    }
    return false;
  }
  function openModal(){
    if(!selectedId()){ alert('Selecciona un evento para ver la vista gráfica.'); return; }
    const old = $(OVERLAY_ID); if(old) old.remove();
    currentView = {type:'products', kind:'', key:''};
    const model = buildModel();
    const overlay = document.createElement('div'); overlay.id = OVERLAY_ID; overlay.innerHTML = renderModal(model);
    patchFinalizadoLocks(); markModalSafe();
    document.body.appendChild(overlay);
    try{ document.body.classList.add('ce-v19-modal-open','ce-v19-modal-safe-finalizado'); }catch(_){ }
    const unlockTimer = setInterval(() => unlockModalControls(overlay), 450);
    try{ new MutationObserver(() => unlockModalControls(overlay)).observe(overlay,{subtree:true,childList:true,attributes:true}); }catch(_){ }
    unlockModalControls(overlay);
    const close = () => { clearInterval(unlockTimer); overlay.remove(); document.body.classList.remove('ce-v19-modal-open','ce-v19-modal-safe-finalizado'); document.removeEventListener('keydown', escClose, true); };
    const escClose = ev => { if(ev.key === 'Escape') close(); };
    overlay.__ceV19Close = close;
    overlay.addEventListener('click', ev => {
      const target = ev.target;
      if(target?.classList?.contains('ce-v19-global-backdrop') || closestMatch(target,'.ce-v19-close,[data-v19-close]')){ ev.preventDefault(); close(); return; }
      const income = closestMatch(target,'[data-v19-income-key]');
      if(income){ ev.preventDefault(); clearResourceSelection(); renderIncomeDetail(income.getAttribute('data-v19-income-key')); return; }
      if(closestMatch(target,'[data-v19-income-all]')){ ev.preventDefault(); clearResourceSelection(); renderAllIncomeDetail(); return; }
      if(closestMatch(target,'[data-v19-clear-filter]')){ ev.preventDefault(); clearResourceSelection(); renderFilteredProducts('', '', false); return; }
      if(closestMatch(target,'[data-v19-clear-detail]')){ ev.preventDefault(); clearResourceSelection(); renderFilteredProducts('', '', false); return; }
      const bar = closestMatch(target,'.ce-v19-resource-bar[data-v19-filter-kind]');
      if(bar){ ev.preventDefault(); renderFilteredProducts(bar.getAttribute('data-v19-filter-kind'), bar.getAttribute('data-v19-filter-key')); return; }
      const receipt = closestMatch(target,'[data-v19-receipt-id]');
      if(receipt){
        ev.preventDefault();
        showImage(receipt.getAttribute('data-v19-receipt-src'), 'Justificante');
      }
    }, true);
    overlay.addEventListener('touchend', ev => {
      const bar = closestMatch(ev.target,'.ce-v19-resource-bar[data-v19-filter-kind]');
      if(bar){ ev.preventDefault(); renderFilteredProducts(bar.getAttribute('data-v19-filter-kind'), bar.getAttribute('data-v19-filter-key')); }
    }, {capture:true, passive:false});
    overlay.addEventListener('keydown', ev => {
      if((ev.key === 'Enter' || ev.key === ' ') && ev.target?.matches?.('[data-v19-income-key]')){ ev.preventDefault(); ev.target.click(); }
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
      #${OVERLAY_ID}{position:fixed;inset:0;z-index:1000003;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;pointer-events:auto!important;}
      #${OVERLAY_ID} *,#ceV19ImageViewer,#ceV19ImageViewer *{pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important;}
      body.ce-v19-modal-safe-finalizado #${OVERLAY_ID},body.ce-v19-modal-safe-finalizado #${OVERLAY_ID} *,body.ce-v120-finalizado-tools #${OVERLAY_ID},body.ce-v120-finalizado-tools #${OVERLAY_ID} *{pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important;}
      .ce-v19-global-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:12px;}
      .ce-v19-global-card{width:min(1580px,98vw);max-height:94vh;overflow:auto;background:#f8fafc;border:1px solid rgba(226,232,240,.95);border-radius:26px;box-shadow:0 32px 100px rgba(15,23,42,.42);padding:18px;color:#0f172a;}
      .ce-v19-global-head{position:sticky;top:0;z-index:2;margin:-18px -18px 14px;padding:16px 18px;background:rgba(248,250,252,.96);backdrop-filter:blur(8px);border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:12px;}
      .ce-v19-global-head h2{margin:0;font-size:22px;font-weight:950;letter-spacing:-.02em;}.ce-v19-global-head p{margin:4px 0 0;color:#64748b;font-size:13px;font-weight:800;}.ce-v19-event-state{font-weight:1000!important;}.ce-v19-event-state.curso{color:#16a34a!important;}.ce-v19-event-state.finalizado{color:#dc2626!important;}
      .ce-v19-close,.ce-v19-detail-clear,.ce-v19-clear-filter,.ce-v19-income-all{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:999px;padding:8px 13px;font-weight:950;cursor:pointer;}
      .ce-v19-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:12px;}.ce-v19-metric{border-radius:18px;background:#fff;border:1px solid #e2e8f0;padding:13px;box-shadow:0 8px 24px rgba(15,23,42,.06);}.ce-v19-metric span{display:block;font-size:11px;font-weight:950;color:#64748b;letter-spacing:.05em;}.ce-v19-metric strong{display:block;margin-top:5px;font-size:24px;font-weight:1000;}.ce-v19-metric.income strong{color:#0369a1!important}.ce-v19-metric.buy strong{color:#dc2626!important}.ce-v19-metric.don strong{color:#b45309!important}.ce-v19-metric.total strong{color:#0f766e!important}.ce-v19-metric.income{background:#eff6ff;border-color:#bfdbfe}.ce-v19-metric.buy{background:#fef2f2;border-color:#fecaca}.ce-v19-metric.don{background:#fff7ed;border-color:#fed7aa}.ce-v19-metric.total{background:#ecfdf5;border-color:#a7f3d0}.ce-v19-metric.saldo{background:#f0fdf4;border-color:#bbf7d0}.ce-v19-metric.operativo{background:#f0fdfa;border-color:#99f6e4}.ce-v19-metric.saldo-bad{background:#fef2f2!important;border-color:#fecaca!important}.ce-v19-metric.saldo-ok strong,.ce-v19-metric.operativo.saldo-ok strong{color:#15803d!important}.ce-v19-metric.saldo-bad strong,.ce-v19-metric.operativo.saldo-bad strong{color:#dc2626!important}
      .ce-v19-global-grid{display:grid;grid-template-columns:minmax(315px,385px) minmax(0,1fr);gap:10px;align-items:start;}.ce-v19-left-col{display:flex;flex-direction:column;gap:12px;min-width:0;}.ce-v19-panel,.ce-v19-detail{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:12px;box-shadow:0 8px 26px rgba(15,23,42,.06);min-width:0;}.ce-v19-panel-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;}.ce-v19-panel-title span{font-weight:1000;color:#0f172a;}.ce-v19-panel-title strong{font-size:18px;color:#0f766e;}
      .ce-v19-pie-wrap{display:grid;grid-template-columns:148px minmax(0,1fr);gap:10px;align-items:center;}.ce-v19-pie{width:148px;height:148px;filter:drop-shadow(0 14px 22px rgba(15,23,42,.12));}.ce-v19-pie,.ce-v19-pie *{outline:none!important;-webkit-tap-highlight-color:transparent!important;}.ce-v19-pie-slice{cursor:pointer;transition:filter .15s ease,transform .15s ease;transform-origin:50% 50%;}.ce-v19-pie g:hover .ce-v19-pie-slice{filter:brightness(1.06);transform:scale(1.018);}.ce-v19-legend{display:flex;flex-direction:column;gap:6px;min-width:0;}.ce-v19-legend-row{display:grid!important;grid-template-columns:14px minmax(0,1fr) auto;align-items:center;gap:8px;border:1px solid #dbe4f0!important;background:#fff!important;color:#0f172a!important;border-radius:12px;padding:7px 8px;text-align:left;cursor:pointer;min-width:0;box-shadow:0 3px 10px rgba(15,23,42,.04);}.ce-v19-legend-row span:nth-child(2){font-size:12px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:inherit!important;}.ce-v19-legend-row strong{font-size:12px;color:inherit!important;white-space:nowrap;}.ce-v19-dot,.ce-v19-resource-legend i{width:11px;height:11px;border-radius:999px;display:inline-block;}.ce-v19-hint{margin-top:10px;font-size:11px;color:#64748b;font-weight:800;line-height:1.25;}
      .ce-v19-resource-legend{display:flex;gap:12px;align-items:center;justify-content:flex-start;margin:-4px 0 10px;font-size:12px;font-weight:950;color:#475569;}.ce-v19-resource-legend span{display:inline-flex;align-items:center;gap:5px;}.ce-v19-resource-legend .buy{background:#dc2626}.ce-v19-resource-legend .don{background:#f59e0b}.ce-v19-resource-bars{display:flex;flex-direction:column;gap:6px;margin:0 0 8px;}.ce-v19-resource-bar{display:block;width:100%;border:1px solid #e2e8f0!important;background:#fff!important;border-radius:12px!important;padding:6px 7px!important;text-align:left!important;cursor:pointer!important;box-shadow:0 3px 10px rgba(15,23,42,.035)!important;-webkit-tap-highlight-color:transparent;touch-action:manipulation;color:#0f172a!important;}.ce-v19-resource-bar:hover,.ce-v19-resource-bar.is-selected{border-color:#60a5fa!important;background:#f8fbff!important;box-shadow:0 8px 18px rgba(37,99,235,.12)!important}.ce-v19-bar-top{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:6px;margin-bottom:4px;}.ce-v19-bar-top em{font-style:normal;font-size:9px;font-weight:1000;color:#64748b;}.ce-v19-bar-top strong{font-size:10.5px;font-weight:1000;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ce-v19-bar-top b{font-size:10px;font-weight:1000;color:#0f766e;white-space:nowrap;}.ce-v19-bar-track{display:block;height:11px;border-radius:999px;background:#e2e8f0;overflow:hidden;}.ce-v19-bar-fill{display:flex;height:100%;border-radius:999px;overflow:hidden;min-width:8px;}.ce-v19-bar-fill .buy{display:block;height:100%;background:#dc2626;}.ce-v19-bar-fill .don{display:block;height:100%;background:#f59e0b;}.ce-v19-bar-sub{display:block;margin-top:3px;font-size:8.8px;line-height:1.05;font-weight:900;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ce-v19-clear-filter,.ce-v19-income-all{width:100%;background:#f8fafc;font-size:11px;padding:6px 10px;margin:0 0 8px;}
      .ce-v19-right-detail{margin:0;min-height:560px;overflow:hidden;min-width:0;}.ce-v19-detail-empty,.ce-v19-empty-small{color:#64748b;font-weight:900;padding:12px;text-align:center;background:#f8fafc;border-radius:14px;}.ce-v19-empty-small.compact{font-size:11px;padding:8px;}.ce-v19-detail-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}.ce-v19-detail-head h3{margin:0;font-size:18px;font-weight:1000;}.ce-v19-detail-head p{margin:4px 0 0;color:#64748b;font-size:12px;font-weight:850;}
      .ce-v19-sort-head{border:0!important;background:transparent!important;color:#64748b!important;font:inherit!important;font-weight:1000!important;text-align:left!important;padding:0!important;margin:0!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;cursor:pointer!important;box-shadow:none!important;line-height:1.1!important;}.ce-v19-sort-head:hover,.ce-v19-sort-head.active{color:#0f172a!important;text-decoration:underline!important;}
      .ce-v19-income-list.compact{display:flex;flex-direction:column;gap:4px;}.ce-v19-income-head,.ce-v19-income-row.compact{display:grid;grid-template-columns:42px minmax(170px,1.5fr) minmax(70px,.6fr) minmax(90px,.7fr) minmax(90px,.7fr) minmax(80px,.6fr);gap:5px;align-items:center;}.ce-v19-income-head{font-size:12.2px;font-weight:1000;color:#334155;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:5px 6px;}.ce-v19-income-row.compact{border:1px solid #e2e8f0;border-radius:11px;padding:5px 6px;background:#fff;font-size:11px;font-weight:900;line-height:1.05;}.ce-v19-income-row.compact{color:var(--income-row-color,#0f172a)!important;}.ce-v19-income-row.compact span,.ce-v19-income-row.compact strong{color:var(--income-row-color,#0f172a)!important;}.ce-v19-income-row.compact span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.ce-v19-receipt-thumb.small,.ce-v19-no-receipt.small{width:34px;height:30px;border-radius:9px;}.ce-v19-receipt-thumb{border:1px solid #cbd5e1;padding:0;overflow:hidden;background:#f8fafc;cursor:pointer;}.ce-v19-receipt-thumb img{width:100%;height:100%;object-fit:cover;display:block;}.ce-v19-no-receipt{display:flex!important;align-items:center;justify-content:center;background:#f1f5f9;border:1px solid #e2e8f0;color:#64748b;}
      .ce-v19-products-table.compact{display:flex;flex-direction:column;gap:2px;overflow:auto;padding-bottom:4px;}.ce-v19-products-head.compact,.ce-v19-product-line.compact{display:grid;grid-template-columns:minmax(190px,1.55fr) minmax(72px,.52fr) minmax(72px,.52fr) minmax(94px,.68fr) minmax(100px,.72fr) minmax(94px,.68fr) minmax(112px,.78fr) minmax(72px,.52fr) minmax(94px,.66fr) minmax(68px,.48fr);gap:3px;align-items:center;min-width:1070px;}.ce-v19-products-head.compact{font-size:11px;font-weight:1000;color:#334155;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:5px;text-transform:uppercase;letter-spacing:.01em;}.ce-v19-product-line.compact{border:1px solid #e2e8f0;border-left:4px solid var(--line-color,#64748b);border-radius:8px;padding:3px 4px;background:#fff;font-size:9.4px;font-weight:950;line-height:1.03;color:var(--row-text-color,var(--line-color,#0f172a))!important;}.ce-v19-product-line.compact.ok{color:#15803d!important;--row-text-color:#15803d;}.ce-v19-product-line.compact.pending{color:#dc2626!important;--row-text-color:#dc2626;}.ce-v19-product-line.compact.donacion{color:var(--line-color,#b45309)!important;--row-text-color:var(--line-color,#b45309);}.ce-v19-product-line.compact.ok span,.ce-v19-product-line.compact.ok strong{color:#15803d!important;}.ce-v19-product-line.compact.pending span,.ce-v19-product-line.compact.pending strong{color:#dc2626!important;}.ce-v19-product-line.compact.donacion span,.ce-v19-product-line.compact.donacion strong{color:var(--line-color,#b45309)!important;}.ce-v19-product-line.compact span,.ce-v19-product-line.compact strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;color:inherit!important;}.ce-v19-product-line.compact .product{font-weight:1000;}
      #${OVERLAY_ID} .ce-v19-product-line.compact span,#${OVERLAY_ID} .ce-v19-product-line.compact strong,#${OVERLAY_ID} .ce-v19-income-row.compact span,#${OVERLAY_ID} .ce-v19-income-row.compact strong{color:inherit!important;}
      .ce-v19-image-viewer{position:fixed;inset:0;z-index:1000005;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;padding:18px;}.ce-v19-image-card{background:#fff;border-radius:18px;padding:12px;max-width:min(980px,96vw);max-height:94vh;display:flex;flex-direction:column;gap:10px;box-shadow:0 26px 86px rgba(0,0,0,.42);}.ce-v19-image-card>div{display:flex;align-items:center;justify-content:space-between;gap:10px;}.ce-v19-image-card button{border:1px solid #cbd5e1;border-radius:999px;background:#fff;padding:7px 12px;font-weight:950;}.ce-v19-image-card img{max-width:100%;max-height:80vh;object-fit:contain;border-radius:12px;background:#f8fafc;}
      @media(max-width:1120px){.ce-v19-metrics{grid-template-columns:repeat(3,minmax(0,1fr));}.ce-v19-global-grid{grid-template-columns:1fr}.ce-v19-right-detail{min-height:360px}.ce-v19-pie-wrap{grid-template-columns:150px 1fr}.ce-v19-pie{width:150px;height:150px;}}
      @media(max-width:720px){.ce-v19-global-backdrop{padding:8px;align-items:flex-start}.ce-v19-global-card{width:100vw;max-height:96vh;border-radius:18px;padding:12px}.ce-v19-global-head{margin:-12px -12px 10px;padding:12px}.ce-v19-global-head h2{font-size:18px}.ce-v19-metrics{grid-template-columns:1fr 1fr}.ce-v19-metric{padding:10px}.ce-v19-metric strong{font-size:18px}.ce-v19-pie-wrap{grid-template-columns:1fr}.ce-v19-pie{margin:auto}.ce-v19-income-head{display:none}.ce-v19-income-row.compact{grid-template-columns:38px 1fr 1fr}.ce-v19-income-row.compact span:nth-child(n+5),.ce-v19-income-row.compact strong{grid-column:auto}.ce-v19-products-head.compact{display:none}.ce-v19-product-line.compact{grid-template-columns:1fr;min-width:0;font-size:11px;}.ce-v19-resource-legend{justify-content:flex-start;}}
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
      btn.setAttribute('aria-label','Vista aérea de ingresos, compras y donaciones');
      btn.title = 'Vista aérea';
      section.appendChild(btn);
    }
    if(!btn.__ceV19Bound){
      btn.__ceV19Bound = true;
      btn.onclick = safeOpen;
      ['pointerdown','mousedown','click','touchend'].forEach(evt => {
        btn.addEventListener(evt, safeOpen, {capture:true, passive:false});
      });
    }
    return true;
  }

  function delegatedOpen(ev){
    try{
      const target = ev.target && ev.target.closest ? ev.target.closest('#' + BUTTON_ID) : null;
      if(target) safeOpen(ev);
    }catch(_){ }
  }
  ['pointerdown','mousedown','click','touchend'].forEach(evt => {
    window.addEventListener(evt, delegatedOpen, {capture:true, passive:false});
  });

  function scheduleEnsure(){ [0,80,260,800,1600].forEach(ms => setTimeout(ensureButton, ms)); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnsure, {once:true}); else scheduleEnsure();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:event-loaded','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, scheduleEnsure));
  window.ControlEventMapaGlobalV19 = {version:VERSION, ensureButton, open:safeOpen, openRaw:openModal, build:buildModel};
})();
