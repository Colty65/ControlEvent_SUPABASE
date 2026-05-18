/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #17. */
/* ==== V16.4 FIXES: EXCEL, GRAFICAS, COMPRAS, AGRUPACION, TICKETS ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const $v164 = id => document.getElementById(id);
  const escV164 = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const fmtMoneyV164 = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const normV164 = v => String(v ?? '').trim();
  const isDonV164 = v => (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(normV164(v));
  const isCurrentV164 = v => (typeof isCurrentExpenseTicket === 'function') ? isCurrentExpenseTicket(v) : normV164(v) === 'GASTOS CORRIENTES';
  const getEventV164 = () => (typeof selectedEvent === 'function' ? selectedEvent() : (state.eventos || []).find(e => e.id === state.selectedEventId));
  const collabsV164 = () => (typeof collabsForEvent === 'function' ? collabsForEvent() : []);
  const comprasV164 = () => (typeof comprasForEvent === 'function' ? comprasForEvent() : []);

  function byIdV164(list, id){ return (list || []).find(x => String(x.id) === String(id)); }
  function productByIdV164(id){ return (typeof productoById === 'function' ? productoById(id) : null) || byIdV164(state.productos || [], id) || {}; }
  function personByIdV164(id){ return (typeof personaById === 'function' ? personaById(id) : null) || byIdV164(state.personas || [], id) || {}; }
  function storeByIdV164(id){ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byIdV164(state.tiendas || [], id) || {}; }
  function valueCompraV164(c){
    const p = productByIdV164(c.productoId);
    const precio = Number(c.precio != null ? c.precio : (c.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
    return Number(c.valor != null ? c.valor : precio * Number(c.unidades || 0));
  }
  function productNameV164(c){ return c?.producto?.nombre || productByIdV164(c?.productoId).nombre || 'Producto'; }
  function storeNameV164(c){ return c?.tienda?.nombre || storeByIdV164(c?.tiendaId).nombre || ''; }
  function personNameV164(c){ return c?.persona?.nombre || personByIdV164(c?.personaId).nombre || 'Sin nombre'; }

  function resolveDonorNameV164(c){
    try{
      if(c?.donorLabel && normV164(c.donorLabel)) return normV164(c.donorLabel);
      if(c?.donorRef && normV164(c.donorRef)){
        const raw = normV164(c.donorRef);
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(d && normV164(d)) return normV164(d);
        }
        if(raw.startsWith('P:')){
          const name = personByIdV164(raw.slice(2)).nombre;
          if(name) return name;
        }
        if(raw.startsWith('T:')){
          const name = storeByIdV164(raw.slice(2)).nombre;
          if(name) return name;
        }
        return raw;
      }
      if(c?.donante && normV164(c.donante)) return normV164(c.donante);
      const tienda = storeNameV164(c);
      if(tienda) return tienda;
    }catch(_){ }
    return '';
  }
  window.resolveDonorNameV164 = resolveDonorNameV164;

  function ticketKeyV164(key, eventId){
    const evId = eventId || state.selectedEventId || (getEventV164()?.id || '');
    return (typeof ticketImageStateKey === 'function') ? ticketImageStateKey(key, evId) : `${evId}|${key}`;
  }
  function getTicketImageV164(key){ return (state.ticketImages || {})[ticketKeyV164(key)] || ''; }

  function setFoundV164(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target'), 3000);
  }

  function annotateCompraRowsV164(){
    document.querySelectorAll('#comprasList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-compra-producto"]');
      if(sel){ card.id = 'compraRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
  }
  const _renderComprasV164 = typeof renderCompras === 'function' ? renderCompras : null;
  renderCompras = function(){ if(_renderComprasV164) _renderComprasV164(); annotateCompraRowsV164(); };

  function jumpToCompraProductV164(productId){
    if(!productId) return false;
    const found = comprasV164().find(r => !isDonV164(r.ticketDonacion) && String(r.productoId) === String(productId));
    if(!found) return false;
    try{ currentMainTab = 'compras'; showComprasEvent = true; }catch(_){ }
    if(typeof render === 'function') render();
    setTimeout(() => setFoundV164($v164('compraRow_' + found.id)), 90);
    return true;
  }

  // Compra: al elegir producto del desplegable, saltar al registro existente sin pulsar Añadir.
  document.addEventListener('change', function(e){
    const t = e.target;
    if(!t || t.id !== 'buyProducto' || (typeof isLocked === 'function' && isLocked())) return;
    if(false && jumpToCompraProductV164(t.value)){
      t.value = '';
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  const _addCompraV164 = typeof addCompra === 'function' ? addCompra : null;
  addCompra = function(){
    const productId = $v164('buyProducto')?.value || '';
    if(false && productId && jumpToCompraProductV164(productId)) return;
    if(_addCompraV164) return _addCompraV164.apply(this, arguments);
  };

  function groupingRowsV164(kind){
    const compras = comprasV164();
    const keys = kind === 'segmento'
      ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS : Array.from(new Set(compras.map(c => productByIdV164(c.productoId).segmento || c.producto?.segmento || '').filter(Boolean))))
      : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS : Array.from(new Set(compras.map(c => productByIdV164(c.productoId).destino || c.producto?.destino || '').filter(Boolean))));
    return keys.map(k => {
      const match = c => String(kind === 'segmento' ? (c.producto?.segmento || productByIdV164(c.productoId).segmento || '') : (c.producto?.destino || productByIdV164(c.productoId).destino || '')) === String(k);
      const comprados = compras.filter(c => match(c) && !isDonV164(c.ticketDonacion) && !isCurrentV164(c.ticketDonacion) && normV164(c.ticketDonacion) !== '');
      const donados = compras.filter(c => match(c) && isDonV164(c.ticketDonacion));
      const pendientes = compras.filter(c => match(c) && !isDonV164(c.ticketDonacion) && normV164(c.ticketDonacion) === '');
      const comprado = comprados.reduce((a,b)=>a+valueCompraV164(b),0);
      const donado = donados.reduce((a,b)=>a+valueCompraV164(b),0);
      const pendiente = pendientes.reduce((a,b)=>a+valueCompraV164(b),0);
      return {
        label:k,
        comprado, donado, pendiente,
        total: comprado + donado + pendiente,
        listComprado: comprados.map(c => `${productNameV164(c)} — ${storeNameV164(c) || 'Sin tienda'} — ${normV164(c.ticketDonacion)} — ${fmtMoneyV164(valueCompraV164(c))}`),
        listDonado: donados.map(c => `${resolveDonorNameV164(c) || 'Sin donante'} — ${productNameV164(c)} — ${fmtMoneyV164(valueCompraV164(c))}`),
        listPendiente: pendientes.map(c => `${productNameV164(c)} — ${fmtMoneyV164(valueCompraV164(c))}`)
      };
    });
  }
  summaryBySegmento = function(){ return groupingRowsV164('segmento'); };
  summaryByDestino = function(){ return groupingRowsV164('destino'); };

  function renderGroupingBarsV164(targetId, rows){
    const wrap = $v164(targetId);
    if(!wrap) return;
    const card = wrap.closest('.summary-card');
    if(card) card.style.display = '';
    wrap.innerHTML = '';
    const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
    const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
    const title = targetId === 'summarySegmento' ? 'Por segmento' : 'Por destino';
    const head = document.createElement('div');
    head.className = 'vbars-wrap';
    head.innerHTML = `<div class="vbars-total">${title} – TOTAL GENERAL: ${escV164(fmtMoneyV164(totalGeneral))}</div><div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte. Compra u otros gastos</span></div>`;
    wrap.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'vbars-grid';
    rows.forEach(r => {
      const h1 = Math.max(8, (Number(r.comprado||0) / maxVal) * 170);
      const h2 = Math.max(8, (Number(r.donado||0) / maxVal) * 170);
      const h3 = Math.max(8, (Number(r.pendiente||0) / maxVal) * 170);
      const cardDiv = document.createElement('div');
      cardDiv.className = 'vbars-card';
      cardDiv.innerHTML = `<div class="vbars-title">${escV164(r.label)} · ${escV164(fmtMoneyV164(r.total))}</div><div class="vbars-chart"><div class="vbar-col" title="${escV164((r.listComprado?.length ? r.listComprado.join('\n') : 'Sin productos'))}"><div class="vbar-value">${escV164(fmtMoneyV164(r.comprado))}</div><div class="vbar-stick" style="height:${h1}px;background:#dc2626"></div><div class="vbar-label">Comprado</div></div><div class="vbar-col" title="${escV164((r.listDonado?.length ? r.listDonado.join('\n') : 'Sin productos'))}"><div class="vbar-value">${escV164(fmtMoneyV164(r.donado))}</div><div class="vbar-stick" style="height:${h2}px;background:#f59e0b"></div><div class="vbar-label">Donado</div></div><div class="vbar-col" title="${escV164((r.listPendiente?.length ? r.listPendiente.join('\n') : 'Sin productos'))}"><div class="vbar-value">${escV164(fmtMoneyV164(r.pendiente))}</div><div class="vbar-stick" style="height:${h3}px;background:#fb7185"></div><div class="vbar-label">Pte. Compra u otros gastos</div></div></div>`;
      grid.appendChild(cardDiv);
    });
    wrap.appendChild(grid);
  }
  const _renderSummaryListV164 = typeof renderSummaryList === 'function' ? renderSummaryList : null;
  renderSummaryList = function(targetId, rows){
    if(targetId === 'summarySegmento' || targetId === 'summaryDestino') return renderGroupingBarsV164(targetId, rows || []);
    if(targetId === 'summaryTiendaTicket') return renderTiendaTicketV164(targetId, rows || []);
    if(_renderSummaryListV164) return _renderSummaryListV164(targetId, rows);
  };

  function summaryByTiendaTicketV164(){
    const filled = {};
    const pending = {};
    comprasV164().forEach(c => {
      const rawTicket = normV164(c.ticketDonacion);
      const val = valueCompraV164(c);
      const donated = isDonV164(rawTicket);
      const baseName = donated ? (resolveDonorNameV164(c) || 'Sin donante') : (storeNameV164(c) || 'Sin tienda');
      if(rawTicket === ''){
        const key = `${baseName} | Pte.Compra u otros gastos`;
        pending[key] = (pending[key] || 0) + val;
        return;
      }
      const key = `${baseName} | ${rawTicket}`;
      if(!filled[key]) filled[key] = {k:key, v:0, rawTicket, donated, products:[], attachable: !donated};
      filled[key].v += val;
      filled[key].donated = filled[key].donated || donated;
      filled[key].attachable = filled[key].attachable && !donated;
      const pn = productNameV164(c);
      if(pn && !filled[key].products.includes(pn)) filled[key].products.push(pn);
    });
    const rows = Object.values(filled).map(obj => {
      const label = obj.donated && obj.products.length ? `${obj.k} · ${obj.products.join(' · ')}` : obj.k;
      return {...obj, label, pending:false, image:getTicketImageV164(obj.k)};
    }).concat(Object.entries(pending).map(([k,v]) => ({k, label:k, v, rawTicket:'', pending:true, donated:false, attachable:false, image:''})));
    const sortMode = state.summaryTiendaSort || 'tienda';
    rows.sort((a,b)=>{
      const [ta='',tka=''] = String(a.k||'').split(' | ');
      const [tb='',tkb=''] = String(b.k||'').split(' | ');
      if(sortMode === 'ticket'){
        const s = tka.localeCompare(tkb,'es');
        return s || ta.localeCompare(tb,'es');
      }
      const s = ta.localeCompare(tb,'es');
      return s || tka.localeCompare(tkb,'es');
    });
    return rows;
  }
  summaryByTiendaTicket = summaryByTiendaTicketV164;

  function uploadTicketImageV164(encodedKey){
    const key = decodeURIComponent(encodedKey);
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = ev => {
      const file = ev.target.files && ev.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = loadEvent => {
        const img = new Image();
        img.onload = function(){
          const maxW = 900, maxH = 900;
          let w = img.width, h = img.height;
          const ratio = Math.min(maxW / w, maxH / h, 1);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img,0,0,w,h);
          if(!state.ticketImages) state.ticketImages = {};
          state.ticketImages[ticketKeyV164(key)] = canvas.toDataURL('image/jpeg', 0.84);
          if(typeof render === 'function') render();
        };
        img.src = loadEvent.target.result;
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  }
  function removeTicketImageV164(encodedKey){
    const key = decodeURIComponent(encodedKey);
    if(state.ticketImages) delete state.ticketImages[ticketKeyV164(key)];
    if(typeof render === 'function') render();
  }
  window.uploadTicketImageV164 = uploadTicketImageV164;
  window.removeTicketImageV164 = removeTicketImageV164;

  function renderTiendaTicketV164(targetId, rows){
    const wrap = $v164(targetId);
    if(!wrap) return;
    wrap.innerHTML = '';
    const tools = document.createElement('div');
    tools.className = 'hint';
    tools.innerHTML = 'Ordenar por: <a href="#" onclick="state.summaryTiendaSort=\'tienda\'; renderBudget(); return false;">Tienda</a> · <a href="#" onclick="state.summaryTiendaSort=\'ticket\'; renderBudget(); return false;">Ticket/Donación/Otros Gastos</a>';
    wrap.appendChild(tools);
    if(!rows.length){
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = 'Sin datos.';
      wrap.appendChild(empty);
      return;
    }
    let total = 0;
    rows.forEach((r, idx) => {
      total += Number(r.v || 0);
      const div = document.createElement('div');
      div.className = 'summary-item';
      if(r.pending) div.classList.add('red-row');
      const amountHtml = `<span class="pill"${r.pending ? ' style="background:#fef2f2;color:#b91c1c"' : (r.donated ? ' style="text-decoration:line-through"' : '')}>${escV164(fmtMoneyV164(r.v))}</span>`;
      const encoded = encodeURIComponent(r.k || '');
      let actions = '';
      if(r.attachable && !r.pending){
        const preview = r.image ? `<img class="ticket-thumb" src="${r.image}" alt="ticket" />` : '<span class="hint">Sin imagen</span>';
        const del = r.image ? `<button type="button" class="outline small" title="Eliminar foto" onclick="removeTicketImageV164('${encoded}')">🗑️</button>` : '';
        actions = `<span class="ticket-actions"><button type="button" class="outline small" title="Insertar foto" onclick="uploadTicketImageV164('${encoded}')">📎</button>${preview}${del}</span>`;
      }
      div.innerHTML = `<span>${escV164(r.label || r.k)}</span><span style="display:flex;align-items:center;gap:8px;justify-content:flex-end;">${amountHtml}${actions}</span>`;
      wrap.appendChild(div);
    });
    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-item';
    totalDiv.style.fontWeight = '800';
    totalDiv.innerHTML = `<span>TOTAL</span><span class="pill">${escV164(fmtMoneyV164(total))}</span>`;
    wrap.appendChild(totalDiv);
  }

  function graphPartsV164(){
    const rows = collabsV164();
    const compras = comprasV164();
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const incomeLine = fn => rows.filter(fn).map(r => `${personNameV164(r)} — ${fmtMoneyV164(Number(r.total || (Number(r.numero||1) * Number(r.importe||0))))}`);
    const donationLine = ticket => compras.filter(r => normV164(r.ticketDonacion) === ticket).map(r => `${resolveDonorNameV164(r) || 'Sin donante'} — ${productNameV164(r)} — ${fmtMoneyV164(valueCompraV164(r))}`);
    const expenseLine = fn => compras.filter(fn).map(r => `${storeNameV164(r) || 'Sin tienda'} — ${normV164(r.ticketDonacion) || 'Pte.Compra u otros gastos'} — ${productNameV164(r)} — ${fmtMoneyV164(valueCompraV164(r))}`);
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#2563eb', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco')},
      {label:'Socios Bizum', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#16a34a', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum')},
      {label:'Socios Efectivo', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#84cc16', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'No socios Banco', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#60a5fa', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco')},
      {label:'No socios Bizum', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#34d399', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum')},
      {label:'No socios Efectivo', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#bef264', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r => r.situacion === 'Pendiente').map(r => r.total)), color:'#f59e0b', lines:incomeLine(r => r.situacion === 'Pendiente')}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r => normV164(r.ticketDonacion) === 'DONADO TIENDA').map(valueCompraV164)), color:'#fcd34d', lines:donationLine('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r => normV164(r.ticketDonacion) === 'DONADO SOCIO').map(valueCompraV164)), color:'#f59e0b', lines:donationLine('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r => normV164(r.ticketDonacion) === 'DONADO OTROS').map(valueCompraV164)), color:'#b45309', lines:donationLine('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r => !isDonV164(r.ticketDonacion) && !isCurrentV164(r.ticketDonacion) && normV164(r.ticketDonacion) !== '').map(valueCompraV164)), color:'#dc2626', lines:expenseLine(r => !isDonV164(r.ticketDonacion) && !isCurrentV164(r.ticketDonacion) && normV164(r.ticketDonacion) !== '')},
      {label:'Gastos corrientes', value:sum(compras.filter(r => isCurrentV164(r.ticketDonacion)).map(valueCompraV164)), color:'#ef4444', lines:expenseLine(r => isCurrentV164(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r => !isDonV164(r.ticketDonacion) && normV164(r.ticketDonacion) === '').map(valueCompraV164)), color:'#fb7185', lines:expenseLine(r => !isDonV164(r.ticketDonacion) && normV164(r.ticketDonacion) === '')}
    ];
    const totalIncome = incomeItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalDon = donationItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalExp = expenseItems.reduce((a,b)=>a+Number(b.value||0),0);
    const saldoOperativo = totalIncome - totalExp;
    const saldoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), displayValue:saldoOperativo, color:saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[]}];
    return {incomeItems, donationItems, expenseItems, saldoItems, totalIncome, totalDon, totalExp, saldoOperativo};
  }
  window.graphPartsV164 = graphPartsV164;

  function legendV164(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${items.filter(x => Number(x.value||0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${escV164(x.label)}: ${escV164(fmtMoneyV164(x.displayValue ?? x.value))}</span>`).join('')}</div>`;
  }
  function segV164(value, max, color, title){
    const w = Math.max(0, Number(value || 0)) / max * 100;
    return `<div class="chart-seg" title="${escV164(title)}" style="width:${w}%;background:${color};"></div>`;
  }
  renderGraficas = function(){
    const wrap = $v164('eventChartWrap');
    if(!wrap) return;
    const g = graphPartsV164();
    const maxVal = Math.max(1, g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    function row(label, total, items){
      const segs = items.map(it => {
        const amount = it.displayValue ?? it.value;
        const detail = (it.lines && it.lines.length) ? ('\n' + it.lines.join('\n')) : '';
        return segV164(it.value, maxVal, it.color, `${it.label}: ${fmtMoneyV164(amount)}${detail}`);
      }).join('');
      return `<div class="chart-row"><div class="chart-label">${escV164(label)}: ${escV164(fmtMoneyV164(total))}</div><div><div class="chart-track">${segs}</div>${legendV164(items)}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">${row('INGRESOS', g.totalIncome, g.incomeItems)}${row('DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems)}${row('GASTOS', g.totalExp, g.expenseItems)}${row('SALDO OPERATIVO', g.saldoOperativo, g.saldoItems)}</div></div>`;
  };

  async function makeChartImageDataUrlV164(){
    const g = graphPartsV164();
    const canvas = document.createElement('canvas');
    canvas.width = 1650; canvas.height = 760;
    const ctx = canvas.getContext('2d');
    const maxVal = Math.max(1, g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 32px Arial'; ctx.fillText('GRÁFICAS DEL EVENTO', 40, 52);
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827'; ctx.font = 'bold 22px Arial'; ctx.fillText(`${label}: ${fmtMoneyV164(total)}`, 40, y);
      const x = 390, w = 1120, h = 38;
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, y-29, w, h);
      let cx = x;
      items.forEach(it => {
        const segW = Math.max(0, Number(it.value || 0)) / maxVal * w;
        if(segW > 0){ ctx.fillStyle = it.color; ctx.fillRect(cx, y-29, segW, h); cx += segW; }
      });
      ctx.font = '16px Arial';
      let lx = x, ly = y + 32;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const txt = `${it.label}: ${fmtMoneyV164(it.displayValue ?? it.value)}`;
        const tw = ctx.measureText(txt).width;
        if(lx + tw + 42 > x + w){ lx = x; ly += 24; }
        ctx.fillStyle = it.color; ctx.fillRect(lx, ly-13, 13, 13);
        ctx.fillStyle = '#374151'; ctx.fillText(txt, lx + 18, ly);
        lx += tw + 52;
      });
      return y + 135;
    }
    let y = 112;
    y = drawRow(y, 'INGRESOS', g.totalIncome, g.incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems);
    y = drawRow(y, 'GASTOS', g.totalExp, g.expenseItems);
    drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, g.saldoItems);
    return canvas.toDataURL('image/png');
  }
  window.makeChartImageDataUrlV164 = makeChartImageDataUrlV164;
  window.makeChartImageDataUrlV160 = makeChartImageDataUrlV164;
  window.makeChartImageDataUrl = makeChartImageDataUrlV164;

  async function makeGroupingChartImageV164(kind){
    const rows = kind === 'segmento' ? summaryBySegmento() : summaryByDestino();
    const canvas = document.createElement('canvas');
    const height = Math.max(520, 115 + rows.length * 96);
    canvas.width = 1500; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const title = kind === 'segmento' ? 'POR SEGMENTO' : 'POR DESTINO';
    const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 30px Arial'; ctx.fillText(`${title} – TOTAL GENERAL: ${fmtMoneyV164(totalGeneral)}`, 35, 48);
    ctx.font = '16px Arial';
    const legends = [['#dc2626','Comprado'],['#f59e0b','Donado'],['#fb7185','Pte. Compra u otros gastos']];
    let lx = 35;
    legends.forEach(([color,label]) => { ctx.fillStyle = color; ctx.fillRect(lx,75,14,14); ctx.fillStyle = '#374151'; ctx.fillText(label,lx+20,88); lx += ctx.measureText(label).width + 70; });
    const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
    let y = 126;
    rows.forEach(r => {
      ctx.fillStyle = '#111827'; ctx.font = 'bold 18px Arial'; ctx.fillText(`${r.label} · ${fmtMoneyV164(r.total)}`, 35, y);
      const x = 360, w = 930, h = 16;
      const vals = [[r.comprado,'#dc2626','Comprado'],[r.donado,'#f59e0b','Donado'],[r.pendiente,'#fb7185','Pte. Compra u otros gastos']];
      vals.forEach((v, i) => {
        const yy = y - 4 + i*24;
        ctx.fillStyle = '#64748b'; ctx.font = '14px Arial'; ctx.fillText(v[2], 190, yy + 13);
        ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, yy, w, h);
        ctx.fillStyle = v[1]; ctx.fillRect(x, yy, Math.max(2, Number(v[0]||0)/maxVal*w), h);
        ctx.fillStyle = '#111827'; ctx.font = '14px Arial'; ctx.fillText(fmtMoneyV164(v[0]), x + w + 18, yy + 13);
      });
      y += 92;
    });
    return canvas.toDataURL('image/png');
  }
  window.makeGroupingChartImageV164 = makeGroupingChartImageV164;

  function autoFitSheetV164(ws, min=10, max=58){
    ws.columns.forEach((col, idx) => {
      let width = col.width || min;
      col.eachCell({includeEmpty:true}, cell => {
        let text = '';
        if(cell.value == null) text = '';
        else if(typeof cell.value === 'object' && cell.value.text) text = String(cell.value.text);
        else if(typeof cell.value === 'object' && cell.value.richText) text = cell.value.richText.map(x=>x.text).join('');
        else text = String(cell.value);
        width = Math.max(width, Math.min(max, text.length + 3));
      });
      col.width = Math.max(min, Math.min(max, width));
    });
  }
  async function protectSheetV164(ws){
    try{
      await ws.protect('open_excel_arrastre', {
        selectLockedCells:false, selectUnlockedCells:false,
        formatCells:false, formatColumns:false, formatRows:false,
        insertColumns:false, insertRows:false, insertHyperlinks:false,
        deleteColumns:false, deleteRows:false, sort:false, autoFilter:false, pivotTables:false,
        objects:true, scenarios:true
      });
      if(ws.model && ws.model.sheetProtection){ ws.model.sheetProtection.objects = true; ws.model.sheetProtection.scenarios = true; }
    }catch(_){ }
  }

  function fileNameV164(ev){
    const title = String(ev?.titulo || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    return `ControlEvent_v26_6_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  }
  window.xlsxFilename = fileNameV164;

  exportSeedWorkbook = async function(){
    if(typeof isLocked === 'function' && isLocked()) return;
    try{ await ensureExcelJS(); }catch(err){ alert('No se pudo cargar el motor de Excel.'); return; }
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB ’26`; wb.created = new Date();
    const headFill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    function sheet(name, headers, rows){
      const ws = wb.addWorksheet(name);
      ws.columns = headers.map(h => ({header:h, key:h, width:Math.max(12,String(h).length+2)}));
      headers.forEach((h,i)=>{ const c=ws.getCell(1,i+1); c.value=h; c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill=headFill; c.border=border; c.alignment={horizontal:'center', vertical:'middle', wrapText:true}; });
      rows.forEach(row => ws.addRow(row.map(v => v == null ? '' : v)));
      ws.eachRow(r => r.eachCell(c => { c.border=border; c.alignment={vertical:'middle', wrapText:true}; }));
      autoFitSheetV164(ws, 12, 70);
      return ws;
    }
    sheet('PERSONAS', ['ID','NOMBRE','RANGO'], (state.personas||[]).map(p=>[p.id,p.nombre||'',p.rango||'']));
    sheet('EVENTOS', ['ID','TITULO','PRECIO','FECHA_INI','FECHA_FIN','DESCRIPCION','SITUACION'], (state.eventos||[]).map(e=>[e.id,e.titulo||'',Number(e.precio||0),e.fechaIni||'',e.fechaFin||'',e.descripcion||'',e.situacion||'']));
    sheet('TIENDAS', ['ID','NOMBRE'], (state.tiendas||[]).map(t=>[t.id,t.nombre||'']));
    sheet('PRODUCTOS', ['ID','NOMBRE','SEGMENTO','DESTINO','PRECIO_REFERENCIA'], (state.productos||[]).map(p=>[p.id,p.nombre||'',p.segmento||'',p.destino||'',Number((p.defaultPrecio??p.precio)||0)]));
    sheet('INGRESOS', ['ID','EVENTO_ID','PERSONA_ID','NUMERO','TIPO_INGRESO','IMPORTE_VOLUNTARIO'], (state.colaboradores||[]).map(c=>[c.id,c.eventId||'',c.personaId||'',Number(c.numero||0),c.situacion||'',Number(c.importe||0)]));
    sheet('COMPRAS', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TICKET','TIENDA_ID','RESPONSABLE_ID'], (state.compras||[]).filter(c=>!isDonV164(c.ticketDonacion)).map(c=>[c.id,c.eventId||'',c.productoId||'',Number(c.unidades||0),Number(c.precio||0),c.ticketDonacion||'',c.tiendaId||'',c.responsableId||'']));
    sheet('DONACIONES', ['ID','EVENTO_ID','PRODUCTO_ID','UNIDADES','PRECIO','TIPO_DONACION','DONANTE','RESPONSABLE_ID'], (state.compras||[]).filter(c=>isDonV164(c.ticketDonacion)).map(c=>[c.id,c.eventId||'',c.productoId||'',Number(c.unidades||0),Number(c.precio||0),c.ticketDonacion||'',resolveDonorNameV164(c),c.responsableId||'']));
    sheet('TICKET_IMAGES', ['KEY','DATA_URL'], Object.entries(state.ticketImages||{}).map(([k,v])=>[k,v]));
    for(const ws of wb.worksheets) await protectSheetV164(ws);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ControlEvent_v26_6_descarga_datos.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  exportExcel = async function(){
    if(typeof isLocked === 'function' && isLocked() && typeof isGodRole === 'function' && !isGodRole()) return;
    const ev = getEventV164();
    if(!ev) return;
    try{ await ensureExcelJS(); }catch(err){ alert('No se pudo cargar el motor de Excel.'); return; }
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB ’26`; wb.created = new Date();
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fills = {title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFF7ED', refund:'FFFFF4F4', greenSoft:'FFEFFFF4', white:'FFFFFFFF', soft:'FFF8FAFC'};
    const moneyFmt = '#,##0.00 [$€-C0A]';
    function baseSheet(name, widths){ const ws = wb.addWorksheet(name); ws.properties.defaultRowHeight = 22; ws.columns = widths.map(w=>({width:w})); return ws; }
    function paint(cell, fill='white'){ cell.border=border; cell.alignment={vertical:'middle', wrapText:true}; if(fills[fill]) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills[fill]}}; }
    function titleRow(ws,r,headers){ headers.forEach((h,i)=>{ const c=ws.getCell(r,i+1); c.value=h; c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills.title}}; c.border=border; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; }); ws.getRow(r).height=24; }
    function mergeTitle(ws,r,text,cols){ ws.mergeCells(r,1,r,cols); const c=ws.getCell(r,1); c.value=text; c.font={bold:true,color:{argb:'FFFFFFFF'},size:13}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills.title}}; c.border=border; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; ws.getRow(r).height=26; }
    function putText(ws,r,c,v,fill='white'){ const cell=ws.getCell(r,c); cell.value=v==null?'':String(v); paint(cell,fill); return cell; }
    function putMoney(ws,r,c,v,fill='white',bold=false){ const cell=ws.getCell(r,c); cell.value=Number(v||0); cell.numFmt=moneyFmt; paint(cell,fill); cell.font={bold:!!bold,color:{argb:'FF111827'}}; return cell; }
    function putNum(ws,r,c,v,fill='white'){ const cell=ws.getCell(r,c); cell.value=Number(v||0); paint(cell,fill); cell.font={color:{argb:'FF111827'}}; return cell; }
    function addCellNote(cell, text){
      if(!cell || !text) return;
      const noteText = String(text).replace(/\s*\n\s*/g, '\n');
      try{
        cell.note = {
          texts: [{text: noteText}],
          margins: {insetmode:'custom', inset:[0.20,0.20,0.60,0.60]},
          protection: {locked:true, lockText:true},
          editAs: 'twoCells',
          width: 820,
          height: 420
        };
      }catch(_){ cell.note = noteText; }
    }
    function addImage(ws, dataUrl, r, c, width, height){
      if(!dataUrl) return false;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return false;
      const ext = m[1].includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.addImage(id, {tl:{col:c-1+0.08,row:r-1+0.08}, ext:{width,height}, editAs:'oneCell'});
      return true;
    }

    const collabs = collabsV164();
    const compras = comprasV164();
    const comprasSolo = compras.filter(x => !isDonV164(x.ticketDonacion)).slice().sort((a,b)=> normV164(a.ticketDonacion).localeCompare(normV164(b.ticketDonacion),'es') || productNameV164(a).localeCompare(productNameV164(b),'es'));
    const donacionesSolo = compras.filter(x => isDonV164(x.ticketDonacion));
    const budget = (typeof budgetSummary === 'function') ? budgetSummary() : {operativa:{saldoOperativo:0,saldoActual:0}};
    const segRows = summaryBySegmento();
    const destRows = summaryByDestino();
    const tiendaRows = summaryByTiendaTicketV164();

    const wsRes = baseSheet('RESUMEN', [34,52,18,18,18,18,18]);
    let r = 1;
    mergeTitle(wsRes, r++, 'RESUMEN DEL EVENTO', 7);
    putText(wsRes,r,1,'Evento'); putText(wsRes,r++,2,ev.titulo||'');
    putText(wsRes,r,1,'Fechas'); putText(wsRes,r++,2,`${ev.fechaIni||''}${ev.fechaFin ? ' - ' + ev.fechaFin : ''}`);
    putText(wsRes,r,1,'Descripción'); wsRes.mergeCells(r,2,r+3,7); const dc=wsRes.getCell(r,2); dc.value=ev.descripcion||''; paint(dc,'soft'); dc.alignment={vertical:'top',wrapText:true}; for(let rr=r; rr<=r+3; rr++) wsRes.getRow(rr).height=32; r += 4;
    putText(wsRes,r,1,'Precio'); putMoney(wsRes,r++,2,Number(ev.precio||0));
    putText(wsRes,r,1,'Ingresado'); putMoney(wsRes,r++,2,budget?.ingresosDinero?.totalIngresado || 0,'white',true);
    putText(wsRes,r,1,'Pendiente'); putMoney(wsRes,r++,2,budget?.ingresosDinero?.pendiente || 0,'warn',true);
    putText(wsRes,r,1,'Saldo operativo'); putMoney(wsRes,r++,2,budget?.operativa?.saldoOperativo || graphPartsV164().saldoOperativo,(budget?.operativa?.saldoOperativo || graphPartsV164().saldoOperativo) >= 0 ? 'ok':'bad',true);
    putText(wsRes,r,1,'Generado por'); putText(wsRes,r++,2,`${VERSION} - ©oltyLAB ’26`);
    r += 2;
    mergeTitle(wsRes, r++, 'GRÁFICAS DE CÁLCULOS POR AGRUPACIÓN', 7);
    putText(wsRes, r, 1, 'Por segmento'); wsRes.getCell(r,1).font = {bold:true,color:{argb:'FF111827'}}; r += 1;
    addImage(wsRes, await makeGroupingChartImageV164('segmento'), r, 1, 1180, 480); wsRes.getRow(r).height = 360; r += 19;
    putText(wsRes, r, 1, 'Por destino'); wsRes.getCell(r,1).font = {bold:true,color:{argb:'FF111827'}}; r += 1;
    addImage(wsRes, await makeGroupingChartImageV164('destino'), r, 1, 1180, 480); wsRes.getRow(r).height = 360;

    const wsIng = baseSheet('INGRESOS', [30,12,18,18,18,18,18]);
    mergeTitle(wsIng,1,'INGRESOS',7); titleRow(wsIng,3,['Nombre','Número','Situación','Rango','Importe socio','Total','Pendiente']);
    r=4; let totalIng=0, totalPend=0;
    collabs.forEach(it=>{ const persona=it.persona||personByIdV164(it.personaId); const total=Number(it.total || (Number(it.numero||1)*Number(it.importe||ev.precio||0))); const pendiente=it.situacion==='Pendiente'?total:0; putText(wsIng,r,1,persona.nombre||''); putNum(wsIng,r,2,it.numero||1); putText(wsIng,r,3,it.situacion||''); putText(wsIng,r,4,persona.rango||''); putMoney(wsIng,r,5,it.importe || ev.precio || 0); putMoney(wsIng,r,6,total); putMoney(wsIng,r,7,pendiente,pendiente?'warn':'white'); totalIng += total; totalPend += pendiente; r++; });
    titleRow(wsIng,r,['TOTAL','','','','','', '']); putMoney(wsIng,r,6,totalIng,'white',true); putMoney(wsIng,r,7,totalPend,'warn',true);

    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [32,12,16,16,22,24,22,18]);
    mergeTitle(wsCom,1,'COMPRAS Y OTROS GASTOS',8); titleRow(wsCom,3,['Producto','Unidades','Precio','Importe','Ticket/Otros gastos','Tienda','Responsable','Estado']);
    r=4; let totalCom=0;
    comprasSolo.forEach(it=>{ const val=valueCompraV164(it); const pending=normV164(it.ticketDonacion)===''; putText(wsCom,r,1,productNameV164(it),pending?'warn':'white'); putNum(wsCom,r,2,it.unidades||0,pending?'warn':'white'); putMoney(wsCom,r,3,it.precio ?? productByIdV164(it.productoId).precio ?? 0,pending?'warn':'white'); putMoney(wsCom,r,4,val,pending?'warn':'white'); putText(wsCom,r,5,normV164(it.ticketDonacion)||'Pte.Compra u otros gastos',pending?'warn':'white'); putText(wsCom,r,6,storeNameV164(it)||'Sin tienda',pending?'warn':'white'); putText(wsCom,r,7,personByIdV164(it.responsableId).nombre||'',pending?'warn':'white'); putText(wsCom,r,8,pending?'PENDIENTE':'OK',pending?'warn':'white'); totalCom += val; r++; });
    titleRow(wsCom,r,['TOTAL','','','','','','','']); putMoney(wsCom,r,4,totalCom,'white',true);

    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [32,12,16,16,22,28,24,18]);
    mergeTitle(wsDon,1,'DONACIONES DE PRODUCTO',8); titleRow(wsDon,3,['Producto','Unidades','Precio','Importe','Tipo donación','Donante','Responsable','Origen']);
    r=4; let totalDon=0;
    donacionesSolo.forEach(it=>{ const val=valueCompraV164(it); const donor=resolveDonorNameV164(it)||'Sin donante'; putText(wsDon,r,1,productNameV164(it)); putNum(wsDon,r,2,it.unidades||0); putMoney(wsDon,r,3,it.precio ?? productByIdV164(it.productoId).precio ?? 0); putMoney(wsDon,r,4,val); putText(wsDon,r,5,it.ticketDonacion||''); putText(wsDon,r,6,donor); putText(wsDon,r,7,personByIdV164(it.responsableId).nombre||''); putText(wsDon,r,8,it.donorRef||it.tiendaId||''); totalDon += val; r++; });
    titleRow(wsDon,r,['TOTAL','','','','','','','']); putMoney(wsDon,r,4,totalDon,'white',true);

    function writeGroupingSheet(name, title, rows){
      const ws = baseSheet(name, [34,18,18,26,18]);
      mergeTitle(ws,1,title,5); titleRow(ws,3,[title.includes('DESTINO')?'Destino':'Segmento','Comprado','Donado','Pte. Compra u otros gastos','TOTAL']);
      let rr=4, c=0,d=0,p=0,t=0;
      rows.forEach(it=>{ putText(ws,rr,1,it.label||''); putMoney(ws,rr,2,it.comprado||0); putMoney(ws,rr,3,it.donado||0); putMoney(ws,rr,4,it.pendiente||0, it.pendiente?'warn':'white'); putMoney(ws,rr,5,it.total||0); c+=Number(it.comprado||0); d+=Number(it.donado||0); p+=Number(it.pendiente||0); t+=Number(it.total||0); rr++; });
      titleRow(ws,rr,['TOTAL GENERAL','','','','']); putMoney(ws,rr,2,c,'white',true); putMoney(ws,rr,3,d,'white',true); putMoney(ws,rr,4,p,p?'warn':'white',true); putMoney(ws,rr,5,t,'white',true);
      return ws;
    }
    const wsSeg = writeGroupingSheet('CALCULOS_SEGMENTO','CÁLCULOS SEGMENTO',segRows);
    const wsDest = writeGroupingSheet('CALCULOS_DESTINO','CÁLCULOS DESTINO',destRows);

    const wsTT = baseSheet('CALCULOS_TIENDA_TICKET', [56,16,42]);
    mergeTitle(wsTT,1,'CÁLCULOS TIENDA Y TICKET',3); titleRow(wsTT,3,['Concepto','Importe','Imagen']);
    r=4; let tt=0;
    tiendaRows.forEach(it=>{
      putText(wsTT,r,1,it.label||it.k||'',it.pending?'warn':'white');
      putMoney(wsTT,r,2,it.v,it.pending?'warn':'white');
      if(it.image){ putText(wsTT,r,3,''); addImage(wsTT,it.image,r,3,210,122); wsTT.getRow(r).height=100; }
      else { putText(wsTT,r,3,'Sin imagen',it.pending?'warn':'white'); }
      tt += Number(it.v||0); r++;
    });
    titleRow(wsTT,r,['TOTAL','','']); putMoney(wsTT,r,2,tt,'white',true); putText(wsTT,r,3,'');

    const wsGraf = baseSheet('GRAFICAS', [28,28,28,28,28]);
    mergeTitle(wsGraf,1,'GRÁFICAS DEL EVENTO',5);
    addImage(wsGraf, await makeChartImageDataUrlV164(), 3, 1, 1350, 625);
    wsGraf.getRow(3).height = 470;

    for(const ws of wb.worksheets){
      autoFitSheetV164(ws, 11, 72);
    }
    wsRes.getColumn(2).width = Math.max(wsRes.getColumn(2).width, 52);
    wsTT.getColumn(3).width = 28;
    wsGraf.columns.forEach(c => c.width = 28);
    for(const ws of wb.worksheets) await protectSheetV164(ws);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileNameV164(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  window.addEventListener('load', () => {
    try{ if(typeof render === 'function') render(); }catch(_){ }
  });
})();


