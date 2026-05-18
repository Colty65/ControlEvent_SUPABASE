/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #14. */
/* ==== V16.2 REWORK ==== */
(function(){
  const $ = id => document.getElementById(id);
  const esc = v => typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? '');
  const moneyF = v => typeof money === 'function' ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
  const parseEuro = v => typeof parseEuroInput === 'function' ? parseEuroInput(v) : Number(v || 0);

  function setFound(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){}
    setTimeout(() => el.classList.remove('found-target'), 2400);
  }

  function donorDisplayName(c){
    try{
      if(c?.donorLabel && String(c.donorLabel).trim()) return String(c.donorLabel).trim();
      if(c?.donorRef && String(c.donorRef).trim()){
        const raw = String(c.donorRef).trim();
        if(!raw.startsWith('P:') && !raw.startsWith('T:')) return raw;
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(d && String(d).trim()) return String(d).trim();
        }
      }
      if(c?.tiendaId && typeof tiendaById === 'function'){
        const t = tiendaById(c.tiendaId);
        if(t?.nombre && String(t.nombre).trim()) return String(t.nombre).trim();
      }
      if(c?.tienda?.nombre && String(c.tienda.nombre).trim()) return String(c.tienda.nombre).trim();
    }catch(_){}
    return '';
  }

  function allPersons(){ return (typeof personasGenerales === 'function' ? personasGenerales() : (state.personas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allProducts(){ return (typeof productosGenerales === 'function' ? productosGenerales() : (state.productos || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }
  function allStores(){ return (typeof tiendasGenerales === 'function' ? tiendasGenerales() : (state.tiendas || [])).slice().sort((a,b)=>(a.nombre||'').localeCompare((b.nombre||''),'es')); }

  function injectSearch(listId, searchId, selector, getText){
    const wrap = $(listId);
    if(!wrap || wrap.querySelector('.maint-search')) return;
    const search = document.createElement('div');
    search.className = 'maint-search';
    search.innerHTML = `<div class="field"><label>Buscar por nombre</label><input id="${searchId}" placeholder="Escribe para buscar..." /></div><button type="button" class="outline small" id="${searchId}Btn">Buscar</button>`;
    wrap.prepend(search);
    const doSearch = () => {
      const q = String($(searchId)?.value || '').trim().toLowerCase();
      if(!q) return;
      const nodes = Array.from(wrap.querySelectorAll(selector));
      const found = nodes.find(n => String(getText(n) || '').toLowerCase().includes(q));
      if(found) setFound(found.closest('.itemcard') || found);
    };
    $(searchId + 'Btn')?.addEventListener('click', doSearch);
    $(searchId)?.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); doSearch(); } });
  }

  const _renderPersonas = typeof renderPersonas === 'function' ? renderPersonas : null;
  renderPersonas = function(){
    if(_renderPersonas) _renderPersonas();
    injectSearch('personasList', 'personaSearchInput', 'input[data-action="edit-persona-nombre"]', n => n.value);
  };

  const _renderTiendas = typeof renderTiendas === 'function' ? renderTiendas : null;
  renderTiendas = function(){
    if(_renderTiendas) _renderTiendas();
    injectSearch('tiendasList', 'tiendaSearchInput', 'input[data-action="edit-tienda-nombre"]', n => n.value);
  };

  const _renderProductos = typeof renderProductos === 'function' ? renderProductos : null;
  renderProductos = function(){
    if(_renderProductos) _renderProductos();
    injectSearch('productosList', 'productoSearchInput', 'input[data-action="edit-producto-nombre"]', n => n.value);
  };

  const _renderEventos = typeof renderEventos === 'function' ? renderEventos : null;
  renderEventos = function(){
    if(_renderEventos) _renderEventos();
    const newDesc = $('newEventoDescripcion');
    if(newDesc && newDesc.tagName === 'INPUT'){
      const ta = document.createElement('textarea');
      ta.id = 'newEventoDescripcion';
      ta.value = newDesc.value || '';
      ta.placeholder = newDesc.placeholder || '';
      newDesc.replaceWith(ta);
    }
    document.querySelectorAll('#eventosList input[data-action="edit-evento-descripcion"]').forEach(inp => {
      const ta = document.createElement('textarea');
      ta.dataset.action = inp.dataset.action;
      ta.dataset.id = inp.dataset.id;
      ta.value = inp.value || '';
      inp.replaceWith(ta);
    });
  };

  function annotateRows(){
    document.querySelectorAll('#comprasList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-compra-producto"]');
      if(sel){ card.id = 'compraRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
    document.querySelectorAll('#donacionesList .itemcard').forEach(card => {
      const sel = card.querySelector('select[data-action="edit-donacion-producto"]');
      if(sel){ card.id = 'donacionRow_' + sel.dataset.id; card.dataset.productoId = sel.value; }
    });
  }

  const _renderCompras = typeof renderCompras === 'function' ? renderCompras : null;
  renderCompras = function(){ if(_renderCompras) _renderCompras(); annotateRows(); };

  const _renderDonaciones = typeof renderDonaciones === 'function' ? renderDonaciones : null;
  renderDonaciones = function(){ if(_renderDonaciones) _renderDonaciones(); annotateRows(); };

  function jumpToExisting(section, productoId){
    if(!productoId) return false;
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    if(section === 'compras'){
      const found = compras.find(r => !isDonationTicket(r.ticketDonacion) && r.productoId === productoId);
      if(!found) return false;
      currentMainTab = 'compras';
      showComprasEvent = true;
      render();
      setTimeout(() => setFound($('compraRow_' + found.id)), 80);
      return true;
    }
    if(section === 'donaciones'){
      const found = compras.find(r => isDonationTicket(r.ticketDonacion) && r.productoId === productoId);
      if(!found) return false;
      currentMainTab = 'donaciones';
      showComprasEvent = false;
      render();
      setTimeout(() => setFound($('donacionRow_' + found.id)), 80);
      return true;
    }
    return false;
  }

  document.addEventListener('change', function(e){
    const t = e.target;
    if(!t) return;
    if(false && t.id === 'buyProducto'){
      if(jumpToExisting('compras', t.value)){
        t.value = '';
        e.stopImmediatePropagation();
        return;
      }
    }
    if(t.id === 'donProducto'){
      if(jumpToExisting('donaciones', t.value)){
        t.value = '';
        e.stopImmediatePropagation();
        return;
      }
    }
  }, true);

  function incomeLines(filterFn){
    const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : [];
    return rows.filter(filterFn).map(r => `${r.persona?.nombre || 'Sin nombre'} — ${moneyF(r.total || 0)}`);
  }

  const _renderIngresosSummary = typeof renderIngresosSummary === 'function' ? renderIngresosSummary : null;
  renderIngresosSummary = function(){
    if(_renderIngresosSummary) _renderIngresosSummary();
    const grid = $('ingresosSummaryGrid');
    if(!grid) return;
    Array.from(grid.children).forEach(div => {
      const label = div.querySelector('.label')?.textContent?.trim() || '';
      let lines = [];
      if(label === 'EFECTIVO') lines = incomeLines(r => r.situacion === 'Efectivo');
      else if(label === 'BANCO') lines = incomeLines(r => r.situacion === 'Banco');
      else if(label === 'BIZUM') lines = incomeLines(r => r.situacion === 'Bizum');
      else if(label === 'Pendiente') lines = incomeLines(r => r.situacion === 'Pendiente');
      else if(label === 'TOTAL INGRESOS') lines = incomeLines(() => true);
      div.title = lines.length ? lines.join('\n') : 'Sin registros';
    });
  };

  function groupBreakdownDetailed(kind){
    const compras = typeof comprasForEvent === 'function' ? comprasForEvent() : [];
    const keys = kind === 'segmento' ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS : []) : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS : []);
    return keys.map(k => {
      const match = c => String(kind === 'segmento' ? (c.producto?.segmento || '') : (c.producto?.destino || '')) === k;
      const comprados = compras.filter(c => match(c) && !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() !== '');
      const donados = compras.filter(c => match(c) && isDonationTicket(c.ticketDonacion));
      const pendientes = compras.filter(c => match(c) && !isDonationTicket(c.ticketDonacion) && String(c.ticketDonacion || '').trim() === '');
      return {
        label:k,
        comprado: comprados.reduce((a,b)=>a+Number(b.valor||0),0),
        donado: donados.reduce((a,b)=>a+Number(b.valor||0),0),
        pendiente: pendientes.reduce((a,b)=>a+Number(b.valor||0),0),
        total: 0,
        listComprado: comprados.map(c => `${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`),
        listDonado: donados.map(c => `${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`),
        listPendiente: pendientes.map(c => `${c.producto?.nombre || 'Producto'} — ${moneyF(c.valor || 0)}`)
      };
    }).map(r => ({...r, total: r.comprado + r.donado + r.pendiente}));
  }
  summaryBySegmento = function(){ return groupBreakdownDetailed('segmento'); };
  summaryByDestino = function(){ return groupBreakdownDetailed('destino'); };

  const _renderSummaryList = typeof renderSummaryList === 'function' ? renderSummaryList : null;
  renderSummaryList = function(targetId, rows){
    if(targetId === 'summarySegmento'){
      const wrap = $(targetId);
      if(!wrap) return;
      wrap.innerHTML = '';
      const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
      const totalGeneral = rows.reduce((a,b)=>a+Number(b.total||0),0);
      const head = document.createElement('div');
      head.className = 'vbars-wrap';
      head.innerHTML = `
        <div class="vbars-total">Por segmento – TOTAL GENERAL: ${esc(moneyF(totalGeneral))}</div>
        <div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte. Compra u otros gastos</span></div>
      `;
      wrap.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'vbars-grid';
      rows.forEach(r => {
        const h1 = Math.max(8, (Number(r.comprado||0) / maxVal) * 170);
        const h2 = Math.max(8, (Number(r.donado||0) / maxVal) * 170);
        const h3 = Math.max(8, (Number(r.pendiente||0) / maxVal) * 170);
        const card = document.createElement('div');
        card.className = 'vbars-card';
        card.innerHTML = `
          <div class="vbars-title">${esc(r.label)} · ${esc(moneyF(r.total))}</div>
          <div class="vbars-chart">
            <div class="vbar-col" title="${esc((r.listComprado.length ? r.listComprado.join('\n') : 'Sin productos'))}">
              <div class="vbar-value">${esc(moneyF(r.comprado))}</div>
              <div class="vbar-stick" style="height:${h1}px;background:#dc2626"></div>
              <div class="vbar-label">Comprado</div>
            </div>
            <div class="vbar-col" title="${esc((r.listDonado.length ? r.listDonado.join('\n') : 'Sin productos'))}">
              <div class="vbar-value">${esc(moneyF(r.donado))}</div>
              <div class="vbar-stick" style="height:${h2}px;background:#f59e0b"></div>
              <div class="vbar-label">Donado</div>
            </div>
            <div class="vbar-col" title="${esc((r.listPendiente.length ? r.listPendiente.join('\n') : 'Sin productos'))}">
              <div class="vbar-value">${esc(moneyF(r.pendiente))}</div>
              <div class="vbar-stick" style="height:${h3}px;background:#fb7185"></div>
              <div class="vbar-label">Pte. Compra u otros gastos</div>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
      const destinoCard = $('summaryDestino')?.closest('.summary-card');
      if(destinoCard) destinoCard.style.display = 'none';
      return;
    }
    if(targetId === 'summaryDestino'){
      const wrap = $(targetId);
      if(wrap) wrap.innerHTML = '';
      const destinoCard = wrap?.closest('.summary-card');
      if(destinoCard) destinoCard.style.display = 'none';
      return;
    }
    if(_renderSummaryList) return _renderSummaryList(targetId, rows);
  };

  const _renderGraficas = typeof renderGraficas === 'function' ? renderGraficas : null;
  renderGraficas = function(){
    if(_renderGraficas) _renderGraficas();
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    const g = typeof graphDataV160 === 'function' ? graphDataV160() : null;
    if(!g) return;
    const tracks = wrap.querySelectorAll('.chart-track');
    const incomeDetails = {
      'Socios Banco': incomeLines(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Banco'),
      'Socios Bizum': incomeLines(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Bizum'),
      'Socios Efectivo': incomeLines(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Efectivo'),
      'No socios Banco': incomeLines(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Banco'),
      'No socios Bizum': incomeLines(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Bizum'),
      'No socios Efectivo': incomeLines(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Efectivo'),
      'Pendiente de ingresar': incomeLines(r => r.situacion === 'Pendiente')
    };
    const donationDetails = {
      'Donado por tiendas': donationLines('DONADO TIENDA'),
      'Donado por socios': donationLines('DONADO SOCIO'),
      'Donado por no socios': donationLines('DONADO OTROS')
    };
    const expenseDetails = {
      'Gastado en TKxx': (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !isDonationTicket(r.ticketDonacion) && !isCurrentExpenseTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() !== '').map(r => `${r.producto?.nombre || 'Producto'} — ${r.ticketDonacion} — ${moneyF(r.valor || 0)}`),
      'Gastos corrientes': (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => isCurrentExpenseTicket(r.ticketDonacion)).map(r => `${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`),
      'Pte. Compra u otros gastos': (typeof comprasForEvent === 'function' ? comprasForEvent() : []).filter(r => !isDonationTicket(r.ticketDonacion) && String(r.ticketDonacion || '').trim() === '').map(r => `${r.producto?.nombre || 'Producto'} — ${moneyF(r.valor || 0)}`)
    };
    if(tracks[0]){
      const titles = ['Socios Banco','Socios Bizum','Socios Efectivo','No socios Banco','No socios Bizum','No socios Efectivo','Pendiente de ingresar'];
      Array.from(tracks[0].children).filter(n => n.classList?.contains('chart-seg')).forEach((seg, i) => {
        const key = titles[i];
        seg.title = `${key}: ${seg.title.split(': ').slice(-1)[0]}\n${(incomeDetails[key]||['Sin registros']).join('\n')}`;
      });
    }
    if(tracks[1]){
      const titles = ['Donado por tiendas','Donado por socios','Donado por no socios'];
      Array.from(tracks[1].children).filter(n => n.classList?.contains('chart-seg')).forEach((seg, i) => {
        const key = titles[i];
        seg.title = `${key}: ${seg.title.split(': ').slice(-1)[0]}\n${(donationDetails[key]||['Sin registros']).join('\n')}`;
      });
    }
    if(tracks[2]){
      const titles = ['Gastado en TKxx','Gastos corrientes','Pte. Compra u otros gastos'];
      Array.from(tracks[2].children).filter(n => n.classList?.contains('chart-seg')).forEach((seg, i) => {
        const key = titles[i];
        seg.title = `${key}: ${seg.title.split(': ').slice(-1)[0]}\n${(expenseDetails[key]||['Sin registros']).join('\n')}`;
      });
    }
  };

  window.addEventListener('load', () => {
    try{ if(typeof render === 'function') render(); }catch(_){}
  });
})();
