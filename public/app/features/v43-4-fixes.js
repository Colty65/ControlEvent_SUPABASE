/* ControlEvent v7.2_prod - gráficas estables sin parpadeo, buscadores, resumen y etiquetas de Mapa de recursos. */
(function(){
  'use strict';
  window.__ceDisableLegacyBarGraficas = true;
  const VERSION = 'ControlEvent v7.2_prod';
  const VERSION_FILE = 'ControlEvent_v7_2_prod';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const fold = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const up = v => fold(v).toUpperCase();
  const esc = v => {
    try{ return (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    catch(_){ return String(v ?? ''); }
  };
  const moneyF = v => {
    try{ return (typeof money === 'function') ? money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
    catch(_){ return `${Number(v||0).toFixed(2)} €`; }
  };
  const cssEsc = v => { try{ return window.CSS?.escape ? CSS.escape(String(v ?? '')) : String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v ?? '').replace(/"/g,'\\"'); } };
  const st = () => { try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return window.state || {}; };
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const comprasRaw = () => { const s = st(); if(!Array.isArray(s.compras)) s.compras = []; return s.compras; };
  const selectedEventId = () => {
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ }
    return String(st().selectedEventId || '');
  };
  const isDonation = t => { try{ return typeof isDonationTicket === 'function' ? isDonationTicket(t) : ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(norm(t).toUpperCase()); }catch(_){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(norm(t).toUpperCase()); } };
  const isCurrentExpense = t => { try{ return typeof isCurrentExpenseTicket === 'function' ? isCurrentExpenseTicket(t) : up(t).includes('GASTOS CORRIENTES'); }catch(_){ return up(t).includes('GASTOS CORRIENTES'); } };
  const byId = (list,id) => arr(list).find(x => String(x?.id || '') === String(id || '')) || null;
  const productObj = id => { try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id) || {}; }catch(_){ return byId('productos', id) || {}; } };
  const personObj = id => { try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id) || {}; }catch(_){ return byId('personas', id) || {}; } };
  const storeObj = id => { try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id) || {}; }catch(_){ return byId('tiendas', id) || {}; } };
  const productName = id => productObj(id).nombre || '';
  const personName = id => personObj(id).nombre || '';
  const storeName = id => storeObj(id).nombre || '';
  function donorName(row){
    try{ if(row?.donorLabel && norm(row.donorLabel)) return norm(row.donorLabel); }catch(_){ }
    const raw = norm(row?.donorRef || row?.donante || row?.donanteNombre || '');
    try{ if(raw && typeof donorLabel === 'function'){ const d = norm(donorLabel(raw)); if(d) return d; } }catch(_){ }
    if(raw){
      const parts = raw.split(':');
      if(parts.length >= 2){
        const kind = parts[0].toUpperCase(); const id = parts.slice(1).join(':');
        if(kind === 'P' || kind === 'PERSONA') return personName(id) || raw;
        if(kind === 'T' || kind === 'TIENDA') return storeName(id) || raw;
      }
      return personName(raw) || storeName(raw) || raw;
    }
    return storeName(row?.tiendaId) || norm(row?.tienda?.nombre || '');
  }
  function rowById(id){ return comprasRaw().find(x => String(x?.id || '') === String(id || '')) || null; }
  function buysForEvent(){ try{ return (typeof comprasForEvent === 'function' ? comprasForEvent() : []).slice(); }catch(_){ const id=selectedEventId(); return comprasRaw().filter(r => String(r?.eventId || '') === id); } }
  function rowsForEvent(){ try{ return (typeof collabsForEvent === 'function' ? collabsForEvent() : []).slice(); }catch(_){ const id=selectedEventId(); return arr('colaboradores').filter(r => String(r?.eventId || '') === id); } }
  function sum(list, field='value'){ return list.reduce((a,b)=>a+Number(field ? (b?.[field] || 0) : (b || 0)),0); }
  function value(row){ const p = productObj(row?.productoId); return Number(row?.valor != null ? row.valor : Number(row?.precio != null ? row.precio : (row?.precioCalc != null ? row.precioCalc : (p.defaultPrecio ?? p.precio ?? 0))) * Number(row?.unidades || 0)); }

  function injectStyle(){
    if($('ceV434Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV434Style';
    style.textContent = `
      body[data-ce-version="${VERSION}"] #tabResumen > .card > .toggle-row{display:none!important;}
      body[data-ce-version="${VERSION}"] #comprasSummaryBody{display:block!important;}
      body[data-ce-version="${VERSION}"] #comprasSummaryBody.hidden{display:block!important;}
      .ce-v434-search{display:flex;gap:12px;align-items:end;margin:10px 0 14px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;}
      .ce-v434-search .field{flex:1;margin:0;}
      .ce-v434-search input{width:100%;}
      .ce-v434-found,.found-target{outline:4px solid rgba(147,51,234,.36)!important;box-shadow:0 0 0 8px rgba(147,51,234,.12)!important;}
      .ce-v434-chart-layout-shell{width:100%;}
      .ce-v434-chart-layout{display:grid;grid-template-columns:minmax(280px,1.05fr) minmax(300px,.95fr);gap:16px;align-items:start;}
      .ce-v434-chart-panel{border:1px solid #e5e7eb;border-radius:20px;background:#fff;padding:14px;box-shadow:0 8px 22px rgba(15,23,42,.06);overflow:hidden;}
      .ce-v434-panel-title{font-weight:950;color:#111827;margin:0 0 10px;display:flex;justify-content:space-between;gap:8px;align-items:center;}
      .ce-v434-pies{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
      .ce-v434-pie-card{border:1px solid #eef2f7;border-radius:18px;background:#f9fafb;padding:10px;}
      .ce-v434-pie-title{font-size:12px;font-weight:950;color:#334155;margin-bottom:6px;display:flex;justify-content:space-between;gap:6px;}
      .ce-v434-pie-svg{width:100%;max-width:170px;aspect-ratio:1;margin:0 auto 8px;display:block;}
      .ce-v434-pie-slice{cursor:pointer;stroke:#fff;stroke-width:.8px;transition:filter .12s ease;}
      .ce-v434-pie-slice:hover{filter:brightness(.96);}
      .ce-v434-legend{display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:800;color:#334155;}
      .ce-v434-legend-row{display:flex;gap:6px;align-items:flex-start;cursor:pointer;border-radius:8px;padding:2px 3px;}
      .ce-v434-legend-row:hover{background:#eef2ff;}
      .ce-v434-dot{width:10px;height:10px;border-radius:999px;display:inline-block;flex:0 0 auto;margin-top:2px;}
      .ce-v434-destino-bars{display:grid;gap:10px;}
      .ce-v434-destino-card{border:1px solid #eef2f7;border-radius:16px;background:#f9fafb;padding:9px;}
      .ce-v434-destino-title{font-size:12px;font-weight:950;color:#334155;margin-bottom:7px;display:flex;justify-content:space-between;gap:8px;}
      .ce-v434-mini-bars{display:flex;align-items:flex-end;justify-content:center;gap:16px;min-height:165px;}
      .ce-v434-mini-col{width:78px;min-width:78px;text-align:center;cursor:pointer;border-radius:12px;padding:4px 4px;}
      .ce-v434-mini-col:hover{background:#eef2ff;}
      .ce-v434-mini-value{font-size:10px;font-weight:900;color:#334155;writing-mode:vertical-rl;transform:rotate(180deg);margin:0 auto 5px;max-height:72px;overflow:hidden;}
      .ce-v434-mini-stick{width:58px;border-radius:10px 10px 0 0;margin:0 auto;min-height:8px;box-shadow:inset 0 -1px 0 rgba(0,0,0,.08);}
      .ce-v434-mini-label{font-size:9px;font-weight:900;color:#64748b;margin-top:4px;line-height:1.05;}
      #ceTooltipV21.ce-v21-layout-chart .ce-v21-table{border-collapse:separate;border-spacing:0 4px;width:max-content;max-width:min(920px,calc(100vw - 48px));}
      #ceTooltipV21.ce-v21-layout-chart .ce-v21-table tr:first-child td{font-weight:950!important;background:rgba(255,255,255,.48)!important;}
      #ceTooltipV21.ce-v21-layout-chart .ce-v21-table td{font-weight:700!important;white-space:nowrap!important;color:#111827!important;}
      #ceTooltipV21.ce-v21-layout-chart .ce-v21-table td:nth-child(n+3),#ceTooltipV21.ce-v21-layout-chart .ce-v21-table td:last-child{text-align:right!important;font-variant-numeric:tabular-nums;}
      #ceTooltipV21.ce-v21-layout-chart .ce-v21-table td:first-child,#ceTooltipV21.ce-v21-layout-chart .ce-v21-table td:nth-child(2),#ceTooltipV21.ce-v21-layout-chart .ce-v21-table td:last-child{font-weight:950!important;}
      @media(max-width:860px){.ce-v434-chart-layout{grid-template-columns:1fr}.ce-v434-pies{grid-template-columns:1fr}.ce-v434-search{flex-direction:column;align-items:stretch}.ce-v434-search button{width:100%;}.ce-v434-mini-bars{gap:16px}.ce-v434-mini-col{width:82px;min-width:82px}.ce-v434-mini-stick{width:62px;}}
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV434Version){
        const old = proto.click;
        const wrapped = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){} return old.apply(this, arguments); };
        wrapped.__ceV434Version = true; proto.click = wrapped;
      }
    }catch(_){ }
  }

  function forceResumenOpen(){
    const body = $('comprasSummaryBody');
    if(body){ body.classList.remove('hidden'); body.hidden = false; body.style.display = 'block'; }
    const row = $('toggleComprasSummary')?.closest?.('.toggle-row');
    if(row){ row.style.display = 'none'; row.hidden = true; }
    const btn = $('toggleComprasSummary');
    if(btn){ btn.hidden = true; btn.style.display = 'none'; btn.setAttribute('aria-hidden','true'); btn.tabIndex = -1; }
    document.querySelectorAll('.mobile-menu-action[data-target="toggleComprasSummary"]').forEach(el => { el.hidden = true; el.style.display = 'none'; });
  }

  function setFound(el){
    if(!el) return;
    document.querySelectorAll('.found-target,.ce-v413-found,.ce-v434-found').forEach(x => x.classList.remove('found-target','ce-v413-found','ce-v434-found'));
    el.classList.add('found-target','ce-v434-found');
    try{ el.setAttribute('tabindex','-1'); el.focus({preventScroll:true}); }catch(_){ }
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target','ce-v434-found'), 3500);
  }
  function optionText(select){
    try{ return select?.options?.[select.selectedIndex]?.textContent || select?.value || ''; }catch(_){ return select?.value || ''; }
  }
  function rowSearchText(card){
    const id = card?.querySelector?.('[data-id]')?.getAttribute('data-id') || card?.dataset?.id || '';
    const row = rowById(id);
    const parts = [];
    if(row){
      const p = productObj(row.productoId);
      parts.push(row.id, row.ticketDonacion, row.ticket, row.unidades, row.precio, row.valor);
      parts.push(p.nombre, p.segmento, p.destino);
      parts.push(storeName(row.tiendaId), personName(row.responsableId), donorName(row));
    }
    try{
      card.querySelectorAll('select').forEach(sel => parts.push(optionText(sel), sel.value));
      card.querySelectorAll('input,textarea').forEach(el => parts.push(el.value));
      const clone = card.cloneNode(true);
      clone.querySelectorAll('select,option,button,input,textarea,script,style').forEach(x => x.remove());
      parts.push(clone.textContent || '');
    }catch(_){ }
    return fold(parts.join(' '));
  }
  function cardsInList(list){ return Array.from(list.querySelectorAll(':scope > .itemcard, :scope .itemcard')).filter(card => !card.closest('.ce-v434-search,.ce-v413-search')); }
  function runSearch(listId, inputId){
    const list = $(listId), input = $(inputId);
    if(!list || !input) return false;
    const q = fold(input.value || '');
    if(!q) return false;
    const tokens = q.split(/\s+/).filter(Boolean);
    const found = cardsInList(list).find(card => {
      const hay = rowSearchText(card);
      return tokens.every(t => hay.includes(t));
    });
    if(found) setFound(found);
    else try{ alert('No se ha encontrado ningún registro con ese texto.'); }catch(_){ }
    return true;
  }
  function ensureSearch(listId, inputId, label){
    const list = $(listId); if(!list || list.querySelector(`#${inputId}`)) return;
    const box = document.createElement('div');
    box.className = 'ce-v434-search maint-search';
    box.innerHTML = `<div class="field"><label>${esc(label)}</label><input id="${inputId}" type="search" placeholder="Escribe para buscar..." autocomplete="off" /></div><button type="button" class="outline small" id="${inputId}Btn">Buscar</button>`;
    list.prepend(box);
  }
  function syncSearches(){
    ensureSearch('comprasList','comprasSearchInput','Buscar compra');
    ensureSearch('donacionesList','donacionesSearchInput','Buscar donación');
  }
  function installSearchInterceptors(){
    if(window.__ceV434SearchInterceptors) return;
    window.__ceV434SearchInterceptors = true;
    document.addEventListener('click', function(ev){
      const btn = ev.target?.closest?.('#comprasSearchInputBtn,#donacionesSearchInputBtn');
      if(!btn) return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      if(btn.id === 'comprasSearchInputBtn') runSearch('comprasList','comprasSearchInput');
      else runSearch('donacionesList','donacionesSearchInput');
      return false;
    }, true);
    document.addEventListener('keydown', function(ev){
      const input = ev.target?.closest?.('#comprasSearchInput,#donacionesSearchInput');
      if(!input || ev.key !== 'Enter') return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      if(input.id === 'comprasSearchInput') runSearch('comprasList','comprasSearchInput');
      else runSearch('donacionesList','donacionesSearchInput');
      return false;
    }, true);
  }

  function unitPriceFor(row){
    const p = productObj(row?.productoId) || {};
    return Number(row?.precio != null ? row.precio : (row?.precioCalc != null ? row.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
  }
  function qtyF(row){
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(row?.unidades || 0)); }
    catch(_){ return String(Number(row?.unidades || 0)); }
  }
  function incomeLines(fn){
    const list = rowsForEvent().filter(fn);
    if(!list.length) return ['Sin registros'];
    return ['Nombre | Importe', ...list.map(r => `${r.persona?.nombre || personName(r.personaId) || 'Sin nombre'} | ${moneyF(r.total || (Number(r.importe||0) + 0))}`)];
  }
  function donationLines(ticket){
    const list = buysForEvent().filter(r => norm(r.ticketDonacion) === ticket);
    if(!list.length) return ['Sin registros'];
    return ['Donante | Producto | Cant. | Precio | Total', ...list.map(r => `${donorName(r) || 'Sin donante'} | ${r.producto?.nombre || productName(r.productoId) || 'Producto'} | ${qtyF(r)} | ${moneyF(unitPriceFor(r))} | ${moneyF(value(r))}`)];
  }
  function expenseLines(fn){
    const list = buysForEvent().filter(fn);
    if(!list.length) return ['Sin registros'];
    return ['Tienda | Ticket | Producto | Cant. | Precio | Total', ...list.map(r => `${r.tienda?.nombre || storeName(r.tiendaId) || 'Sin tienda'} | ${r.ticketDonacion || 'Pte.Compra'} | ${r.producto?.nombre || productName(r.productoId) || 'Producto'} | ${qtyF(r)} | ${moneyF(unitPriceFor(r))} | ${moneyF(value(r))}`)];
  }
  function chartParts(){
    const rows = rowsForEvent();
    const compras = buysForEvent();
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
      {label:'Donado por tiendas', value:sum(compras.filter(r=>norm(r.ticketDonacion)==='DONADO TIENDA').map(value), null), color:'#fcd34d', lines:donationLines('DONADO TIENDA')},
      {label:'Donado por socios', value:sum(compras.filter(r=>norm(r.ticketDonacion)==='DONADO SOCIO').map(value), null), color:'#f59e0b', lines:donationLines('DONADO SOCIO')},
      {label:'Donado por no socios', value:sum(compras.filter(r=>norm(r.ticketDonacion)==='DONADO OTROS').map(value), null), color:'#b45309', lines:donationLines('DONADO OTROS')}
    ];
    const expenseItems = [
      {label:'Gastado por ticket', value:sum(compras.filter(r=>!isDonation(r.ticketDonacion)&&!isCurrentExpense(r.ticketDonacion)&&norm(r.ticketDonacion)!=='').map(value), null), color:'#dc2626', lines:expenseLines(r=>!isDonation(r.ticketDonacion)&&!isCurrentExpense(r.ticketDonacion)&&norm(r.ticketDonacion)!=='')},
      {label:'Gastos corrientes', value:sum(compras.filter(r=>isCurrentExpense(r.ticketDonacion)).map(value), null), color:'#ef4444', lines:expenseLines(r=>isCurrentExpense(r.ticketDonacion))},
      {label:'Pendiente de compra', value:sum(compras.filter(r=>!isDonation(r.ticketDonacion)&&norm(r.ticketDonacion)==='').map(value), null), color:'#fb7185', lines:expenseLines(r=>!isDonation(r.ticketDonacion)&&norm(r.ticketDonacion)==='')}
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
  function tipAttrs(item, bg='#ffffff', layout='chart'){
    const tip = esc(tipFor(item));
    return `data-ce-tip-v21="${tip}" data-tip-bg-v21="${esc(bg)}" data-ce-tip-layout-v21="${esc(layout)}"`;
  }
  function pieCard(title, total, items){
    const nonzero = items.filter(it => Math.abs(Number(it.value||0)) > 0);
    let angle = 0;
    const denom = Math.max(0.0001, nonzero.reduce((a,b)=>a+Math.abs(Number(b.value||0)),0));
    const slices = nonzero.length ? nonzero.map(it => {
      const start = angle;
      const inc = (Math.abs(Number(it.value||0)) / denom) * 360;
      angle += inc;
      if(inc >= 359.99) return `<circle class="ce-v434-pie-slice" cx="50" cy="50" r="42" fill="${esc(it.color)}" ${tipAttrs(it, it.color || '#ffffff')}></circle>`;
      const d = arcPath(50,50,42,start,angle);
      return `<path class="ce-v434-pie-slice" d="${d}" fill="${esc(it.color)}" ${tipAttrs(it, it.color || '#ffffff')}></path>`;
    }).join('') : `<circle cx="50" cy="50" r="42" fill="#e5e7eb"></circle>`;
    const legend = (nonzero.length ? nonzero : [{label:'Sin datos',value:0,color:'#e5e7eb',lines:['Sin registros']}]).map(it => `<div class="ce-v434-legend-row" ${tipAttrs(it, it.color || '#ffffff')}><span class="ce-v434-dot" style="background:${esc(it.color)}"></span><span>${esc(it.label)}: ${esc(moneyF(it.displayValue ?? it.value))}</span></div>`).join('');
    return `<div class="ce-v434-pie-card"><div class="ce-v434-pie-title"><span>${esc(title)}</span><strong>${esc(moneyF(total))}</strong></div><svg class="ce-v434-pie-svg" viewBox="0 0 100 100" role="img" aria-label="${esc(title)}">${slices}<circle cx="50" cy="50" r="21" fill="#fff"></circle></svg><div class="ce-v434-legend">${legend}</div></div>`;
  }
  function hasDestinoValues(row){
    return Math.abs(Number(row?.comprado || 0)) > 0 || Math.abs(Number(row?.donado || 0)) > 0 || Math.abs(Number(row?.pendiente || 0)) > 0;
  }
  function destinoRows(){
    try{ if(typeof summaryByDestino === 'function') return (summaryByDestino() || []).filter(hasDestinoValues); }catch(_){ }
    const compras = buysForEvent();
    const destinos = Array.from(new Set([...(window.DESTINO_OPTIONS || []), ...compras.map(c=>c.producto?.destino || productObj(c.productoId)?.destino || 'Sin destino')])).filter(Boolean);
    return destinos.map(k => {
      const m = c => norm(c.producto?.destino || productObj(c.productoId)?.destino || 'Sin destino') === norm(k);
      const comprados = compras.filter(c=>m(c)&&!isDonation(c.ticketDonacion)&&!isCurrentExpense(c.ticketDonacion)&&norm(c.ticketDonacion)!=='');
      const corrientes = compras.filter(c=>m(c)&&isCurrentExpense(c.ticketDonacion));
      const donados = compras.filter(c=>m(c)&&isDonation(c.ticketDonacion));
      const pendientes = compras.filter(c=>m(c)&&!isDonation(c.ticketDonacion)&&norm(c.ticketDonacion)==='');
      const row = {
        label:k,
        comprado:sum(comprados.map(value), null) + sum(corrientes.map(value), null),
        donado:sum(donados.map(value), null),
        pendiente:sum(pendientes.map(value), null),
        listComprado:comprados.concat(corrientes).map(c=>`${c.producto?.nombre || productName(c.productoId) || 'Producto'} — ${c.ticketDonacion || ''} — ${moneyF(value(c))}`),
        listDonado:donados.map(c=>`${donorName(c)||'Sin donante'} — ${c.producto?.nombre || productName(c.productoId) || 'Producto'} — ${moneyF(value(c))}`),
        listPendiente:pendientes.map(c=>`${c.producto?.nombre || productName(c.productoId) || 'Producto'} — ${moneyF(value(c))}`)
      };
      row.total = row.comprado + row.donado + row.pendiente;
      return row;
    }).filter(hasDestinoValues);
  }
  function destinoBars(){
    const rows = destinoRows();
    const maxVal = Math.max(1, ...rows.flatMap(r => [Number(r.comprado||0), Number(r.donado||0), Number(r.pendiente||0)]));
    const total = rows.reduce((a,b)=>a+Number(b.total||0),0);
    const item = (r, key, label, color, lines) => {
      const value = Number(r[key]||0);
      if(Math.abs(value) <= 0) return '';
      const h = Math.max(18, value / maxVal * 145);
      const tip = `${r.label} - ${label}: ${moneyF(value)}\n${(lines?.length ? lines : ['Sin productos']).join('\n')}`;
      return `<div class="ce-v434-mini-col" data-ce-tip-v21="${esc(tip)}" data-tip-bg-v21="${esc(color)}" data-ce-tip-layout-v21="chart"><div class="ce-v434-mini-value">${esc(moneyF(value))}</div><div class="ce-v434-mini-stick" style="height:${h}px;background:${color}"></div><div class="ce-v434-mini-label">${esc(label)}</div></div>`;
    };
    const cards = rows.map(r => `<div class="ce-v434-destino-card"><div class="ce-v434-destino-title"><span>${esc(r.label)}</span><strong>${esc(moneyF(r.total))}</strong></div><div class="ce-v434-mini-bars">${item(r,'comprado','Comprado','#dc2626',r.listComprado)}${item(r,'donado','Donado','#f59e0b',r.listDonado)}${item(r,'pendiente','Pte.Compra','#fb7185',r.listPendiente)}</div></div>`).join('');
    return `<div class="ce-v434-chart-panel"><div class="ce-v434-panel-title"><span>Por destino</span><strong>${esc(moneyF(total))}</strong></div><div class="chart-note"><span><span class="legend-dot" style="background:#dc2626"></span>Comprado</span> <span><span class="legend-dot" style="background:#f59e0b"></span>Donado</span> <span><span class="legend-dot" style="background:#fb7185"></span>Pte.Compra</span></div><div class="ce-v434-destino-bars">${cards || '<div class="empty">Sin datos por destino.</div>'}</div></div>`;
  }
  let chartRendering = false;
  let lastChartSignature = '';
  function signatureForGraficas(g){
    try{
      const dest = destinoRows().map(r => [r.label, r.comprado, r.donado, r.pendiente].join(':')).join('|');
      const flat = [].concat(g.incomeItems||[], g.donationItems||[], g.expenseItems||[], g.saldoItems||[]).map(it => `${it.label}:${it.value}:${it.displayValue ?? ''}`).join('|');
      return `${selectedEventId()}::${flat}::${dest}`;
    }catch(_){ return `${selectedEventId()}::${Date.now()}`; }
  }
  function renderGraficasV434(options = {}){
    const wrap = $('eventChartWrap'); if(!wrap) return;
    window.__ceStableGraficasV435 = true;
    const g = chartParts();
    const signature = signatureForGraficas(g);
    const own = wrap.firstElementChild?.classList?.contains('ce-v434-chart-layout-shell') && wrap.children.length === 1;
    if(own && lastChartSignature === signature && options.force !== true) return;
    chartRendering = true;
    const html = `<div class="chart-shell ce-v434-chart-layout-shell"><div class="chart-row" data-v255-row="valoracion" data-v254-row="valoracion" style="display:none!important"></div><div class="ce-v434-chart-layout"><div class="ce-v434-chart-panel"><div class="ce-v434-panel-title"><span>Distribución general</span></div><div class="ce-v434-pies">${pieCard('INGRESOS', g.totalIncome, g.incomeItems)}${pieCard('DONACIÓN DE PRODUCTO', g.totalDon, g.donationItems)}${pieCard('GASTOS', g.totalExp, g.expenseItems)}${pieCard('SALDO OPERATIVO', g.saldoOperativo, g.saldoItems)}</div></div>${destinoBars()}</div></div>`;
    wrap.innerHTML = html;
    lastChartSignature = signature;
    wrap.dataset.ceStableChart = 'v43.7';
    setTimeout(() => { chartRendering = false; }, 0);
  }
  function graficasVisible(){ const tab=$('tabGraficas'); return !!tab && !tab.classList.contains('hidden'); }
  function ensureGraficas(){
    if(!graficasVisible()) return;
    const wrap = $('eventChartWrap'); if(!wrap || chartRendering) return;
    const own = wrap.firstElementChild?.classList?.contains('ce-v434-chart-layout-shell') && wrap.children.length === 1;
    if(!own) renderGraficasV434();
  }
  function patchGraficas(){
    window.__ceStableGraficasV435 = true;
    try{ renderGraficas = renderGraficasV434; }catch(_){ }
    window.renderGraficas = renderGraficasV434;
    try{ if(window.ControlEventV413) window.ControlEventV413.renderGraficas = renderGraficasV434; }catch(_){ }
  }
  function installChartObserver(){
    // v43.7: el observer anterior provocaba un ciclo: legacy pintaba barras y el observer repintaba queso.
    // Se desconecta para que GRAFICAS se pinte una sola vez por render real.
    try{ window.__ceV434ChartObserver?.disconnect?.(); }catch(_){ }
    window.__ceV434ChartObserver = null;
    window.__ceV434ChartObserverTarget = null;
  }

  function normalizeMapaLabels(){
    const panel = $('tabMapaProductos'); if(!panel) return;
    const replacements = [
      [/Necesidad\s+valorada/gi, 'VALORACION DEL EVENTO'],
      [/Compras\s+producto/gi, 'COMPRAS'],
      [/COMPRAS\s+PRODUCTO/g, 'COMPRAS'],
      [/Donado\s+producto/gi, 'DONACION DE PRODUCTO'],
      [/DONADO\s+PRODUCTO/g, 'DONACION DE PRODUCTO'],
      [/Donación\s+de\s+producto/gi, 'DONACION DE PRODUCTO']
    ];
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { let txt = node.nodeValue || ''; const old = txt; replacements.forEach(([rx,to]) => { txt = txt.replace(rx,to); }); if(txt !== old) node.nodeValue = txt; });
  }
  function patchMapaRenderer(){
    const old = window.renderMapaProductos;
    if(typeof old !== 'function' || old.__ceV434Labels) return;
    const wrapped = function(){ const ret = old.apply(this, arguments); setTimeout(normalizeMapaLabels, 0); return ret; };
    wrapped.__ceV434Labels = true;
    window.renderMapaProductos = wrapped;
    try{ renderMapaProductos = wrapped; }catch(_){ }
  }

  function patchRenderPost(){
    const old = (typeof render === 'function') ? render : window.render;
    if(!old || old.__ceV434Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      setTimeout(() => { applyVersion(); forceResumenOpen(); syncSearches(); normalizeMapaLabels(); patchGraficas(); installChartObserver(); if(graficasVisible()) renderGraficasV434(); }, 60);
      return ret;
    };
    wrapped.__ceV434Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }

  function install(){
    injectStyle();
    applyVersion();
    forceResumenOpen();
    syncSearches();
    installSearchInterceptors();
    patchGraficas();
    patchMapaRenderer();
    normalizeMapaLabels();
    patchRenderPost();
    installChartObserver();
    ensureGraficas();
  }

  window.ControlEventV434 = {version:VERSION, install, runSearch, renderGraficas:renderGraficasV434, normalizeMapaLabels};
  window.ControlEventV435 = window.ControlEventV434;
  window.ControlEventV436 = window.ControlEventV434;
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 25)));
  [0,160,650,1600].forEach(ms => setTimeout(install, ms));
})();