/* ==== V17.2 FIXES: EXCEL RESUMEN, ORDENACIONES Y DONACIONES ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const $v171 = id => document.getElementById(id);
  const normV171 = v => String(v ?? '').trim();
  const escV171 = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch] || ch));
  const moneyV171 = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const isDonV171 = v => (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(normV171(v));
  const isCurrentV171 = v => (typeof isCurrentExpenseTicket === 'function') ? isCurrentExpenseTicket(v) : normV171(v) === 'GASTOS CORRIENTES';
  const getEventV171 = () => (typeof selectedEvent === 'function' ? selectedEvent() : (state.eventos || []).find(e => e.id === state.selectedEventId));
  const collabsV171 = () => (typeof collabsForEvent === 'function' ? collabsForEvent() : (state.colaboradores || []).filter(c => String(c.eventId) === String(state.selectedEventId)));
  const comprasV171 = () => (typeof comprasForEvent === 'function' ? comprasForEvent() : (state.compras || []).filter(c => String(c.eventId) === String(state.selectedEventId)));

  function byIdV171(list, id){ return (list || []).find(x => String(x.id) === String(id)); }
  function productByIdV171(id){ return (typeof productoById === 'function' ? productoById(id) : null) || byIdV171(state.productos || [], id) || {}; }
  function personByIdV171(id){ return (typeof personaById === 'function' ? personaById(id) : null) || byIdV171(state.personas || [], id) || {}; }
  function storeByIdV171(id){ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byIdV171(state.tiendas || [], id) || {}; }
  function productNameV171(c){ return c?.producto?.nombre || productByIdV171(c?.productoId).nombre || 'Producto'; }
  function storeNameV171(c){ return c?.tienda?.nombre || storeByIdV171(c?.tiendaId).nombre || ''; }
  function personNameV171(c){ return c?.persona?.nombre || personByIdV171(c?.personaId).nombre || 'Sin nombre'; }
  function valueCompraV171(c){
    const p = productByIdV171(c?.productoId);
    const precio = Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
    return Number(c?.valor != null ? c.valor : precio * Number(c?.unidades || 0));
  }
  function resolveDonorNameV171(c){
    try{
      if(typeof resolveDonorNameV164 === 'function'){
        const v = resolveDonorNameV164(c);
        if(normV171(v) && normV171(v) !== 'Sin tienda') return normV171(v);
      }
      if(c?.donorLabel && normV171(c.donorLabel)) return normV171(c.donorLabel);
      if(c?.donorRef && normV171(c.donorRef)){
        const raw = normV171(c.donorRef);
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(normV171(d)) return normV171(d);
        }
        if(raw.startsWith('P:')){ const p = personByIdV171(raw.slice(2)); if(p.nombre) return p.nombre; }
        if(raw.startsWith('T:')){ const t = storeByIdV171(raw.slice(2)); if(t.nombre) return t.nombre; }
        return raw;
      }
      if(c?.donante && normV171(c.donante)) return normV171(c.donante);
      const t = storeNameV171(c);
      if(t) return t;
    }catch(_){ }
    return 'Sin donante';
  }
  window.resolveDonorNameV171 = resolveDonorNameV171;

  function graphPartsV171(){
    const rows = collabsV171();
    const compras = comprasV171();
    const budget = (typeof budgetSummary === 'function') ? budgetSummary() : null;
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const eventPrice = () => Number(getEventV171()?.precio || 0);
    const unitPrice = r => {
      const p = productByIdV171(r?.productoId);
      return Number(r?.precio != null ? r.precio : (r?.precioCalc != null ? r.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
    };
    const totalCol = r => {
      const rg = String(r?.persona?.rango || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
      const parseLocal = v => {
        if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
        let t = String(v ?? '').trim();
        if(!t) return 0;
        t = t.replace(/[^0-9,.-]/g,'');
        if(t.includes(',') && t.includes('.')) t = t.replace(/\./g,'').replace(',', '.');
        else if(t.includes(',')) t = t.replace(',', '.');
        const n = Number(t);
        return Number.isFinite(n) ? n : 0;
      };
      if(rg === 'SOCIO'){
        const obligatorio = parseLocal(r.numero) * parseLocal(eventPrice());
        const voluntario = parseLocal(r.importeVoluntario ?? r.voluntario ?? r.donation ?? r.importe ?? 0);
        return obligatorio + voluntario;
      }
      return parseLocal(r.total ?? r.donation ?? r.importeVoluntario ?? r.voluntario ?? r.importe ?? 0);
    };
    const incomeLine = fn => rows.filter(fn).map(r => {
      const n = Number(r.numero || 0);
      const importeSocio = Number(r.base != null ? r.base : (n * eventPrice()));
      const voluntario = Number(r.donation != null ? r.donation : (r.importe || 0));
      return `${personNameV171(r)} — Nº ${n} — Socio: ${moneyV171(importeSocio)} — Voluntario: ${moneyV171(voluntario)} — Total: ${moneyV171(totalCol(r))} — ${r.situacion || ''}`;
    });
    const donationLine = ticket => compras.filter(r => normV171(r.ticketDonacion) === ticket).slice().sort((a,b)=> resolveDonorNameV171(a).localeCompare(resolveDonorNameV171(b),'es') || productNameV171(a).localeCompare(productNameV171(b),'es')).map(r => {
      const u = Number(r.unidades || 0), pr = unitPrice(r), val = valueCompraV171(r);
      return `${resolveDonorNameV171(r)} — ${productNameV171(r)} — ${u} uds x ${moneyV171(pr)} = ${moneyV171(val)} — ${normV171(r.ticketDonacion)}`;
    });
    const expenseLine = fn => compras.filter(fn).slice().sort((a,b)=> (normV171(a.ticketDonacion)||'Pte.Compra u otros gastos').localeCompare(normV171(b.ticketDonacion)||'Pte.Compra u otros gastos','es') || productNameV171(a).localeCompare(productNameV171(b),'es')).map(r => {
      const u = Number(r.unidades || 0), pr = unitPrice(r), val = valueCompraV171(r);
      return `${normV171(r.ticketDonacion) || 'Pte.Compra u otros gastos'} — ${productNameV171(r)} — ${storeNameV171(r) || 'Sin tienda'} — ${u} uds x ${moneyV171(pr)} = ${moneyV171(val)}`;
    });
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(totalCol)), color:'#2563eb', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco')},
      {label:'Socios Bizum', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(totalCol)), color:'#16a34a', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum')},
      {label:'Socios Efectivo', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(totalCol)), color:'#84cc16', lines:incomeLine(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'No socios Banco', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(totalCol)), color:'#60a5fa', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco')},
      {label:'No socios Bizum', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(totalCol)), color:'#34d399', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum')},
      {label:'No socios Efectivo', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(totalCol)), color:'#bef264', lines:incomeLine(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r => r.situacion === 'Pendiente').map(totalCol)), color:'#f59e0b', lines:incomeLine(r => r.situacion === 'Pendiente')}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r => normV171(r.ticketDonacion) === 'DONADO TIENDA').map(valueCompraV171)), color:'#fcd34d', lines:donationLine('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r => normV171(r.ticketDonacion) === 'DONADO SOCIO').map(valueCompraV171)), color:'#f59e0b', lines:donationLine('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r => normV171(r.ticketDonacion) === 'DONADO OTROS').map(valueCompraV171)), color:'#b45309', lines:donationLine('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r => !isDonV171(r.ticketDonacion) && !isCurrentV171(r.ticketDonacion) && normV171(r.ticketDonacion) !== '').map(valueCompraV171)), color:'#dc2626', lines:expenseLine(r => !isDonV171(r.ticketDonacion) && !isCurrentV171(r.ticketDonacion) && normV171(r.ticketDonacion) !== '')},
      {label:'Gastos corrientes', value:sum(compras.filter(r => isCurrentV171(r.ticketDonacion)).map(valueCompraV171)), color:'#ef4444', lines:expenseLine(r => isCurrentV171(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r => !isDonV171(r.ticketDonacion) && normV171(r.ticketDonacion) === '').map(valueCompraV171)), color:'#fb7185', lines:expenseLine(r => !isDonV171(r.ticketDonacion) && normV171(r.ticketDonacion) === '')}
    ];
    const totalIncomeRaw = incomeItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalIncome = Number.isFinite(Number(budget?.ingresosDinero?.totalIngresado)) ? Number(budget.ingresosDinero.totalIngresado) : totalIncomeRaw;
    const totalDon = donationItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalExp = expenseItems.reduce((a,b)=>a+Number(b.value||0),0);
    const saldoActual = Number.isFinite(Number(budget?.operativa?.saldoActual)) ? Number(budget.operativa.saldoActual) : (totalIncome - totalExp);
    const saldoOperativo = Number.isFinite(Number(budget?.operativa?.saldoOperativo)) ? Number(budget.operativa.saldoOperativo) : (totalIncome - totalExp);
    const saldoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), displayValue:saldoOperativo, color:saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[]}];
    return {incomeItems, donationItems, expenseItems, saldoItems, totalIncome, totalIncomeRaw, totalDon, totalExp, saldoActual, saldoOperativo};
  }
  window.graphPartsV171 = graphPartsV171;
  window.graphPartsV164 = graphPartsV171;

  function legendV171(items){
    const html = items.filter(x => Number(x.value || 0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${escV171(x.label)}: ${escV171(moneyV171(x.displayValue ?? x.value))}</span>`).join('');
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${html}</div>`;
  }
  function segV171(value, max, color, title){
    const w = Math.max(0, Number(value || 0)) / max * 100;
    return `<div class="chart-seg" title="${escV171(title)}" style="width:${w}%;background:${color};"></div>`;
  }
  renderGraficas = function(){
    const wrap = $v171('eventChartWrap');
    if(!wrap) return;
    const g = graphPartsV171();
    const maxVal = Math.max(1, g.totalIncomeRaw || g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    function row(label, total, items){
      const segs = items.map(it => {
        const amount = it.displayValue ?? it.value;
        const detail = (it.lines && it.lines.length) ? ('\n' + it.lines.join('\n')) : '';
        return segV171(it.value, maxVal, it.color, `${it.label}: ${moneyV171(amount)}${detail}`);
      }).join('');
      return `<div class="chart-row"><div class="chart-label">${escV171(label)}: ${escV171(moneyV171(total))}</div><div><div class="chart-track">${segs}</div>${legendV171(items)}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">${row('INGRESOS', g.totalIncome, g.incomeItems)}${row('DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems)}${row('GASTOS', g.totalExp, g.expenseItems)}${row('SALDO OPERATIVO', g.saldoOperativo, g.saldoItems)}</div></div>`;
  };

  async function makeChartImageDataUrlV171(){
    const g = graphPartsV171();
    const canvas = document.createElement('canvas');
    canvas.width = 1800; canvas.height = 790;
    const ctx = canvas.getContext('2d');
    const maxVal = Math.max(1, g.totalIncomeRaw || g.totalIncome, g.totalDon, g.totalExp, Math.abs(g.saldoOperativo));
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 34px Arial'; ctx.fillText('GRÁFICAS DEL EVENTO', 42, 54);
    function drawRow(y, label, total, items){
      ctx.fillStyle = '#111827'; ctx.font = 'bold 22px Arial';
      ctx.fillText(`${label}: ${moneyV171(total)}`, 42, y);
      // Barras más desplazadas a la derecha para que la etiqueta de DONACIÓN DE PRODUCTO no se monte.
      const x = 560, w = 1080, h = 38;
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, y-29, w, h);
      let cx = x;
      items.forEach(it => {
        const segW = Math.max(0, Number(it.value || 0)) / maxVal * w;
        if(segW > 0){ ctx.fillStyle = it.color; ctx.fillRect(cx, y-29, segW, h); cx += segW; }
      });
      ctx.font = '16px Arial';
      let lx = x, ly = y + 34;
      items.filter(it => Number(it.value || 0) !== 0).forEach(it => {
        const txt = `${it.label}: ${moneyV171(it.displayValue ?? it.value)}`;
        const tw = ctx.measureText(txt).width;
        if(lx + tw + 42 > x + w){ lx = x; ly += 24; }
        ctx.fillStyle = it.color; ctx.fillRect(lx, ly-13, 13, 13);
        ctx.fillStyle = '#374151'; ctx.fillText(txt, lx + 18, ly);
        lx += tw + 52;
      });
      return y + 142;
    }
    let y = 116;
    y = drawRow(y, 'INGRESOS', g.totalIncome, g.incomeItems);
    y = drawRow(y, 'DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems);
    y = drawRow(y, 'GASTOS', g.totalExp, g.expenseItems);
    drawRow(y, 'SALDO OPERATIVO', g.saldoOperativo, g.saldoItems);
    return canvas.toDataURL('image/png');
  }
  window.makeChartImageDataUrlV171 = makeChartImageDataUrlV171;
  window.makeChartImageDataUrlV164 = makeChartImageDataUrlV171;
  window.makeChartImageDataUrl = makeChartImageDataUrlV171;

  function groupingRowsV171(kind){
    if(kind === 'segmento' && typeof summaryBySegmento === 'function') return summaryBySegmento();
    if(kind === 'destino' && typeof summaryByDestino === 'function') return summaryByDestino();
    return [];
  }
  async function makeGroupingChartImageV171(kind){
    const rows = groupingRowsV171(kind);
    if(typeof makeGroupingChartImageV164 === 'function') return makeGroupingChartImageV164(kind);
    const canvas = document.createElement('canvas');
    const height = Math.max(520, 115 + rows.length * 96);
    canvas.width = 1500; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const title = kind === 'segmento' ? 'POR SEGMENTO' : 'POR DESTINO';
    const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 30px Arial'; ctx.fillText(`${title} – TOTAL GENERAL: ${moneyV171(totalGeneral)}`, 35, 48);
    ctx.font = '16px Arial';
    const legends = [['#dc2626','Comprado'],['#f59e0b','Donado'],['#fb7185','Pte. Compra u otros gastos']];
    let lx = 35;
    legends.forEach(([color,label]) => { ctx.fillStyle = color; ctx.fillRect(lx,75,14,14); ctx.fillStyle = '#374151'; ctx.fillText(label,lx+20,88); lx += ctx.measureText(label).width + 70; });
    const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
    let y = 126;
    rows.forEach(r => {
      ctx.fillStyle = '#111827'; ctx.font = 'bold 18px Arial'; ctx.fillText(`${r.label} · ${moneyV171(r.total)}`, 35, y);
      const x = 360, w = 930, h = 16;
      [[r.comprado,'#dc2626','Comprado'],[r.donado,'#f59e0b','Donado'],[r.pendiente,'#fb7185','Pte. Compra u otros gastos']].forEach((v, i) => {
        const yy = y - 4 + i*24;
        ctx.fillStyle = '#64748b'; ctx.font = '14px Arial'; ctx.fillText(v[2], 190, yy + 13);
        ctx.fillStyle = '#f3f4f6'; ctx.fillRect(x, yy, w, h);
        ctx.fillStyle = v[1]; ctx.fillRect(x, yy, Math.max(2, Number(v[0]||0)/maxVal*w), h);
        ctx.fillStyle = '#111827'; ctx.font = '14px Arial'; ctx.fillText(moneyV171(v[0]), x + w + 18, yy + 13);
      });
      y += 92;
    });
    return canvas.toDataURL('image/png');
  }
  window.makeGroupingChartImageV171 = makeGroupingChartImageV171;

  function fileNameV171(ev){
    const title = String(ev?.titulo || 'evento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'evento';
    const now = new Date();
    const dd = String(now.getDate()).padStart(2,'0');
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    return `ControlEvent_v26_6_INFOEVENTO-${title}_${yyyy}${mm}${dd}.xlsx`;
  }
  window.xlsxFilename = fileNameV171;

  async function ensureJSZipV171(){
    if(window.JSZip) return true;
    try{
      if(typeof loadScriptWithFallback === 'function'){
        await loadScriptWithFallback(['./vendor/jszip.min.js','https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js']);
        return !!window.JSZip;
      }
    }catch(_){ }
    return false;
  }
  async function hardenWorkbookBufferV171(buffer){
    try{
      if(!(await ensureJSZipV171())) return buffer;
      const zip = await window.JSZip.loadAsync(buffer);
      const wbFile = zip.file('xl/workbook.xml');
      if(wbFile){
        let xml = await wbFile.async('string');
        if(!/<workbookProtection\b/.test(xml)) xml = xml.replace(/(<bookViews\b)/, '<workbookProtection lockStructure="1" lockWindows="1" workbookPassword="D184"/>$1');
        zip.file('xl/workbook.xml', xml);
      }
      const sheetFiles = Object.keys(zip.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
      for(const name of sheetFiles){
        const f = zip.file(name); if(!f) continue;
        let xml = await f.async('string');
        if(/<sheetProtection\b/.test(xml)){
          xml = xml.replace(/<sheetProtection\b([^>]*)\/>/, (m, attrs) => {
            let a = attrs;
            const setAttr = (key, val) => { a = new RegExp('\\s'+key+'="[^"]*"').test(a) ? a.replace(new RegExp('\\s'+key+'="[^"]*"'), ` ${key}="${val}"`) : a + ` ${key}="${val}"`; };
            setAttr('sheet','1'); setAttr('objects','1'); setAttr('scenarios','1'); setAttr('selectLockedCells','0'); setAttr('selectUnlockedCells','0'); setAttr('formatCells','0'); setAttr('formatColumns','0'); setAttr('formatRows','0');
            return `<sheetProtection${a}/>`;
          });
        }
        zip.file(name, xml);
      }
      const drawingFiles = Object.keys(zip.files).filter(n => /^xl\/drawings\/drawing\d+\.xml$/.test(n));
      for(const name of drawingFiles){
        const f = zip.file(name); if(!f) continue;
        let xml = await f.async('string');
        xml = xml.replace(/<a:picLocks\b([^>]*)\/>/g, (m, attrs) => {
          let a = attrs;
          const setAttr = (key, val) => { a = new RegExp('\\s'+key+'="[^"]*"').test(a) ? a.replace(new RegExp('\\s'+key+'="[^"]*"'), ` ${key}="${val}"`) : a + ` ${key}="${val}"`; };
          setAttr('noSelect','1'); setAttr('noMove','1'); setAttr('noResize','1'); setAttr('noChangeAspect','1'); setAttr('noChangeArrowheads','1'); setAttr('noGrp','1');
          return `<a:picLocks${a}/>`;
        });
        xml = xml.replace(/<xdr:cNvPicPr>\s*<\/xdr:cNvPicPr>/g, '<xdr:cNvPicPr><a:picLocks noSelect="1" noMove="1" noResize="1" noChangeAspect="1" noChangeArrowheads="1" noGrp="1"/></xdr:cNvPicPr>');
        xml = xml.replace(/<xdr:clientData\s*\/>/g, '<xdr:clientData fLocksWithSheet="1" fPrintsWithSheet="1"/>');
        xml = xml.replace(/<xdr:clientData\b([^>]*)>/g, (m, attrs) => {
          let a = attrs;
          const setAttr = (key, val) => { a = new RegExp('\\s'+key+'="[^"]*"').test(a) ? a.replace(new RegExp('\\s'+key+'="[^"]*"'), ` ${key}="${val}"`) : a + ` ${key}="${val}"`; };
          setAttr('fLocksWithSheet','1'); setAttr('fPrintsWithSheet','1');
          return `<xdr:clientData${a}>`;
        });
        zip.file(name, xml);
      }
      return await zip.generateAsync({type:'arraybuffer'});
    }catch(err){
      console.warn('No se pudo reforzar internamente la protección XLSX:', err);
      return buffer;
    }
  }

  async function protectSheetV171(ws){
    try{
      await ws.protect('open_excel_arrastre', {
        selectLockedCells:false, selectUnlockedCells:false,
        formatCells:false, formatColumns:false, formatRows:false,
        insertColumns:false, insertRows:false, insertHyperlinks:false,
        deleteColumns:false, deleteRows:false, sort:false, autoFilter:false, pivotTables:false,
        objects:true, scenarios:true
      });
      if(ws.model && ws.model.sheetProtection){
        ws.model.sheetProtection.objects = true;
        ws.model.sheetProtection.scenarios = true;
        ws.model.sheetProtection.selectLockedCells = false;
        ws.model.sheetProtection.selectUnlockedCells = false;
      }
    }catch(_){ }
  }

  function autoFitSheetV171(ws, min=10, max=72){
    ws.columns.forEach(col => {
      let width = col.width || min;
      col.eachCell({includeEmpty:true}, cell => {
        let text = '';
        if(cell.value == null) text = '';
        else if(typeof cell.value === 'object' && cell.value.text) text = String(cell.value.text);
        else if(typeof cell.value === 'object' && cell.value.richText) text = cell.value.richText.map(x=>x.text).join('');
        else text = String(cell.value);
        width = Math.max(width, Math.min(max, text.length + 3));
      });
      col.width = Math.max(min, Math.min(max, width));
    });
  }

  function summaryByTiendaTicketRowsV171(){
    if(typeof summaryByTiendaTicket === 'function'){
      try{ return summaryByTiendaTicket() || []; }catch(_){ }
    }
    return [];
  }

  function productSegmentV171(item){
    try{
      const p = productByIdV171(item?.productoId) || {};
      return normV171(item?.segmento || item?.producto?.segmento || p.segmento || '');
    }catch(_){ return ''; }
  }
  function normalizeSortV171(value){
    return normV171(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  }
  function categoryRankV171(value){
    const s = normalizeSortV171(value);
    const order = ['COMIDA','BEBIDA','INFRAESTRUCTURA'];
    const pos = order.indexOf(s);
    return pos >= 0 ? pos : 99;
  }
  function compareSegmentProductV171(a,b, fixedCategoryOrder=false){
    const sa = productSegmentV171(a);
    const sb = productSegmentV171(b);
    if(fixedCategoryOrder){
      const ra = categoryRankV171(sa), rb = categoryRankV171(sb);
      if(ra !== rb) return ra - rb;
    }
    const segCmp = normalizeSortV171(sa).localeCompare(normalizeSortV171(sb), 'es');
    if(segCmp) return segCmp;
    return normalizeSortV171(productNameV171(a)).localeCompare(normalizeSortV171(productNameV171(b)), 'es');
  }
  function emittedByTextV171(date=new Date()){
    const pad = n => String(n).padStart(2,'0');
    const dd = pad(date.getDate());
    const mm = pad(date.getMonth()+1);
    const yyyy = date.getFullYear();
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `Emitido por “©oltyLAB ’26_ControlEvent_v26_6_${dd}${mm}${yyyy}_${hh}:${mi}:${ss}”`;
  }

  async function exportExcelV171(){
    if(typeof isLocked === 'function' && isLocked() && typeof isGodRole === 'function' && !isGodRole()) return;
    const ev = getEventV171();
    if(!ev) return;
    try{ await ensureExcelJS(); }catch(err){ alert('No se pudo cargar el motor de Excel.'); return; }
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB ’26`; wb.created = new Date();
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const fills = {title:'FF111827', ok:'FFECFDF5', bad:'FFFEF2F2', warn:'FFFFF7ED', refund:'33FF0000', white:'FFFFFFFF', soft:'FFF8FAFC'};
    const moneyFmt = '#,##0.00 [$€-C0A]';
    function baseSheet(name, widths){ const ws = wb.addWorksheet(name); ws.properties.defaultRowHeight = 22; ws.columns = widths.map(w=>({width:w})); return ws; }
    function paint(cell, fill='white'){ cell.border=border; cell.alignment={vertical:'middle', wrapText:true}; if(fills[fill]) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills[fill]}}; }
    function titleRow(ws,r,headers){ headers.forEach((h,i)=>{ const c=ws.getCell(r,i+1); c.value=h; c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills.title}}; c.border=border; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; }); ws.getRow(r).height=24; }
    function mergeTitle(ws,r,text,cols){ ws.mergeCells(r,1,r,cols); const c=ws.getCell(r,1); c.value=text; c.font={bold:true,color:{argb:'FFFFFFFF'},size:13}; c.fill={type:'pattern',pattern:'solid',fgColor:{argb:fills.title}}; c.border=border; c.alignment={vertical:'middle',horizontal:'center',wrapText:true}; ws.getRow(r).height=26; }
    function putText(ws,r,c,v,fill='white',bold=false){ const cell=ws.getCell(r,c); cell.value=v==null?'':String(v); paint(cell,fill); cell.font={bold:!!bold,color:{argb:'FF111827'}}; return cell; }
    function putMoney(ws,r,c,v,fill='white',bold=false){ const cell=ws.getCell(r,c); cell.value=Number(v||0); cell.numFmt=moneyFmt; paint(cell,fill); cell.font={bold:!!bold,color:{argb:'FF111827'}}; return cell; }
    function putNum(ws,r,c,v,fill='white'){ const cell=ws.getCell(r,c); cell.value=Number(v||0); paint(cell,fill); cell.font={color:{argb:'FF111827'}}; return cell; }
    function addImage(ws, dataUrl, r, c, width, height){
      if(!dataUrl) return false;
      const m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if(!m) return false;
      const ext = m[1].includes('png') ? 'png' : 'jpeg';
      const id = wb.addImage({base64:dataUrl, extension:ext});
      ws.addImage(id, {tl:{col:c-1+0.08,row:r-1+0.08}, ext:{width,height}, editAs:'oneCell'});
      return true;
    }
    function reserveImageRows(ws, startRow, heightPx, blankRows=2){
      const rows = Math.ceil(heightPx / 28);
      for(let rr=startRow; rr<startRow+rows; rr++) ws.getRow(rr).height = 21;
      return startRow + rows + blankRows;
    }

    const collabs = collabsV171();
    const compras = comprasV171();
    const comprasSolo = compras.filter(x => !isDonV171(x.ticketDonacion)).slice().sort((a,b)=> compareSegmentProductV171(a,b,true));
    const donacionesSolo = compras.filter(x => isDonV171(x.ticketDonacion)).slice().sort((a,b)=> compareSegmentProductV171(a,b,true));
    const budget = (typeof budgetSummary === 'function') ? budgetSummary() : {};
    const g = graphPartsV171();
    const segRows = groupingRowsV171('segmento');
    const destRows = groupingRowsV171('destino');
    const tiendaRows = (function(rows){
      // v21.5.1: Refuerzo real para que CALCULOS_TIENDA_TICKET lleve las fotos.
      // No dependemos solo de row.image; buscamos en state.ticketImages por todas las claves usadas
      // históricamente: eventId|Tienda | TKxx, eventId|Tienda|TKxx, eventId|TKxx, etc.
      const evId = String(ev.id || (state && state.selectedEventId) || '');
      const imgs = (state && state.ticketImages) ? state.ticketImages : {};
      const clean = v => String(v ?? '').trim();
      const up = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
      const compact = v => up(v).replace(/\s*\|\s*/g,'|');
      const makeKey = k => {
        try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(k, evId); }catch(_){ }
        return `${evId}|${k}`;
      };
      const findImage = row => {
        if(!row || row.pending || row.donated === true || row.attachable === false) return row?.image || '';
        const candidates = [];
        const add = v => { v = clean(v); if(v && !candidates.includes(v)) candidates.push(v); };
        add(row.k); add(row.label); add(row.key); add(row.clave); add(row.concepto);
        const src = clean(row.k || row.label || '');
        const parts = src.split('|').map(x=>clean(x)).filter(Boolean);
        if(parts.length >= 2){
          const tienda = parts[0];
          const tk = parts[1].split('·')[0].trim();
          add(`${tienda} | ${tk}`); add(`${tienda}|${tk}`); add(`${tk} | ${tienda}`); add(`${tk}|${tienda}`); add(tk);
        }
        if(clean(row.rawTicket)){
          add(row.rawTicket);
          if(parts[0]){ add(`${parts[0]} | ${row.rawTicket}`); add(`${parts[0]}|${row.rawTicket}`); }
        }
        for(const c of candidates){
          const keys = [c, makeKey(c), `${evId}|${c}`];
          for(const k of keys){ if(imgs[k]) return imgs[k]; }
        }
        // Búsqueda flexible por contenido, dentro del evento activo.
        const srcUp = compact(src);
        const ticketPart = compact((parts[1] || row.rawTicket || '').split('·')[0]);
        const tiendaPart = compact(parts[0] || '');
        for(const [k,v] of Object.entries(imgs)){
          const ks = String(k);
          if(evId && !ks.startsWith(`${evId}|`)) continue;
          const rest = compact(ks.slice(evId ? evId.length + 1 : 0));
          if(srcUp && rest === srcUp) return v;
          if(ticketPart && rest.includes(ticketPart) && (!tiendaPart || rest.includes(tiendaPart))) return v;
        }
        return row.image || '';
      };
      return (rows || []).map(row => {
        const nr = Object.assign({}, row);
        const img = findImage(nr);
        if(img) nr.image = img;
        return nr;
      });
    })(summaryByTiendaTicketRowsV171());

    const wsRes = baseSheet('RESUMEN', [30,42,18,18,18,18,18]);
    let r = 1;
    wsRes.mergeCells(r,1,r,7);
    putText(wsRes, r++, 1, emittedByTextV171(new Date()), 'soft', true);
    mergeTitle(wsRes, r++, 'RESUMEN DEL EVENTO', 7);
    putText(wsRes,r,1,'Título del evento'); wsRes.mergeCells(r,2,r,7); putText(wsRes,r++,2,ev.titulo||'', 'white', true);
    const descText = normV171(ev.descripcion || '');
    const explicitLines = descText ? descText.split(/\r?\n/).length : 1;
    const descRows = Math.max(3, Math.min(40, Math.ceil(descText.length / 72) + explicitLines - 1));
    putText(wsRes,r,1,'Descripción del evento');
    wsRes.mergeCells(r,2,r+descRows-1,5);
    const dc=wsRes.getCell(r,2);
    dc.value=descText;
    paint(dc,'soft');
    dc.font={color:{argb:'FF111827'}};
    dc.alignment={vertical:'top',horizontal:'left',wrapText:true,shrinkToFit:false};
    for(let rr=r; rr<r+descRows; rr++) wsRes.getRow(rr).height=24;
    r += descRows;
    r += 1;
    putText(wsRes,r,1,'Situación del evento'); putText(wsRes,r++,2,ev.situacion || ev.estado || 'En curso');
    putText(wsRes,r,1,'Fecha inicio'); putText(wsRes,r++,2,ev.fechaIni || '');
    putText(wsRes,r,1,'Fecha fin'); putText(wsRes,r++,2,ev.fechaFin || '');
    putText(wsRes,r,1,'Precio evento'); putMoney(wsRes,r++,2,Number(ev.precio||0));
    r += 1;
    const ingresosResumen = Number.isFinite(Number(budget?.ingresosDinero?.totalIngresado)) ? Number(budget.ingresosDinero.totalIngresado) : g.totalIncome;
    const donacionResumen = g.totalDon;
    const gastosResumen = g.totalExp;
    const saldoActualResumen = Number.isFinite(Number(budget?.operativa?.saldoActual)) ? Number(budget.operativa.saldoActual) : g.saldoActual;
    const saldoOperativoResumen = Number.isFinite(Number(budget?.operativa?.saldoOperativo)) ? Number(budget.operativa.saldoOperativo) : g.saldoOperativo;
    putText(wsRes,r,1,'Ingresos'); putMoney(wsRes,r++,2,ingresosResumen,'white',true);
    putText(wsRes,r,1,'Donación de producto'); putMoney(wsRes,r++,2,donacionResumen,'white',true);
    putText(wsRes,r,1,'Gastos'); putMoney(wsRes,r++,2,gastosResumen,'white',true);
    putText(wsRes,r,1,'Saldo actual'); putMoney(wsRes,r++,2,saldoActualResumen,saldoActualResumen>=0?'ok':'bad',true);
    putText(wsRes,r,1,'Saldo operativo'); putMoney(wsRes,r++,2,saldoOperativoResumen,saldoOperativoResumen>=0?'ok':'bad',true);
    r += 7;
    mergeTitle(wsRes, r++, 'GRÁFICAS DE CÁLCULOS POR AGRUPACIÓN', 7);
    r += 2;
    putText(wsRes, r, 1, 'Por segmento', 'white', true); r += 1;
    const segImgHeight = 430;
    addImage(wsRes, await makeGroupingChartImageV171('segmento'), r, 1, 1180, segImgHeight);
    r = reserveImageRows(wsRes, r, segImgHeight, 4);
    putText(wsRes, r, 1, 'Por destino', 'white', true); r += 1;
    const destImgHeight = 430;
    addImage(wsRes, await makeGroupingChartImageV171('destino'), r, 1, 1180, destImgHeight);
    reserveImageRows(wsRes, r, destImgHeight, 0);

    const wsIng = baseSheet('INGRESOS', [28,10,16,14,15,17,15,15]);
    mergeTitle(wsIng,1,'INGRESOS',8); titleRow(wsIng,3,['Nombre','Número','Situación','Rango','Importe socio','Importe voluntario','Total','Pendiente']);
    r=4; let totalSocioIng=0, totalVolIng=0, totalIng=0, totalPend=0;
    collabs.forEach(it=>{
      const persona=it.persona||personByIdV171(it.personaId);
      const numero=Number(it.numero||0);
      const nombrePersona = persona.nombre || '';
      const rangoPersona = String(persona.rango || '').trim().toUpperCase();
      const importeSocio = rangoPersona === 'SOCIO' ? numero * Number(ev.precio || 0) : 0;
      const importeVoluntario=Number(it.importe||0);
      const total=importeSocio+importeVoluntario;
      const pendiente=it.situacion==='Pendiente'?total:0;
      const normNombre = String(nombrePersona).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
      const isDevIngresos = normNombre === 'Z_DEV_INGRESOS' || normNombre === 'DEVOLUCIONES';
      const isPenaArrastre = normNombre === 'PENA EL ARRASTRE' || normNombre.includes('PENA EL ARRASTRE');
      const specialFill = isDevIngresos ? 'refund' : (isPenaArrastre ? 'greenSoft' : 'white');
      const nameCell = putText(wsIng,r,1,nombrePersona, specialFill);
      if(isDevIngresos){
        addCellNote(nameCell, 'Este importe se corresponde con el dinero devuelto a personas\nque pagan el evento pero se les exime del pago.\nSe meten primero como que pagan\ny después se les devuelve.');
      }
      if(isPenaArrastre){
        addCellNote(nameCell, 'Dinero que se saca de la cuenta de la peña\npara contribuir al pago de este evento.\nFijarte en el importe de la celda Total:\nal ser PERSONA SOCIO, parte aparece como importe socio\ny el resto como Importe voluntario.');
      }
      putNum(wsIng,r,2,numero, specialFill); putText(wsIng,r,3,it.situacion||'', specialFill); putText(wsIng,r,4,persona.rango||'', specialFill);
      putMoney(wsIng,r,5,importeSocio, specialFill); putMoney(wsIng,r,6,importeVoluntario, specialFill); putMoney(wsIng,r,7,total, specialFill); putMoney(wsIng,r,8,pendiente, isDevIngresos ? 'refund' : (pendiente?'warn':'white'));
      totalSocioIng += importeSocio; totalVolIng += importeVoluntario; totalIng += total; totalPend += pendiente; r++;
    });
    titleRow(wsIng,r,['TOTAL','','','','','','','']); putMoney(wsIng,r,5,totalSocioIng,'white',true); putMoney(wsIng,r,6,totalVolIng,'white',true); putMoney(wsIng,r,7,totalIng,'white',true); putMoney(wsIng,r,8,totalPend,'warn',true);

    const wsCom = baseSheet('COMPRAS Y OTROS GASTOS', [14,24,9,11,12,16,18,18,12]);
    mergeTitle(wsCom,1,'COMPRAS Y OTROS GASTOS',9); titleRow(wsCom,3,['Segmento','Producto','Unidades','Precio','Importe','Ticket/Otros gastos','Tienda','Responsable','Estado']);
    r=4; let totalCom=0;
    comprasSolo.forEach(it=>{ const val=valueCompraV171(it); const pending=normV171(it.ticketDonacion)===''; putText(wsCom,r,1,productSegmentV171(it),pending?'warn':'white'); putText(wsCom,r,2,productNameV171(it),pending?'warn':'white'); putNum(wsCom,r,3,it.unidades||0,pending?'warn':'white'); putMoney(wsCom,r,4,it.precio ?? productByIdV171(it.productoId).precio ?? 0,pending?'warn':'white'); putMoney(wsCom,r,5,val,pending?'warn':'white'); putText(wsCom,r,6,normV171(it.ticketDonacion)||'Pte.Compra u otros gastos',pending?'warn':'white'); putText(wsCom,r,7,storeNameV171(it)||'Sin tienda',pending?'warn':'white'); putText(wsCom,r,8,personByIdV171(it.responsableId).nombre||'',pending?'warn':'white'); putText(wsCom,r,9,pending?'PENDIENTE':'OK',pending?'warn':'white'); totalCom += val; r++; });
    titleRow(wsCom,r,['TOTAL','','','','','','','','']); putMoney(wsCom,r,5,totalCom,'white',true);

    const wsDon = baseSheet('DONACIONES DE PRODUCTO', [14,24,9,11,12,16,20,18]);
    mergeTitle(wsDon,1,'DONACIONES DE PRODUCTO',8); titleRow(wsDon,3,['Segmento','Producto','Unidades','Precio','Importe','Tipo donación','Donante','Responsable']);
    r=4; let totalDon=0;
    donacionesSolo.forEach(it=>{ const val=valueCompraV171(it); const donor=resolveDonorNameV171(it)||'Sin donante'; putText(wsDon,r,1,productSegmentV171(it)); putText(wsDon,r,2,productNameV171(it)); putNum(wsDon,r,3,it.unidades||0); putMoney(wsDon,r,4,it.precio ?? productByIdV171(it.productoId).precio ?? 0); putMoney(wsDon,r,5,val); putText(wsDon,r,6,it.ticketDonacion||''); putText(wsDon,r,7,donor); putText(wsDon,r,8,personByIdV171(it.responsableId).nombre||''); totalDon += val; r++; });
    titleRow(wsDon,r,['TOTAL','','','','','','','']); putMoney(wsDon,r,5,totalDon,'white',true);

    function writeGroupingSheet(name, title, rows){
      const ws = baseSheet(name, [34,18,18,26,18]);
      mergeTitle(ws,1,title,5); titleRow(ws,3,[title.includes('DESTINO')?'Destino':'Segmento','Comprado','Donado','Pte. Compra u otros gastos','TOTAL']);
      let rr=4, c=0,d=0,p=0,t=0;
      rows.forEach(it=>{ putText(ws,rr,1,it.label||''); putMoney(ws,rr,2,it.comprado||0); putMoney(ws,rr,3,it.donado||0); putMoney(ws,rr,4,it.pendiente||0, it.pendiente?'warn':'white'); putMoney(ws,rr,5,it.total||0); c+=Number(it.comprado||0); d+=Number(it.donado||0); p+=Number(it.pendiente||0); t+=Number(it.total||0); rr++; });
      titleRow(ws,rr,['TOTAL GENERAL','','','','']); putMoney(ws,rr,2,c,'white',true); putMoney(ws,rr,3,d,'white',true); putMoney(ws,rr,4,p,p?'warn':'white',true); putMoney(ws,rr,5,t,'white',true);
      return ws;
    }
    writeGroupingSheet('CALCULOS_SEGMENTO','CÁLCULOS SEGMENTO',segRows);
    writeGroupingSheet('CALCULOS_DESTINO','CÁLCULOS DESTINO',destRows);

    const wsTT = baseSheet('CALCULOS_TIENDA_TICKET', [56,16,42]);
    mergeTitle(wsTT,1,'CÁLCULOS TIENDA Y TICKET',3); titleRow(wsTT,3,['Concepto','Importe','Imagen']);
    r=4; let tt=0;
    tiendaRows.forEach(it=>{
      putText(wsTT,r,1,it.label||it.k||'',it.pending?'warn':'white');
      putMoney(wsTT,r,2,it.v,it.pending?'warn':'white');
      if(it.image){ putText(wsTT,r,3,''); addImage(wsTT,it.image,r,3,210,122); wsTT.getRow(r).height=100; }
      else { putText(wsTT,r,3,'Sin imagen',it.pending?'warn':'white'); }
      tt += Number(it.v||0); r++;
    });
    titleRow(wsTT,r,['TOTAL','','']); putMoney(wsTT,r,2,tt,'white',true); putText(wsTT,r,3,'');

    const wsGraf = baseSheet('GRAFICAS', [30,30,30,30,30,30]);
    mergeTitle(wsGraf,1,'GRÁFICAS DEL EVENTO',6);
    addImage(wsGraf, await makeChartImageDataUrlV171(), 3, 1, 1420, 625);
    wsGraf.getRow(3).height = 470;

    for(const ws of wb.worksheets){ autoFitSheetV171(ws, 11, 78); }
    const forceWidthsV180 = (ws, widths) => widths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });
    forceWidthsV180(wsIng, [28,10,16,14,15,17,15,15]);
    forceWidthsV180(wsCom, [14,24,9,11,12,16,18,18,12]);
    forceWidthsV180(wsDon, [14,24,9,11,12,16,20,18]);
    forceWidthsV180(wsTT, [56,16,42]);
    wsRes.getColumn(1).width = 30;
    wsRes.getColumn(2).width = 42;
    wsRes.getColumn(3).width = 18;
    wsRes.getColumn(4).width = 18;
    wsRes.getColumn(5).width = 18;
    for(let cc=6; cc<=7; cc++) wsRes.getColumn(cc).width = Math.max(wsRes.getColumn(cc).width, 18);
    wsGraf.columns.forEach(c => c.width = 30);
    for(const ws of wb.worksheets) await protectSheetV171(ws);

    const buffer = await wb.xlsx.writeBuffer();
    const finalBuffer = await hardenWorkbookBufferV171(buffer);
    const blob = new Blob([finalBuffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileNameV171(ev);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  window.exportExcel = exportExcel = exportExcelV171;

  function refreshVersionV171(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  refreshVersionV171();
  window.addEventListener('load', () => {
    refreshVersionV171();
    try{ if(typeof render === 'function') render(); }catch(_){ }
  });
})();
