/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #15. */
/* ==== V16.2 FIXES ==== */
(function(){
  const $ = id => document.getElementById(id);
  const esc = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const moneyF = v => typeof money === 'function' ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
  const euroF = v => typeof euroInputValue === 'function' ? euroInputValue(Number(v || 0)) : moneyF(v);
  const parseEuro = v => typeof parseEuroInput === 'function' ? parseEuroInput(v) : Number(v || 0);

  function setFoundV162(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target'), 2800);
  }

  function allPeopleV162(){ return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allProductsV162(){ return (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allStoresV162(){ return (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allSociosV162(){ return allPeopleV162().filter(p => String(p.rango || '').trim().toUpperCase() === 'SOCIO'); }
  function priceRefV162(p){ return Number((p && (p.defaultPrecio ?? p.precio)) || 0); }

  function donorNameV162(c){
    try{
      if(c?.donorLabel && String(c.donorLabel).trim()) return String(c.donorLabel).trim();
      if(c?.donorRef && String(c.donorRef).trim()){
        const raw = String(c.donorRef).trim();
        if(!raw.startsWith('P:') && !raw.startsWith('T:')) return raw;
        const [kind, id] = raw.split(':');
        if(kind === 'P') return (typeof personaById === 'function' ? personaById(id)?.nombre : '') || '';
        if(kind === 'T') return (typeof tiendaById === 'function' ? tiendaById(id)?.nombre : '') || '';
      }
      if(c?.tiendaId && typeof tiendaById === 'function'){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre) return t.nombre;
      }
      if(c?.tienda?.nombre) return c.tienda.nombre;
    }catch(_){ }
    return '';
  }

  function annotateRowsV162(){
    document.querySelectorAll('#collabList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-collab-persona"]');
      if(sel){ card.id = 'collabRow_' + sel.dataset.id; card.dataset.personaId = sel.value; }
    });
    document.querySelectorAll('#comprasList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-compra-producto"]');
      if(sel){ card.id = 'compraRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
    document.querySelectorAll('#donacionesList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-donacion-producto"]');
      if(sel){ card.id = 'donacionRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
  }

  const _renderColabsV162 = typeof renderColabs === 'function' ? renderColabs : null;
  renderColabs = function(){ if(_renderColabsV162) _renderColabsV162(); annotateRowsV162(); };

  const _renderComprasV162 = typeof renderCompras === 'function' ? renderCompras : null;
  renderCompras = function(){ if(_renderComprasV162) _renderComprasV162(); annotateRowsV162(); };

  renderDonaciones = function(){
    const wrap = $('donacionesList');
    if(!wrap) return;
    let rows = (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)).slice();
    const sorts = {
      producto:(a,b)=> (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es'),
      ticket:(a,b)=> String(a.ticketDonacion||'').localeCompare(String(b.ticketDonacion||''),'es'),
      donante:(a,b)=> donorNameV162(a).localeCompare(donorNameV162(b),'es'),
      responsable:(a,b)=> (a.responsable?.nombre||'').localeCompare((b.responsable?.nombre||''),'es')
    };
    rows.sort((a,b)=>{
      const fn = sorts[state.donacionesSort] || sorts.producto;
      const v = fn(a,b);
      return v !== 0 ? v : (a.producto?.nombre||'').localeCompare((b.producto?.nombre||''),'es');
    });
    if(!rows.length){ wrap.innerHTML = '<div class="empty">Todavía no hay donaciones de producto para este evento.</div>'; return; }

    const productos = allProductsV162();
    const socios = allSociosV162();
    const donors = (typeof donorOptions === 'function' ? donorOptions() : []).slice().sort((a,b)=>(a.label||'').localeCompare((b.label||''),'es'));
    wrap.innerHTML = '<div class="hint">Ordenar por: <a href="#" onclick="state.donacionesSort=\'producto\'; renderDonaciones(); return false;">Producto</a> · <a href="#" onclick="state.donacionesSort=\'ticket\'; renderDonaciones(); return false;">Tipo de donación</a> · <a href="#" onclick="state.donacionesSort=\'donante\'; renderDonaciones(); return false;">Donante</a> · <a href="#" onclick="state.donacionesSort=\'responsable\'; renderDonaciones(); return false;">Responsable</a></div>';
    rows.forEach(r => {
      const precioVal = Number(r.precio != null ? r.precio : (r.precioCalc != null ? r.precioCalc : priceRefV162(r.producto)));
      const valorVal = precioVal * Number(r.unidades || 0);
      const row = document.createElement('div');
      row.className = 'itemcard';
      row.id = 'donacionRow_' + r.id;
      row.dataset.productoId = r.productoId || '';
      row.innerHTML = `
        <div class="rowline compra">
          <div class="field"><label>Producto</label><select data-action="edit-donacion-producto" data-id="${r.id}">${productos.map(p => `<option value="${p.id}" ${p.id===r.productoId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-donacion-unidades" data-id="${r.id}" /></div>
          <div class="field"><label>Precio</label><input class="money-text" type="text" value="${euroF(precioVal)}" data-action="edit-donacion-precio" data-id="${r.id}" /></div>
          <div class="field"><label>Valor</label><input class="soft-readonly" readonly value="${moneyF(valorVal)}" /></div>
          <div class="field"><label>Tipo de donación</label><select data-action="edit-donacion-ticket" data-id="${r.id}">${DONATION_TICKET_OPTIONS.map(v => `<option value="${v}" ${v===r.ticketDonacion?'selected':''}>${esc(v)}</option>`).join('')}</select></div>
          <div class="field"><label>Donante</label><select data-action="edit-donacion-donante" data-id="${r.id}"><option value="" ${!r.donorRef?'selected':''}>-- elige donante --</option>${donors.map(d => `<option value="${d.value}" ${d.value===r.donorRef?'selected':''}>${esc(d.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Responsable</label><select data-action="edit-donacion-responsable" data-id="${r.id}"><option value="" ${!r.responsableId?'selected':''}>-- sin responsable --</option>${socios.map(p => `<option value="${p.id}" ${p.id===r.responsableId?'selected':''}>${esc(p.nombre)}</option>`).join('')}</select></div>
          <div style="display:flex;gap:8px;align-items:end"><button type="button" class="modify small" data-action="save-donacion" data-id="${r.id}">Modificar</button><button type="button" class="danger small" data-action="delete-donacion" data-id="${r.id}">Eliminar</button></div>
        </div>`;
      wrap.appendChild(row);
    });
    annotateRowsV162();
  };

  function jumpToExistingV162(section, id){
    if(!id) return false;
    if(section === 'ingresos'){
      const found = (typeof collabsForEvent === 'function' ? collabsForEvent() : []).find(r => r.personaId === id);
      if(!found) return false;
      currentMainTab = 'ingresos';
      render();
      setTimeout(() => setFoundV162($('collabRow_' + found.id)), 80);
      return true;
    }
    const rows = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    if(section === 'compras'){
      const found = rows.find(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && r.productoId === id);
      if(!found) return false;
      currentMainTab = 'compras';
      showComprasEvent = true;
      render();
      setTimeout(() => setFoundV162($('compraRow_' + found.id)), 80);
      return true;
    }
    if(section === 'donaciones'){
      const found = rows.find(r => typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion) && r.productoId === id);
      if(!found) return false;
      currentMainTab = 'donaciones';
      render();
      setTimeout(() => setFoundV162($('donacionRow_' + found.id)), 80);
      return true;
    }
    return false;
  }

  document.addEventListener('change', function(e){
    const t = e.target;
    if(!t || (typeof isLocked === 'function' && isLocked())) return;
    if(t.id === 'collabPersona' && jumpToExistingV162('ingresos', t.value)){ t.value = ''; e.preventDefault(); e.stopImmediatePropagation(); return; }
    if(false && t.id === 'buyProducto' && jumpToExistingV162('compras', t.value)){ t.value = ''; e.preventDefault(); e.stopImmediatePropagation(); return; }
    if(false && t.id === 'donProducto' && jumpToExistingV162('donaciones', t.value)){ t.value = ''; e.preventDefault(); e.stopImmediatePropagation(); return; }
  }, true);

  const _addDonationV162 = typeof addDonation === 'function' ? addDonation : null;
  addDonation = function(){
    if(!selectedEvent()) return;
    const productId = $('donProducto')?.value || '';
    if(!productId) return;
    if(false && jumpToExistingV162('donaciones', productId)) return;
    if(_addDonationV162) _addDonationV162();
    currentMainTab = 'donaciones';
    render();
  };

  const _addCompraV162 = typeof addCompra === 'function' ? addCompra : null;
  addCompra = function(){
    if(!selectedEvent()) return;
    const productId = $('buyProducto')?.value || '';
    if(!productId) return;
    if(false && jumpToExistingV162('compras', productId)) return;
    if(_addCompraV162) _addCompraV162();
    currentMainTab = 'compras';
    showComprasEvent = true;
    render();
  };

  const _addColabV162 = typeof addColab === 'function' ? addColab : null;
  addColab = function(){
    if(!selectedEvent()) return;
    const personaId = $('collabPersona')?.value || '';
    if(!personaId) return;
    if(jumpToExistingV162('ingresos', personaId)) return;
    if(_addColabV162) _addColabV162();
    currentMainTab = 'ingresos';
    render();
  };

  renderMaintenanceTabs = function(){
    const tabs = [
      ['personas','mtPersonas','mtPersonasBtn'],
      ['eventos','mtEventos','mtEventosBtn'],
      ['tiendas','mtTiendas','mtTiendasBtn'],
      ['productos','mtProductos','mtProductosBtn'],
      ['importar','mtImportar','btnOpenImport'],
      ['acceso','mtAcceso','mtAccesoBtn']
    ];
    tabs.forEach(([key, cardId, btnId]) => {
      const card = $(cardId), btn = $(btnId);
      if(card) card.classList.toggle('hidden', currentMaintTab !== key || (key === 'acceso' && !(typeof isGodRole === 'function' && isGodRole())));
      if(btn) btn.classList.toggle('active', currentMaintTab === key);
    });
  };

  document.addEventListener('click', function(e){
    const btn = e.target.closest('button');
    if(!btn) return;
    const map = {mtPersonasBtn:'personas', mtEventosBtn:'eventos', mtTiendasBtn:'tiendas', mtProductosBtn:'productos', btnOpenImport:'importar'};
    const tab = map[btn.id];
    if(!tab) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    currentMaintTab = tab;
    const wrapper = $('maintenanceWrapper');
    if(wrapper) wrapper.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ try{ renderMaintenanceTabs(); }catch(__){} }
    try{ renderPermissions(); renderLockState(); }catch(_){ }
  }, true);

  function groupBreakdownV162(kind){
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const keys = kind === 'segmento' ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS : []) : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS : []);
    return keys.map(k => {
      const match = c => String(kind === 'segmento' ? (c.producto?.segmento || '') : (c.producto?.destino || '')) === k;
      const comprados = compras.filter(c => match(c) && !(typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion)) && !(typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(c.ticketDonacion)) && String(c.ticketDonacion || '').trim() !== '');
      const donados = compras.filter(c => match(c) && typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion));
      const pendientes = compras.filter(c => match(c) && !(typeof isDonationTicket === 'function' && isDonationTicket(c.ticketDonacion)) && String(c.ticketDonacion || '').trim() === '');
      const comprado = comprados.reduce((a,b)=>a+Number(b.valor||0),0);
      const donado = donados.reduce((a,b)=>a+Number(b.valor||0),0);
      const pendiente = pendientes.reduce((a,b)=>a+Number(b.valor||0),0);
      return {
        label:k,
        comprado,
        donado,
        pendiente,
        total: comprado + donado + pendiente,
        listComprado: comprados.map(c => `${c.producto?.nombre || 'Producto'} — ${c.tienda?.nombre || ''} — ${c.ticketDonacion || ''} — ${moneyF(c.valor || 0)}`),
        listDonado: donados.map(c => `${donorNameV162(c) || 'Sin donante'} — ${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`),
        listPendiente: pendientes.map(c => `${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`)
      };
    });
  }
  summaryBySegmento = function(){ return groupBreakdownV162('segmento'); };
  summaryByDestino = function(){ return groupBreakdownV162('destino'); };

  const _renderSummaryListV162 = typeof renderSummaryList === 'function' ? renderSummaryList : null;
  renderSummaryList = function(targetId, rows){
    if(targetId === 'summarySegmento' || targetId === 'summaryDestino'){
      const wrap = $(targetId);
      if(!wrap) return;
      const card = wrap.closest('.summary-card');
      if(card) card.style.display = '';
      wrap.innerHTML = '';
      const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
      const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
      const title = targetId === 'summarySegmento' ? 'Por segmento' : 'Por destino';
      const head = document.createElement('div');
      head.className = 'vbars-wrap';
      head.innerHTML = `<div class="vbars-total">${title} – TOTAL GENERAL: ${esc(moneyF(totalGeneral))}</div><div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte. Compra u otros gastos</span></div>`;
      wrap.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'vbars-grid';
      rows.forEach(r => {
        const h1 = Math.max(8, (Number(r.comprado||0) / maxVal) * 170);
        const h2 = Math.max(8, (Number(r.donado||0) / maxVal) * 170);
        const h3 = Math.max(8, (Number(r.pendiente||0) / maxVal) * 170);
        const cardDiv = document.createElement('div');
        cardDiv.className = 'vbars-card';
        cardDiv.innerHTML = `
          <div class="vbars-title">${esc(r.label)} · ${esc(moneyF(r.total))}</div>
          <div class="vbars-chart">
            <div class="vbar-col" title="${esc((r.listComprado?.length ? r.listComprado.join('\n') : 'Sin productos'))}"><div class="vbar-value">${esc(moneyF(r.comprado))}</div><div class="vbar-stick" style="height:${h1}px;background:#dc2626"></div><div class="vbar-label">Comprado</div></div>
            <div class="vbar-col" title="${esc((r.listDonado?.length ? r.listDonado.join('\n') : 'Sin productos'))}"><div class="vbar-value">${esc(moneyF(r.donado))}</div><div class="vbar-stick" style="height:${h2}px;background:#f59e0b"></div><div class="vbar-label">Donado</div></div>
            <div class="vbar-col" title="${esc((r.listPendiente?.length ? r.listPendiente.join('\n') : 'Sin productos'))}"><div class="vbar-value">${esc(moneyF(r.pendiente))}</div><div class="vbar-stick" style="height:${h3}px;background:#fb7185"></div><div class="vbar-label">Pte. Compra u otros gastos</div></div>
          </div>`;
        grid.appendChild(cardDiv);
      });
      wrap.appendChild(grid);
      return;
    }
    if(_renderSummaryListV162) return _renderSummaryListV162(targetId, rows);
  };

  function linesIncomeV162(fn){ return (typeof collabsForEvent === 'function' ? collabsForEvent() : []).filter(fn).map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`); }
  function linesDonationV162(ticket){ return (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => String(r.ticketDonacion || '').trim() === ticket).map(r => `${donorNameV162(r) || 'Sin donante'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`); }
  function linesExpenseV162(fn){ return (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(fn).map(r => `${r.tienda?.nombre || 'Sin tienda'} — ${r.ticketDonacion || 'Pte.Compra u otros gastos'} — ${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`); }
  function segHtmlV162(value, maxVal, color, title){
    const w = (Math.max(0, Number(value || 0)) / maxVal) * 100;
    return `<div class="chart-seg" title="${esc(title)}" style="width:${w}%;background:${color};"></div>`;
  }
  function legendHtmlV162(items){
    return `<div class="chart-note" style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px">${items.filter(x => Number(x.value||0) !== 0).map(x => `<span><span class="legend-dot" style="background:${x.color}"></span>${esc(x.label)}: ${esc(moneyF(x.value))}</span>`).join('')}</div>`;
  }

  renderGraficas = function(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const sum = arr => arr.reduce((a,b)=>a+Number(b||0),0);
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#2563eb', lines:linesIncomeV162(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco')},
      {label:'Socios Bizum', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#16a34a', lines:linesIncomeV162(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum')},
      {label:'Socios Efectivo', value:sum(rows.filter(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#84cc16', lines:linesIncomeV162(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'No socios Banco', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco').map(r => r.total)), color:'#60a5fa', lines:linesIncomeV162(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco')},
      {label:'No socios Bizum', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum').map(r => r.total)), color:'#34d399', lines:linesIncomeV162(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum')},
      {label:'No socios Efectivo', value:sum(rows.filter(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo').map(r => r.total)), color:'#bef264', lines:linesIncomeV162(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo')},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r => r.situacion === 'Pendiente').map(r => r.total)), color:'#f59e0b', lines:linesIncomeV162(r => r.situacion === 'Pendiente')}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r => String(r.ticketDonacion||'').trim()==='DONADO TIENDA').map(r=>r.valor)), color:'#fcd34d', lines:linesDonationV162('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r => String(r.ticketDonacion||'').trim()==='DONADO SOCIO').map(r=>r.valor)), color:'#f59e0b', lines:linesDonationV162('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r => String(r.ticketDonacion||'').trim()==='DONADO OTROS').map(r=>r.valor)), color:'#b45309', lines:linesDonationV162('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && !(typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(r.ticketDonacion)) && String(r.ticketDonacion || '').trim() !== '').map(r=>r.valor)), color:'#dc2626', lines:linesExpenseV162(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && !(typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(r.ticketDonacion)) && String(r.ticketDonacion || '').trim() !== '')},
      {label:'Gastos corrientes', value:sum(compras.filter(r => typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(r.ticketDonacion)).map(r=>r.valor)), color:'#ef4444', lines:linesExpenseV162(r => typeof isCurrentExpenseTicket === 'function' && isCurrentExpenseTicket(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && String(r.ticketDonacion || '').trim() === '').map(r=>r.valor)), color:'#fb7185', lines:linesExpenseV162(r => !(typeof isDonationTicket === 'function' && isDonationTicket(r.ticketDonacion)) && String(r.ticketDonacion || '').trim() === '')}
    ];
    const totalIncome = incomeItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalDon = donationItems.reduce((a,b)=>a+Number(b.value||0),0);
    const totalExp = expenseItems.reduce((a,b)=>a+Number(b.value||0),0);
    const saldoActual = totalIncome - expenseItems.slice(0,2).reduce((a,b)=>a+Number(b.value||0),0);
    const saldoOperativo = totalIncome - totalExp;
    const saldoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), color:saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[`Saldo operativo: ${moneyF(saldoOperativo)}`]}];
    const maxVal = Math.max(1, totalIncome, totalDon, totalExp, Math.abs(saldoActual), Math.abs(saldoOperativo));
    function row(label, total, items){
      return `<div class="chart-row"><div class="chart-label">${esc(label)}: ${esc(moneyF(total))}</div><div><div class="chart-track">${items.map(it => segHtmlV162(it.value, maxVal, it.color, `${it.label}: ${moneyF(it.value)}\n${(it.lines && it.lines.length ? it.lines : ['Sin registros']).join('\n')}`)).join('')}</div>${legendHtmlV162(items)}</div></div>`;
    }
    wrap.innerHTML = `<div class="chart-shell"><div class="chart-bars">${row('INGRESOS', totalIncome, incomeItems)}${row('DONACIÓN DE PRODUCTO', totalDon, donationItems)}${row('GASTOS', totalExp, expenseItems)}${row('SALDO OPERATIVO', saldoOperativo, saldoItems)}</div></div>`;
  };

  const _renderBudgetV162 = typeof renderBudget === 'function' ? renderBudget : null;
  renderBudget = function(){ if(_renderBudgetV162) _renderBudgetV162(); };

  window.addEventListener('load', () => { try{ if(typeof render === 'function') render(); }catch(_){} });
})();
