/* ControlEvent v9.5_prod - guardado inmediato, buscadores en compras/donaciones y nuevas gráficas. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v9.5_prod';
  const VERSION_FILE = 'ControlEvent_v9_5_prod';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).toUpperCase();
  const esc = v => {
    try{ return (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    catch(_){ return String(v ?? ''); }
  };
  const cssEsc = v => { try{ return window.CSS?.escape ? CSS.escape(String(v ?? '')) : String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v ?? '').replace(/"/g,'\\"'); } };
  const moneyF = v => {
    try{ return (typeof money === 'function') ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
    catch(_){ return `${Number(v||0).toFixed(2)} €`; }
  };
  const parseEuro = v => {
    try{ if(typeof parseEuroInput === 'function') return parseEuroInput(v); }catch(_){ }
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/[^0-9,.-]/g,'').trim();
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',','.');
    else if(s.includes(',')) s = s.replace(',','.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const st = () => { try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return window.state || {}; };
  const comprasRaw = () => { const s = st(); if(!Array.isArray(s.compras)) s.compras = []; return s.compras; };
  const isDonation = t => { try{ return typeof isDonationTicket === 'function' ? isDonationTicket(t) : ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(t)); }catch(_){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(t)); } };
  const isCurrentExpense = t => { try{ return typeof isCurrentExpenseTicket === 'function' ? isCurrentExpenseTicket(t) : up(t).includes('GASTOS CORRIENTES'); }catch(_){ return up(t).includes('GASTOS CORRIENTES'); } };
  const productName = id => { try{ return (typeof productoById === 'function' ? productoById(id) : (st().productos||[]).find(p => norm(p.id)===norm(id)))?.nombre || ''; }catch(_){ return ''; } };
  const personName = id => { try{ return (typeof personaById === 'function' ? personaById(id) : (st().personas||[]).find(p => norm(p.id)===norm(id)))?.nombre || ''; }catch(_){ return ''; } };
  const storeName = id => { try{ return (typeof tiendaById === 'function' ? tiendaById(id) : (st().tiendas||[]).find(t => norm(t.id)===norm(id)))?.nombre || ''; }catch(_){ return ''; } };
  function donorName(row){
    try{ if(row?.donorLabel && norm(row.donorLabel)) return norm(row.donorLabel); }catch(_){ }
    const raw = norm(row?.donorRef || '');
    try{ if(raw && typeof donorLabel === 'function'){ const d = norm(donorLabel(raw)); if(d) return d; } }catch(_){ }
    if(raw){
      const parts = raw.split(':');
      if(parts.length >= 2){
        const kind = up(parts[0]); const id = parts.slice(1).join(':');
        if(kind === 'P' || kind === 'PERSONA') return personName(id) || raw;
        if(kind === 'T' || kind === 'TIENDA') return storeName(id) || raw;
      }
      return personName(raw) || storeName(raw) || raw;
    }
    return storeName(row?.tiendaId) || norm(row?.tienda?.nombre || '');
  }
  function rowById(id){ return comprasRaw().find(x => norm(x?.id) === norm(id)) || null; }
  function productObj(id){ try{ return typeof productoById === 'function' ? productoById(id) : (st().productos||[]).find(p => norm(p.id)===norm(id)); }catch(_){ return null; } }
  function saveNow(){ try{ return typeof saveState === 'function' ? saveState() : window.saveState?.(); }catch(_){ } }
  function renderNow(){ try{ return typeof render === 'function' ? render() : window.render?.(); }catch(_){ } }
  function valueFor(action, id, scope, fallback=''){
    const sel = `[data-action="${cssEsc(action)}"][data-id="${cssEsc(id)}"]`;
    let el = null;
    try{ el = scope?.querySelector?.(sel) || null; }catch(_){ }
    try{ if(!el) el = Array.from(document.querySelectorAll(sel)).find(x => x.offsetWidth || x.offsetHeight || x.getClientRects().length) || document.querySelector(sel); }catch(_){ }
    if(!el) return fallback;
    if(el.type === 'checkbox') return el.checked ? (el.value || 'on') : '';
    return el.value ?? fallback;
  }

  function valueForAny(actions, id, scope, fallback=''){
    for(const action of actions){
      const value = valueFor(action, id, scope, undefined);
      if(value !== undefined) return value;
    }
    return fallback;
  }

  function scopeForButton(btn, id){
    return btn?.closest?.('.itemcard,.rowline,.card') || document.querySelector(`[data-id="${cssEsc(id)}"]`)?.closest?.('.itemcard,.rowline,.card') || null;
  }
  function duplicateCompra(productoId, tiendaId, ticket, excludeId){
    return comprasRaw().find(r => norm(r.id)!==norm(excludeId) && !isDonation(r.ticketDonacion || r.ticket) && norm(r.productoId)===norm(productoId) && norm(r.tiendaId)===norm(tiendaId) && norm(r.ticketDonacion || r.ticket)===norm(ticket)) || null;
  }
  function duplicateDonation(productoId, donorRef, excludeId){
    return comprasRaw().find(r => norm(r.id)!==norm(excludeId) && isDonation(r.ticketDonacion || r.ticket) && norm(r.productoId)===norm(productoId) && norm(r.donorRef)===norm(donorRef)) || null;
  }

  function applyFieldChange(el){
    const action = el?.getAttribute?.('data-action') || '';
    const id = el?.getAttribute?.('data-id') || '';
    if(!id || !/^edit-(compra|donacion)-/.test(action)) return false;
    const row = rowById(id); if(!row) return false;
    const scope = el.closest?.('.itemcard,.rowline,.card') || null;
    const donationContext = !!el.closest?.('#donacionesList') || /^edit-donacion-/.test(action) || isDonation(valueForAny(['edit-donacion-ticket','edit-compra-ticket'], id, scope, row.ticketDonacion || '')) || isDonation(row.ticketDonacion || '');
    if(action === 'edit-compra-producto' || action === 'edit-donacion-producto') row.productoId = el.value;
    if(action === 'edit-compra-unidades' || action === 'edit-donacion-unidades') row.unidades = Number(el.value || 0);
    if(action === 'edit-compra-ticket' || action === 'edit-donacion-ticket') row.ticketDonacion = el.value;
    if(action === 'edit-compra-donante' || action === 'edit-donacion-donante') row.donorRef = el.value;
    if(action === 'edit-compra-responsable' || action === 'edit-donacion-responsable') row.responsableId = el.value;
    if(action === 'edit-compra-tienda') row.tiendaId = el.value;
    if(action === 'edit-compra-precio' || action === 'edit-donacion-precio') row.precio = parseEuro(el.value || 0);
    if(donationContext && !row.donorRef) row.donorRef = valueForAny(['edit-donacion-donante','edit-compra-donante'], id, scope, row.donorRef || '');
    return true;
  }

  function saveCompraOrDonation(btn){
    const id = btn?.getAttribute?.('data-id') || '';
    const row = rowById(id);
    if(!row) return false;
    const scope = scopeForButton(btn, id);
    const donationContext = !!btn.closest?.('#donacionesList') || isDonation(row.ticketDonacion || '');
    if(donationContext){
      // En DONACIONES los campos reales son edit-donacion-*. Así el refresco visual sale bien a la primera.
      const ticket = valueForAny(['edit-donacion-ticket','edit-compra-ticket'], id, scope, row.ticketDonacion || '');
      const productoId = valueForAny(['edit-donacion-producto','edit-compra-producto'], id, scope, row.productoId || '');
      const unidades = Number(valueForAny(['edit-donacion-unidades','edit-compra-unidades'], id, scope, row.unidades || 0) || 0);
      const precio = parseEuro(valueForAny(['edit-donacion-precio','edit-compra-precio'], id, scope, row.precio || 0) || 0);
      const responsableId = valueForAny(['edit-donacion-responsable','edit-compra-responsable'], id, scope, row.responsableId || '');
      const donorRef = valueForAny(['edit-donacion-donante','edit-compra-donante'], id, scope, row.donorRef || '');
      row.productoId = productoId;
      row.unidades = Number.isFinite(unidades) ? unidades : 0;
      row.precio = Number.isFinite(precio) ? precio : 0;
      row.ticketDonacion = ticket;
      row.donorRef = donorRef;
      row.responsableId = responsableId;
      const p = productObj(productoId);
      if(p && Number.isFinite(precio)){ p.precio = precio; p.defaultPrecio = precio; }
      saveNow();
      try{ if(typeof renderDonaciones === 'function') renderDonaciones(); else window.renderDonaciones?.(); }catch(_){ renderNow(); }
      setTimeout(() => { try{ const card = document.getElementById('donacionRow_' + id); if(card) setFound(card); }catch(_){} }, 20);
      return true;
    }
    const ticket = valueFor('edit-compra-ticket', id, scope, row.ticketDonacion || '');
    const productoId = valueFor('edit-compra-producto', id, scope, row.productoId || '');
    const unidades = Number(valueFor('edit-compra-unidades', id, scope, row.unidades || 0) || 0);
    const precio = parseEuro(valueFor('edit-compra-precio', id, scope, row.precio || 0) || 0);
    const responsableId = valueFor('edit-compra-responsable', id, scope, row.responsableId || '');
    const donorRef = valueFor('edit-compra-donante', id, scope, row.donorRef || '');
    const tiendaId = valueFor('edit-compra-tienda', id, scope, row.tiendaId || '');
    row.productoId = productoId;
    row.unidades = Number.isFinite(unidades) ? unidades : 0;
    if(precio) row.precio = precio;
    row.ticketDonacion = ticket;
    row.tiendaId = tiendaId;
    row.donorRef = donorRef;
    row.responsableId = responsableId;
    const p = productObj(productoId);
    if(p && precio){ p.precio = precio; p.defaultPrecio = precio; }
    saveNow();
    renderNow();
    return true;
  }

  function injectStyle(){
    if($('ceV413Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV413Style';
    style.textContent = `
      body[data-ce-version="${VERSION}"] #tabResumen .summary-top-grid{display:none!important;}
      body[data-ce-version="${VERSION}"] #tabResumen .summary-card:has(#summarySegmento),
      body[data-ce-version="${VERSION}"] #tabResumen .summary-card:has(#summaryDestino){display:none!important;}
      .ce-v413-search{display:flex;gap:12px;align-items:end;margin:10px 0 14px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;}
      .ce-v413-search .field{flex:1;margin:0;}
      .ce-v413-search input{width:100%;}
      .ce-v413-chart-layout{display:grid;grid-template-columns:minmax(280px,1.05fr) minmax(280px,.95fr);gap:16px;align-items:start;}
      .ce-v413-chart-panel{border:1px solid #e5e7eb;border-radius:20px;background:#fff;padding:14px;box-shadow:0 8px 22px rgba(15,23,42,.06);}
      .ce-v413-panel-title{font-weight:950;color:#111827;margin:0 0 10px;display:flex;justify-content:space-between;gap:8px;align-items:center;}
      .ce-v413-pies{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
      .ce-v413-pie-card{border:1px solid #eef2f7;border-radius:18px;background:#f9fafb;padding:10px;}
      .ce-v413-pie-title{font-size:12px;font-weight:950;color:#334155;margin-bottom:6px;display:flex;justify-content:space-between;gap:6px;}
      .ce-v413-pie-svg{width:100%;max-width:170px;aspect-ratio:1;margin:0 auto 8px;display:block;}
      .ce-v413-pie-slice{cursor:pointer;stroke:#fff;stroke-width:.8px;transition:filter .12s ease;}
      .ce-v413-pie-slice:hover{filter:brightness(.96);}
      .ce-v413-legend{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:800;color:#334155;}
      .ce-v413-legend-row{display:flex;gap:6px;align-items:flex-start;cursor:pointer;border-radius:8px;padding:2px 3px;}
      .ce-v413-legend-row:hover{background:#eef2ff;}
      .ce-v413-dot{width:10px;height:10px;border-radius:999px;display:inline-block;flex:0 0 auto;margin-top:2px;}
      .ce-v413-destino-bars{display:grid;gap:10px;}
      .ce-v413-destino-card{border:1px solid #eef2f7;border-radius:16px;background:#f9fafb;padding:9px;}
      .ce-v413-destino-title{font-size:12px;font-weight:950;color:#334155;margin-bottom:7px;display:flex;justify-content:space-between;gap:8px;}
      .ce-v413-mini-bars{display:flex;align-items:flex-end;justify-content:center;gap:7px;min-height:150px;}
      .ce-v413-mini-col{width:32px;text-align:center;cursor:pointer;}
      .ce-v413-mini-value{font-size:10px;font-weight:900;color:#334155;writing-mode:vertical-rl;transform:rotate(180deg);margin:0 auto 4px;max-height:66px;overflow:hidden;}
      .ce-v413-mini-stick{width:16px;border-radius:8px 8px 0 0;margin:0 auto;min-height:5px;box-shadow:inset 0 -1px 0 rgba(0,0,0,.08);}
      .ce-v413-mini-label{font-size:9px;font-weight:900;color:#64748b;margin-top:4px;line-height:1.05;}
      @media(max-width:860px){.ce-v413-chart-layout{grid-template-columns:1fr}.ce-v413-pies{grid-template-columns:1fr}.ce-v413-search{flex-direction:column;align-items:stretch}.ce-v413-search button{width:100%;}}
    `;
    document.head.appendChild(style);
  }

  function setFound(el){
    if(!el) return;
    document.querySelectorAll('.found-target,.ce-v413-found').forEach(x => x.classList.remove('found-target','ce-v413-found'));
    el.classList.add('found-target','ce-v413-found');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target','ce-v413-found'), 3000);
  }
  function searchTextForCard(card){
    const parts = [];
    card.querySelectorAll('input,select,textarea').forEach(el => {
      if(el.tagName === 'SELECT') parts.push(el.options?.[el.selectedIndex]?.textContent || el.value || '');
      else parts.push(el.value || '');
    });
    parts.push(card.textContent || '');
    return parts.join(' ').toLowerCase();
  }
  function injectSearch(listId, inputId, label){
    const wrap = $(listId);
    if(!wrap || wrap.querySelector(`#${inputId}`) || wrap.querySelector('.empty')) return;
    const box = document.createElement('div');
    box.className = 'ce-v413-search maint-search';
    box.innerHTML = `<div class="field"><label>${esc(label)}</label><input id="${inputId}" type="search" placeholder="Escribe para buscar..." autocomplete="off" /></div><button type="button" class="outline small" id="${inputId}Btn">Buscar</button>`;
    wrap.prepend(box);
    const doSearch = () => {
      const q = norm($(inputId)?.value || '').toLowerCase();
      if(!q) return;
      const found = Array.from(wrap.querySelectorAll(':scope > .itemcard')).find(card => searchTextForCard(card).includes(q));
      if(found) setFound(found);
    };
    $(inputId+'Btn')?.addEventListener('click', doSearch);
    $(inputId)?.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); doSearch(); } });
  }
  function patchSearchRenderers(){
    const rc = (typeof renderCompras === 'function') ? renderCompras : window.renderCompras;
    if(rc && !rc.__ceV413Search){
      const wrapped = function(){ const ret = rc.apply(this, arguments); setTimeout(() => injectSearch('comprasList','comprasSearchInput','Buscar compra'), 0); return ret; };
      wrapped.__ceV413Search = true;
      try{ renderCompras = wrapped; }catch(_){ }
      window.renderCompras = wrapped;
    }
    const rd = (typeof renderDonaciones === 'function') ? renderDonaciones : window.renderDonaciones;
    if(rd && !rd.__ceV413Search){
      const wrapped = function(){ const ret = rd.apply(this, arguments); setTimeout(() => injectSearch('donacionesList','donacionesSearchInput','Buscar donación'), 0); return ret; };
      wrapped.__ceV413Search = true;
      try{ renderDonaciones = wrapped; }catch(_){ }
      window.renderDonaciones = wrapped;
    }
  }

  function hideOldGrouping(){
    try{
      const seg = $('summarySegmento')?.closest?.('.summary-card');
      const des = $('summaryDestino')?.closest?.('.summary-card');
      if(seg) seg.style.display = 'none';
      if(des) des.style.display = 'none';
      const grid = document.querySelector('#tabResumen .summary-top-grid');
      if(grid) grid.style.display = 'none';
      const title = Array.from(document.querySelectorAll('#tabResumen h2')).find(h => norm(h.textContent) === 'Cálculos por agrupación');
      if(title){
        const card = title.closest('.card');
        const hasOnlyTop = card?.querySelector('#summaryTiendaTicket') ? false : true;
        if(hasOnlyTop) card.style.display = 'none';
        const p = title.parentElement?.querySelector('p');
        title.textContent = 'Cálculos por tienda y ticket';
        if(p) p.textContent = 'Importes por tienda y ticket/donación/otros gastos.';
      }
      const mainTitle = Array.from(document.querySelectorAll('#tabResumen h2')).find(h => /Resumen presupuestario y cálculos/i.test(h.textContent||''));
      if(mainTitle) mainTitle.textContent = 'Resumen presupuestario';
    }catch(_){ }
  }

  function rowsForEvent(){
    try{ return (typeof collabsForEvent === 'function' ? collabsForEvent() : []).slice(); }catch(_){ return []; }
  }
  function buysForEvent(){
    try{ return (typeof comprasForEvent === 'function' ? comprasForEvent() : []).slice(); }catch(_){ return comprasRaw().filter(r => norm(r.eventId) === norm(st().selectedEventId)); }
  }
  function sum(list, field='value'){ return list.reduce((a,b)=>a+Number(field ? (b?.[field] || 0) : (b || 0)),0); }
  function incomeLines(fn){ return rowsForEvent().filter(fn).map(r => `${r.persona?.nombre || personName(r.personaId) || 'Sin nombre'} — ${moneyF(r.total || (Number(r.importe||0) + 0))}`); }
  function donationLines(ticket){ return buysForEvent().filter(r => norm(r.ticketDonacion) === ticket).map(r => `${donorName(r) || 'Sin donante'} — ${r.producto?.nombre || productName(r.productoId) || 'Producto'} — ${moneyF(r.valor || Number(r.precio||0)*Number(r.unidades||0))}`); }
  function expenseLines(fn){ return buysForEvent().filter(fn).map(r => `${r.tienda?.nombre || storeName(r.tiendaId) || 'Sin tienda'} — ${r.ticketDonacion || 'Pte.Compra'} — ${r.producto?.nombre || productName(r.productoId) || 'Producto'} — ${moneyF(r.valor || Number(r.precio||0)*Number(r.unidades||0))}`); }
  function chartParts(){
    const rows = rowsForEvent();
    const compras = buysForEvent();
    const v = r => Number(r.valor != null ? r.valor : Number(r.precio||0)*Number(r.unidades||0));
    const incomeItems = [
      {label:'Socios Banco', value:sum(rows.filter(r=>r.persona?.rango==='SOCIO' && r.situacion==='Banco').map(r=>r.total), null), color:'#2563eb', lines:incomeLines(r=>r.persona?.rango==='SOCIO' && r.situacion==='Banco')},
      {label:'Socios Bizum', value:sum(rows.filter(r=>r.persona?.rango==='SOCIO' && r.situacion==='Bizum').map(r=>r.total), null), color:'#16a34a', lines:incomeLines(r=>r.persona?.rango==='SOCIO' && r.situacion==='Bizum')},
      {label:'Socios Efectivo', value:sum(rows.filter(r=>r.persona?.rango==='SOCIO' && r.situacion==='Efectivo').map(r=>r.total), null), color:'#84cc16', lines:incomeLines(r=>r.persona?.rango==='SOCIO' && r.situacion==='Efectivo')},
      {label:'No socios Banco', value:sum(rows.filter(r=>r.persona?.rango!=='SOCIO' && r.situacion==='Banco').map(r=>r.total), null), color:'#60a5fa', lines:incomeLines(r=>r.persona?.rango!=='SOCIO' && r.situacion==='Banco')},
      {label:'No socios Bizum', value:sum(rows.filter(r=>r.persona?.rango!=='SOCIO' && r.situacion==='Bizum').map(r=>r.total), null), color:'#34d399', lines:incomeLines(r=>r.persona?.rango!=='SOCIO' && r.situacion==='Bizum')},
      {label:'No socios Efectivo', value:sum(rows.filter(r=>r.persona?.rango!=='SOCIO' && r.situacion==='Efectivo').map(r=>r.total), null), color:'#bef264', lines:incomeLines(r=>r.persona?.rango!=='SOCIO' && r.situacion==='Efectivo')},
      {label:'Pendiente de ingresar', value:sum(rows.filter(r=>r.situacion==='Pendiente').map(r=>r.total), null), color:'#f59e0b', lines:incomeLines(r=>r.situacion==='Pendiente')}
    ];
    const donationItems = [
      {label:'Donado por tiendas', value:sum(compras.filter(r=>norm(r.ticketDonacion)==='DONADO TIENDA').map(v), null), color:'#fcd34d', lines:donationLines('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r=>norm(r.ticketDonacion)==='DONADO SOCIO').map(v), null), color:'#f59e0b', lines:donationLines('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r=>norm(r.ticketDonacion)==='DONADO OTROS').map(v), null), color:'#b45309', lines:donationLines('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r=>!isDonation(r.ticketDonacion)&&!isCurrentExpense(r.ticketDonacion)&&norm(r.ticketDonacion)!=='').map(v), null), color:'#dc2626', lines:expenseLines(r=>!isDonation(r.ticketDonacion)&&!isCurrentExpense(r.ticketDonacion)&&norm(r.ticketDonacion)!=='')},
      {label:'Gastos corrientes', value:sum(compras.filter(r=>isCurrentExpense(r.ticketDonacion)).map(v), null), color:'#ef4444', lines:expenseLines(r=>isCurrentExpense(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r=>!isDonation(r.ticketDonacion)&&norm(r.ticketDonacion)==='').map(v), null), color:'#fb7185', lines:expenseLines(r=>!isDonation(r.ticketDonacion)&&norm(r.ticketDonacion)==='')}
    ];
    const totalIncome = sum(incomeItems);
    const totalDon = sum(donationItems);
    const totalExp = sum(expenseItems);
    const saldoOperativo = totalIncome - totalExp;
    const saldoItems = [{label:'Saldo operativo', value:Math.abs(saldoOperativo), displayValue:saldoOperativo, color:saldoOperativo >= 0 ? '#155e75' : '#7f1d1d', lines:[`Saldo operativo: ${moneyF(saldoOperativo)}`]}];
    return {incomeItems, donationItems, expenseItems, saldoItems, totalIncome, totalDon, totalExp, saldoOperativo};
  }
  function polar(cx, cy, r, angle){ const rad = (angle - 90) * Math.PI / 180; return {x:cx + r * Math.cos(rad), y:cy + r * Math.sin(rad)}; }
  function arcPath(cx, cy, r, start, end){
    const s = polar(cx,cy,r,end), e = polar(cx,cy,r,start);
    const large = end - start <= 180 ? 0 : 1;
    return `M ${cx} ${cy} L ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(3)} ${e.y.toFixed(3)} Z`;
  }
  function tipFor(item){ const val = item.displayValue ?? item.value; return `${item.label}: ${moneyF(val)}\n${(item.lines && item.lines.length ? item.lines : ['Sin registros']).join('\n')}`; }
  function pieCard(title, total, items){
    const nonzero = items.filter(it => Math.abs(Number(it.value||0)) > 0);
    let angle = 0;
    const denom = Math.max(0.0001, nonzero.reduce((a,b)=>a+Math.abs(Number(b.value||0)),0));
    const slices = nonzero.length ? nonzero.map((it, idx) => {
      const start = angle;
      const inc = (Math.abs(Number(it.value||0)) / denom) * 360;
      angle += inc;
      if(inc >= 359.99) return `<circle class="ce-v413-pie-slice" cx="50" cy="50" r="42" fill="${esc(it.color)}" data-ce-tip="${esc(tipFor(it))}" data-tip-bg-v21="#ffffff" data-ce-tip-layout-v21="chart"></circle>`;
      const d = arcPath(50,50,42,start,angle);
      return `<path class="ce-v413-pie-slice" d="${d}" fill="${esc(it.color)}" data-ce-tip="${esc(tipFor(it))}" data-tip-bg-v21="#ffffff" data-ce-tip-layout-v21="chart"></path>`;
    }).join('') : `<circle cx="50" cy="50" r="42" fill="#e5e7eb"></circle>`;
    const legend = (nonzero.length ? nonzero : [{label:'Sin datos',value:0,color:'#e5e7eb',lines:['Sin registros']}]).map(it => `<div class="ce-v413-legend-row" data-ce-tip="${esc(tipFor(it))}" data-tip-bg-v21="#ffffff" data-ce-tip-layout-v21="chart"><span class="ce-v413-dot" style="background:${esc(it.color)}"></span><span>${esc(it.label)}: ${esc(moneyF(it.displayValue ?? it.value))}</span></div>`).join('');
    return `<div class="ce-v413-pie-card"><div class="ce-v413-pie-title"><span>${esc(title)}</span><strong>${esc(moneyF(total))}</strong></div><svg class="ce-v413-pie-svg" viewBox="0 0 100 100" role="img" aria-label="${esc(title)}">${slices}<circle cx="50" cy="50" r="21" fill="#fff"></circle></svg><div class="ce-v413-legend">${legend}</div></div>`;
  }
  function destinoRows(){
    try{ if(typeof summaryByDestino === 'function') return summaryByDestino() || []; }catch(_){ }
    const compras = buysForEvent();
    const destinos = Array.from(new Set([...(window.DESTINO_OPTIONS || []), ...compras.map(c=>c.producto?.destino || productObj(c.productoId)?.destino || 'Sin destino')])).filter(Boolean);
    const v = r => Number(r.valor != null ? r.valor : Number(r.precio||0)*Number(r.unidades||0));
    return destinos.map(k => {
      const m = c => norm(c.producto?.destino || productObj(c.productoId)?.destino || 'Sin destino') === norm(k);
      const comprados = compras.filter(c=>m(c)&&!isDonation(c.ticketDonacion)&&!isCurrentExpense(c.ticketDonacion)&&norm(c.ticketDonacion)!=='');
      const donados = compras.filter(c=>m(c)&&isDonation(c.ticketDonacion));
      const pendientes = compras.filter(c=>m(c)&&!isDonation(c.ticketDonacion)&&norm(c.ticketDonacion)==='');
      const row = {
        label:k,
        comprado:sum(comprados.map(v), null),
        donado:sum(donados.map(v), null),
        pendiente:sum(pendientes.map(v), null),
        listComprado:comprados.map(c=>`${c.producto?.nombre || productName(c.productoId) || 'Producto'} — ${c.ticketDonacion || ''} — ${moneyF(v(c))}`),
        listDonado:donados.map(c=>`${donorName(c)||'Sin donante'} — ${c.producto?.nombre || productName(c.productoId) || 'Producto'} — ${moneyF(v(c))}`),
        listPendiente:pendientes.map(c=>`${c.producto?.nombre || productName(c.productoId) || 'Producto'} — ${moneyF(v(c))}`)
      };
      row.total = row.comprado + row.donado + row.pendiente;
      return row;
    }).filter(r => r.total || r.label);
  }
  function destinoBars(){
    const rows = destinoRows();
    const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
    const total = rows.reduce((a,b)=>a+Number(b.total||0),0);
    const item = (r, key, label, color, lines) => {
      const value = Number(r[key]||0); const h = Math.max(value ? 12 : 5, value / maxVal * 130);
      const tip = `${r.label} - ${label}: ${moneyF(value)}\n${(lines?.length ? lines : ['Sin productos']).join('\n')}`;
      return `<div class="ce-v413-mini-col" data-ce-tip="${esc(tip)}" data-tip-bg-v21="#ffffff" data-ce-tip-layout-v21="chart"><div class="ce-v413-mini-value">${esc(moneyF(value))}</div><div class="ce-v413-mini-stick" style="height:${h}px;background:${color}"></div><div class="ce-v413-mini-label">${esc(label)}</div></div>`;
    };
    const cards = rows.map(r => `<div class="ce-v413-destino-card"><div class="ce-v413-destino-title"><span>${esc(r.label)}</span><strong>${esc(moneyF(r.total))}</strong></div><div class="ce-v413-mini-bars">${item(r,'comprado','Comprado','#dc2626',r.listComprado)}${item(r,'donado','Donado','#f59e0b',r.listDonado)}${item(r,'pendiente','Pte.Compra','#fb7185',r.listPendiente)}</div></div>`).join('');
    return `<div class="ce-v413-chart-panel"><div class="ce-v413-panel-title"><span>Por destino</span><strong>${esc(moneyF(total))}</strong></div><div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte.Compra</span></div><div class="ce-v413-destino-bars">${cards || '<div class="empty">Sin datos por destino.</div>'}</div></div>`;
  }
  function graficasV413Superseded(){
    return !!(window.__ceStableGraficasV435 || window.ControlEventV434 || window.ControlEventV435);
  }
  function renderGraficasV413(){
    if(graficasV413Superseded()){
      try{ return (window.ControlEventV435?.renderGraficas || window.ControlEventV434?.renderGraficas)?.({reason:'v413-superseded'}); }catch(_){ return; }
    }
    const wrap = $('eventChartWrap'); if(!wrap) return;
    const g = chartParts();
    wrap.innerHTML = `<div class="chart-shell ce-v413-chart-layout"><div class="ce-v413-chart-panel"><div class="ce-v413-panel-title"><span>Distribución general</span></div><div class="ce-v413-pies">${pieCard('INGRESOS', g.totalIncome, g.incomeItems)}${pieCard('DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems)}${pieCard('GASTOS', g.totalExp, g.expenseItems)}${pieCard('SALDO OPERATIVO', g.saldoOperativo, g.saldoItems)}</div></div>${destinoBars()}</div>`;
  }
  function patchGraficas(){
    if(graficasV413Superseded()) return;
    if(renderGraficasV413.__installed) return;
    renderGraficasV413.__installed = true;
    try{ renderGraficas = renderGraficasV413; }catch(_){ }
    window.renderGraficas = renderGraficasV413;
  }
  function patchRenderForPostProcessing(){
    const old = (typeof render === 'function') ? render : window.render;
    if(!old || old.__ceV413Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      setTimeout(() => { try{ injectSearch('comprasList','comprasSearchInput','Buscar compra'); injectSearch('donacionesList','donacionesSearchInput','Buscar donación'); hideOldGrouping(); if(!$('tabGraficas')?.classList.contains('hidden')) renderGraficasV413(); }catch(_){} }, 30);
      return ret;
    };
    wrapped.__ceV413Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV413Version){
        const old = proto.click;
        const wrapped = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){} return old.apply(this, arguments); };
        wrapped.__ceV413Version = true; proto.click = wrapped;
      }
    }catch(_){ }
  }
  function eventInterceptors(){
    if(window.__ceV413Interceptors) return;
    window.__ceV413Interceptors = true;
    document.addEventListener('change', e => { if(applyFieldChange(e.target)){ saveNow(); } }, true);
    document.addEventListener('input', e => { const a=e.target?.getAttribute?.('data-action') || ''; if(a === 'edit-compra-unidades' || a === 'edit-compra-precio'){ applyFieldChange(e.target); } }, true);
    document.addEventListener('click', e => {
      const btn = e.target?.closest?.('button[data-action="save-compra"],button[data-action="save-donacion"]');
      if(!btn) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      saveCompraOrDonation(btn);
    }, true);
  }
  function install(){
    injectStyle(); applyVersion(); patchSearchRenderers(); patchGraficas(); patchRenderForPostProcessing(); eventInterceptors();
    setTimeout(() => { try{ injectSearch('comprasList','comprasSearchInput','Buscar compra'); injectSearch('donacionesList','donacionesSearchInput','Buscar donación'); hideOldGrouping(); if(!$('tabGraficas')?.classList.contains('hidden')) renderGraficasV413(); }catch(_){} }, 40);
  }
  window.ControlEventV413 = {version:VERSION, install, renderGraficas:renderGraficasV413, saveCompraOrDonation};
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 25)));
  document.addEventListener('click', () => setTimeout(install, 80), true);
  [0,150,600,1400,2600].forEach(ms => setTimeout(install, ms));
})();
