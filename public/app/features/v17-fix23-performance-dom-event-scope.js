/* ControlEvent v22_prod FIX23 - rendimiento real:
   - evita cargas /api/state globales sin evento (boot ligero)
   - reduce DOM de Compras/Donaciones: filas compactas y edición bajo demanda
   - no cambia cálculos, fotos, permisos ni versión visible. */
(function(){
  'use strict';
  if(window.__ceV17Fix23PerformanceDomEventScope) return;
  window.__ceV17Fix23PerformanceDomEventScope = true;

  const PURCHASE_TICKETS = ['', 'GASTOS CORRIENTES', ...Array.from({length:30}, (_,i)=>'TK'+String(i+1).padStart(2,'0'))];
  const DONATION_TICKETS = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  const $ = id => document.getElementById(id);
  const txt = v => String(v == null ? '' : v).trim();
  const esc = v => String(v == null ? '' : v)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(Number(v||0)); }catch(_){}
    return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  };
  const euroInput = v => Number(v||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €';
  const st = () => { try{ return window.state || window.ControlEventApp?.state || {}; }catch(_){ return window.state || {}; } };
  const arr = name => Array.isArray(st()[name]) ? st()[name] : [];
  const selectedId = () => txt(st().selectedEventId || $('selectedEvent')?.value || '');
  const isDonation = v => /^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(txt(v));
  const selectedEvent = () => arr('eventos').find(e => txt(e.id) === selectedId()) || null;
  const canWrite = () => {
    const u = window.authUser || window.ControlEventApp?.authUser || null;
    const role = txt(u && u.nivel).toUpperCase();
    if(!['RW','GD'].includes(role)) return false;
    const ev = selectedEvent();
    if(txt(ev?.situacion).toUpperCase() === 'FINALIZADO' && role !== 'GD') return false;
    return true;
  };
  const byId = (name,id) => arr(name).find(x => txt(x.id) === txt(id)) || null;
  const productFor = id => byId('productos', id);
  const storeFor = id => byId('tiendas', id);
  const personFor = id => byId('personas', id);
  const productStore = p => storeFor(p?.tiendaId || p?.tienda_id || '');
  const eventProducts = () => {
    const ev = selectedId();
    const scoped = arr('productos').filter(p => !ev || txt(p.eventId || p.event_id) === ev);
    return (scoped.length ? scoped : arr('productos')).slice().sort((a,b)=>txt(a.nombre).localeCompare(txt(b.nombre),'es'));
  };
  const eventPeople = () => {
    const ev = selectedId();
    const scoped = arr('personas').filter(p => !ev || txt(p.eventId || p.event_id) === ev);
    return (scoped.length ? scoped : arr('personas')).slice().sort((a,b)=>txt(a.nombre).localeCompare(txt(b.nombre),'es'));
  };
  const eventStores = () => {
    const ev = selectedId();
    const scoped = arr('tiendas').filter(t => !ev || txt(t.eventId || t.event_id) === ev);
    return (scoped.length ? scoped : arr('tiendas')).slice().sort((a,b)=>txt(a.nombre).localeCompare(txt(b.nombre),'es'));
  };
  const socios = () => eventPeople().filter(p => txt(p.rango).toUpperCase() === 'SOCIO');
  function donorOptions(){
    const out = [], seen = new Set();
    function add(value,label){ const key = txt(label).toLowerCase(); if(!label || seen.has(key)) return; seen.add(key); out.push({value,label}); }
    eventPeople().forEach(p => add('P:'+p.id, txt(p.nombre)));
    eventStores().forEach(t => add('T:'+t.id, txt(t.nombre)));
    return out.sort((a,b)=>a.label.localeCompare(b.label,'es'));
  }
  function compraRows(){
    const ev = selectedId();
    let rows = [];
    try{ if(typeof window.comprasForEvent === 'function') rows = window.comprasForEvent().slice(); }catch(_){}
    if(!rows.length){
      rows = arr('compras').filter(c => txt(c.eventId || c.event_id) === ev).map(c => {
        const producto = productFor(c.productoId || c.producto_id);
        const tienda = storeFor(c.tiendaId || c.tienda_id || producto?.tiendaId || producto?.tienda_id || '');
        const precio = Number(c.precio ?? producto?.precio ?? 0);
        const unidades = Number(c.unidades || 0);
        const valor = precio * unidades;
        return {...c, producto, tienda, precioCalc: precio, valor, importe: isDonation(c.ticketDonacion) ? 0 : valor, responsable: personFor(c.responsableId || c.responsable_id || '')};
      });
    }
    return rows.map(r => {
      const producto = r.producto || productFor(r.productoId || r.producto_id) || {};
      const tienda = r.tienda || storeFor(r.tiendaId || r.tienda_id || producto?.tiendaId || producto?.tienda_id || '') || {};
      const precio = Number(r.precio ?? r.precioCalc ?? producto?.precio ?? 0);
      const unidades = Number(r.unidades || 0);
      const valor = Number(r.valor ?? (precio * unidades));
      return {...r, producto, tienda, precioCalc: precio, valor, importe: isDonation(r.ticketDonacion) ? 0 : valor, responsable: r.responsable || personFor(r.responsableId || r.responsable_id || '')};
    });
  }
  function sortRows(rows){
    const mode = txt(st().comprasSort || 'producto');
    const prod = r => txt(r.producto?.nombre);
    const resp = r => txt(r.responsable?.nombre);
    const tick = r => txt(r.ticketDonacion);
    const store = r => txt(r.tienda?.nombre);
    rows.sort((a,b)=>{
      if(mode === 'ticket'){
        const t = tick(a).localeCompare(tick(b),'es'); if(t) return t;
        const s = store(a).localeCompare(store(b),'es'); if(s) return s;
        return prod(a).localeCompare(prod(b),'es');
      }
      if(mode === 'responsable'){
        const r = resp(a).localeCompare(resp(b),'es'); if(r) return r;
        return prod(a).localeCompare(prod(b),'es');
      }
      const p = prod(a).localeCompare(prod(b),'es'); if(p) return p;
      const s = store(a).localeCompare(store(b),'es'); if(s) return s;
      return tick(a).localeCompare(tick(b),'es');
    });
    return rows;
  }
  function optionsHtml(items, selected, labelFn, valueFn){
    return items.map(item => {
      const value = txt(valueFn ? valueFn(item) : item.id);
      return `<option value="${esc(value)}" ${value===txt(selected)?'selected':''}>${esc(labelFn ? labelFn(item) : item.nombre)}</option>`;
    }).join('');
  }
  function ticketOptionsHtml(kind, selected){
    const opts = kind === 'donacion' ? DONATION_TICKETS : PURCHASE_TICKETS;
    return opts.map(v => `<option value="${esc(v)}" ${v===txt(selected)?'selected':''}>${v === '' ? '-- Pte.Compra u otros gastos --' : esc(v)}</option>`).join('');
  }

  function ensureFix41CompactStyles(){
    if(document.getElementById('ceFix41CompactMetaStyles')) return;
    const stl=document.createElement('style');
    stl.id='ceFix41CompactMetaStyles';
    stl.textContent='.ce-fix23-meta{display:flex!important;gap:6px!important;align-items:center!important;flex-wrap:wrap!important}.ce-fix23-meta span{display:inline-flex!important;align-items:center!important}.ce-fix23-store,.ce-fix23-donor{color:#15803d!important;font-weight:900!important}.ce-fix23-ticket{color:#111827!important;font-weight:900!important}.ce-fix23-ticket-pending{color:#dc2626!important}.ce-fix23-bresp{color:#1d4ed8!important;font-weight:900!important}.ce-fix23-resp{color:#111827!important;font-weight:900!important}.ce-fix23-dtype{color:#1d4ed8!important;font-weight:900!important}.ce-fix23-qtyline{margin-top:3px!important;font-size:12px!important;color:#475569!important;display:flex!important;gap:10px!important;flex-wrap:wrap!important}.ce-fix23-qtyline span{white-space:nowrap!important}.ce-fix23-compact-text{min-width:0!important}';
    document.head.appendChild(stl);
  }
  ensureFix41CompactStyles();
  function donorHuman(ref){
    const raw = txt(ref);
    if(!raw) return '';
    const m = raw.match(/^([PT])\s*[:\-]\s*(.+)$/i);
    if(m){
      const id = txt(m[2]);
      return m[1].toUpperCase() === 'T' ? txt(storeFor(id)?.nombre) || raw : txt(personFor(id)?.nombre) || raw;
    }
    return raw;
  }
  function compactInfo(r, kind){
    const producto = txt(r.producto?.nombre) || 'Producto sin nombre';
    const tienda = txt(r.tienda?.nombre) || 'Sin tienda';
    const tk = txt(r.ticketDonacion) || 'Pte.Compra u otros gastos';
    const responsable = txt(r.responsable?.nombre) || 'Sin responsable';
    const don = donorHuman(r.donorRef || r.donante || '');
    const unidades = Number(r.unidades || 0);
    const precio = Number(r.precio ?? r.precioCalc ?? r.producto?.precio ?? 0);
    const amount = kind === 'donacion' ? Number(r.valor ?? (unidades * precio)) : Number(r.importe ?? (unidades * precio));
    return {producto, tienda, tk, responsable, don, unidades, precio, amount};
  }
  function metaSpan(cls, label){ return label ? `<span class="${cls}">${esc(label)}</span>` : ''; }
  function renderCompactCard(r, kind){
    const i = compactInfo(r, kind);
    const pending = kind !== 'donacion' && !txt(r.ticketDonacion);
    const writable = canWrite();
    const qtyLine = `<div class="ce-fix23-qtyline"><span>Unid. ${esc(String(i.unidades).replace('.',','))}</span><span>Precio ${esc(money(i.precio))}</span><span>${kind==='donacion'?'Valor':'Importe'} ${esc(money(i.amount))}</span></div>`;
    const meta = kind === 'donacion'
      ? `<div class="ce-fix23-meta">${metaSpan('ce-fix23-donor', i.don || i.tienda)}${metaSpan('ce-fix23-resp', i.responsable)}${metaSpan('ce-fix23-dtype', i.tk)}</div>`
      : `<div class="ce-fix23-meta">${metaSpan('ce-fix23-store', i.tienda)}${metaSpan(pending?'ce-fix23-ticket ce-fix23-ticket-pending':'ce-fix23-ticket', i.tk)}${metaSpan('ce-fix23-bresp', i.responsable)}</div>`;
    return `<div class="itemcard ce-fix23-compact-row ${pending?'red-row':''}" id="compraRow_${esc(r.id)}" data-ce-fix23-kind="${kind}" data-id="${esc(r.id)}">
      <div class="ce-fix23-compact-main">
        <div class="ce-fix23-compact-text">
          <div class="ce-fix23-title">${esc(i.producto)}</div>
          ${meta}
          ${qtyLine}
        </div>
        <div class="ce-fix23-amount">${money(i.amount)}</div>
        <div class="ce-fix23-actions">
          ${writable ? `<button type="button" class="outline small" data-action="ce-fix23-edit-compra" data-kind="${kind}" data-id="${esc(r.id)}">Editar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${esc(r.id)}">Eliminar</button>` : ''}
        </div>
      </div>
    </div>`;
  }
  function renderEditCard(r, kind){
    const producto = r.producto || {};
    const tiendaId = txt(r.tiendaId || r.tienda_id || r.tienda?.id || producto?.tiendaId || producto?.tienda_id || '');
    const responsableId = txt(r.responsableId || r.responsable_id || '');
    const precio = Number(r.precio ?? r.precioCalc ?? producto.precio ?? 0);
    const amount = kind === 'donacion' ? r.valor : r.importe;
    return `<div class="itemcard ce-fix23-edit-row ${kind !== 'donacion' && !txt(r.ticketDonacion)?'red-row':''}" id="compraRow_${esc(r.id)}" data-ce-fix23-kind="${kind}" data-id="${esc(r.id)}">
      <div class="rowline compra">
        <div class="field"><label>Producto</label><select data-action="edit-compra-producto" data-id="${esc(r.id)}">${optionsHtml(eventProducts(), r.productoId || r.producto_id, p => p.nombre, p => p.id)}</select></div>
        <div class="field"><label>Unidades</label><input type="number" min="0" step="0.01" value="${Number(r.unidades||0)}" data-action="edit-compra-unidades" data-id="${esc(r.id)}" /></div>
        <div class="field"><label>Precio</label><input class="money-text" type="text" value="${esc(euroInput(precio))}" data-action="edit-compra-precio" data-id="${esc(r.id)}" /></div>
        <div class="field"><label>${kind==='donacion'?'Valor':'Importe'}</label><input class="soft-readonly" readonly value="${esc(money(amount))}" /></div>
        <div class="field"><label>${kind==='donacion'?'Tipo donación':'Ticket u Otros gastos'}</label><select data-action="edit-compra-ticket" data-id="${esc(r.id)}">${ticketOptionsHtml(kind, r.ticketDonacion)}</select></div>
        <div class="field"><label>Tienda</label><select data-action="edit-compra-tienda" data-id="${esc(r.id)}"><option value="" ${!tiendaId?'selected':''}>-- elige tienda --</option>${optionsHtml(eventStores(), tiendaId, t => t.nombre, t => t.id)}</select></div>
        <div class="field"><label>Donante</label><select data-action="edit-compra-donante" data-id="${esc(r.id)}"><option value="" ${!txt(r.donorRef)?'selected':''}>-- sin donante --</option>${optionsHtml(donorOptions(), r.donorRef || '', d => d.label, d => d.value)}</select></div>
        <div class="field"><label>Responsable</label><select data-action="edit-compra-responsable" data-id="${esc(r.id)}"><option value="" ${!responsableId?'selected':''}>-- sin responsable --</option>${optionsHtml(socios(), responsableId, p => p.nombre, p => p.id)}</select></div>
        <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap"><button type="button" class="modify small" data-action="save-compra" data-id="${esc(r.id)}">Modificar</button><button type="button" class="outline small" data-action="ce-fix23-cancel-compra" data-kind="${kind}" data-id="${esc(r.id)}">Cancelar</button><button type="button" class="danger small" data-action="delete-compra" data-id="${esc(r.id)}">Eliminar</button></div>
      </div>
    </div>`;
  }
  function renderCompraKind(kind){
    const wrap = $(kind === 'donacion' ? 'donacionesList' : 'comprasList');
    if(!wrap) return;
    let rows = sortRows(compraRows().filter(r => kind === 'donacion' ? isDonation(r.ticketDonacion) : !isDonation(r.ticketDonacion)));
    const editId = txt(kind === 'donacion' ? window.__ceFix23EditDonacionId : window.__ceFix23EditCompraId);
    if(!rows.length){
      wrap.innerHTML = `<div class="empty">${kind === 'donacion' ? 'Todavía no hay donaciones de producto para este evento.' : 'Todavía no hay compras u otros gastos para este evento.'}</div>`;
      return;
    }
    const title = kind === 'donacion' ? 'Donaciones' : 'Compras';
    let html = `<div class="hint ce-fix23-hint">${title}: vista ligera. Ordenar por: <a href="#" data-action="ce-fix23-sort" data-sort="producto" data-kind="${kind}">Producto</a> · <a href="#" data-action="ce-fix23-sort" data-sort="ticket" data-kind="${kind}">Ticket</a> · <a href="#" data-action="ce-fix23-sort" data-sort="responsable" data-kind="${kind}">Responsable</a></div>`;
    html += rows.map(r => txt(r.id) === editId ? renderEditCard(r, kind) : renderCompactCard(r, kind)).join('');
    wrap.innerHTML = html;
  }
  function installCompactRenderers(){
    if(window.__ceV17Fix23CompactRenderersInstalled) return;
    window.__ceV17Fix23CompactRenderersInstalled = true;
    const rc = function(){ return renderCompraKind('compra'); };
    const rd = function(){ return renderCompraKind('donacion'); };
    try{ window.renderCompras = rc; }catch(_){}
    try{ window.renderDonaciones = rd; }catch(_){}
    try{ (0,eval)('renderCompras = window.renderCompras'); }catch(_){}
    try{ (0,eval)('renderDonaciones = window.renderDonaciones'); }catch(_){}
    try{ if(window.ControlEventApp?.actions){ window.ControlEventApp.actions.renderCompras = rc; window.ControlEventApp.actions.renderDonaciones = rd; } }catch(_){}
  }
  function installEventHandlers(){
    if(window.__ceV17Fix23HandlersInstalled) return;
    window.__ceV17Fix23HandlersInstalled = true;
    document.addEventListener('click', ev => {
      const t = ev.target?.closest?.('[data-action]');
      if(!t) return;
      const action = t.dataset.action;
      if(action === 'ce-fix23-edit-compra'){
        ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
        const kind = t.dataset.kind === 'donacion' ? 'donacion' : 'compra';
        if(kind === 'donacion') window.__ceFix23EditDonacionId = txt(t.dataset.id);
        else window.__ceFix23EditCompraId = txt(t.dataset.id);
        renderCompraKind(kind);
        return false;
      }
      if(action === 'ce-fix23-cancel-compra'){
        ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
        const kind = t.dataset.kind === 'donacion' ? 'donacion' : 'compra';
        if(kind === 'donacion') window.__ceFix23EditDonacionId = '';
        else window.__ceFix23EditCompraId = '';
        renderCompraKind(kind);
        return false;
      }
      if(action === 'ce-fix23-sort'){
        ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
        st().comprasSort = t.dataset.sort || 'producto';
        renderCompraKind(t.dataset.kind === 'donacion' ? 'donacion' : 'compra');
        return false;
      }
      if(action === 'save-compra'){
        // Tras guardar, el render normal vuelve a compactar. Cerramos la edición por seguridad.
        setTimeout(() => { window.__ceFix23EditCompraId=''; window.__ceFix23EditDonacionId=''; }, 0);
      }
    }, true);
  }
  function installFetchGuard(){
    if(window.__ceV17Fix23FetchGuardInstalled) return;
    if(typeof window.fetch !== 'function') return;
    window.__ceV17Fix23FetchGuardInstalled = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      try{
        const method = txt((init && init.method) || (input && input.method) || 'GET').toUpperCase() || 'GET';
        let raw = typeof input === 'string' ? input : (input && input.url) || '';
        if(method === 'GET' && raw){
          const u = new URL(raw, window.location.origin);
          if(u.pathname === '/api/state' && !u.searchParams.has('eventId') && !u.searchParams.has('event_id') && !u.searchParams.has('fullFallback')){
            const ev = selectedId();
            if(ev){ u.searchParams.set('eventId', ev); u.searchParams.set('scope','event'); u.searchParams.set('fix23','1'); }
            else { u.searchParams.set('boot','1'); u.searchParams.set('fix23','boot'); }
            const next = u.pathname + u.search;
            if(typeof input === 'string') input = next;
            else { try{ input = new Request(next, input); }catch(_){ input = next; } }
          }
        }
      }catch(_){}
      return nativeFetch(input, init);
    };
  }
  function installStyle(){
    if($('ceV17Fix23PerformanceStyle')) return;
    const s = document.createElement('style');
    s.id = 'ceV17Fix23PerformanceStyle';
    s.textContent = `
      .ce-fix23-compact-row{padding:8px 10px!important;}
      .ce-fix23-compact-main{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;align-items:center!important;gap:10px!important;}
      .ce-fix23-title{font-weight:900!important;color:#0f172a!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
      .ce-fix23-meta{font-size:12px!important;color:#64748b!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;margin-top:2px!important;}
      .ce-fix23-amount{font-weight:900!important;white-space:nowrap!important;color:#0f172a!important;}
      .ce-fix23-actions{display:flex!important;gap:6px!important;align-items:center!important;justify-content:flex-end!important;}
      .ce-fix23-edit-row{border:2px solid rgba(37,99,235,.25)!important;}
      .ce-fix23-hint{position:sticky!important;top:0!important;z-index:3!important;background:#fff!important;padding:4px 0!important;}
      @media(max-width:640px){
        .ce-fix23-compact-main{grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;gap:3px 8px!important;}
        .ce-fix23-compact-text{grid-column:1!important;grid-row:1 / 3!important;min-width:0!important;}
        .ce-fix23-title{font-size:12px!important;line-height:1.12!important;}
        .ce-fix23-meta{font-size:10.5px!important;line-height:1.1!important;}
        .ce-fix23-amount{grid-column:2!important;grid-row:1!important;font-size:11.5px!important;}
        .ce-fix23-actions{grid-column:2!important;grid-row:2!important;}
        .ce-fix23-actions button{font-size:10.5px!important;padding:4px 6px!important;min-height:26px!important;}
      }
    `;
    document.head.appendChild(s);
  }
  function clearEditingOnEvent(){ window.__ceFix23EditCompraId=''; window.__ceFix23EditDonacionId=''; }
  function run(){ installStyle(); installFetchGuard(); installCompactRenderers(); installEventHandlers(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true}); else run();
  window.addEventListener('controlevent:runtime-ready', () => setTimeout(run,0), true);
  window.addEventListener('controlevent:event-loaded', () => { clearEditingOnEvent(); setTimeout(run,0); }, true);
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') clearEditingOnEvent(); }, true);
  [100,500,1500].forEach(ms => setTimeout(run, ms));

  window.ControlEventFix23Performance = {version:'v22_prod_fix23_performance_dom_event_scope', run, renderCompras:()=>renderCompraKind('compra'), renderDonaciones:()=>renderCompraKind('donacion')};
})();
