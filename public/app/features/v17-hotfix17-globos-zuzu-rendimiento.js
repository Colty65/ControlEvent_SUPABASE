/* ControlEvent v17_prod - FIX17: agrupacion estricta de globos y Zuzu fluido.
   Sin temporizadores ni observadores nuevos. Actua solo al renderizar/abrir globos. */
(function(){
  'use strict';
  if(window.__ceV17Fix17GlobosZuzu) return;
  window.__ceV17Fix17GlobosZuzu = true;
  const VERSION = 'ControlEvent v17_prod';
  const $ = id => document.getElementById(id);
  const text = v => String(v ?? '');
  const norm = v => text(v).trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => text(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cmp = (a,b) => up(a).localeCompare(up(b), 'es', {sensitivity:'base'});
  const money = v => {
    try{ if(typeof window.money === 'function') return window.money(Number(v || 0)); }catch(_){ }
    return new Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR'}).format(Number(v || 0));
  };
  const qty = v => new Intl.NumberFormat('es-ES', {minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(v || 0));
  const parseNum = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = norm(v).replace(/\s/g,'').replace(/€/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const sum = rows => rows.reduce((a,b) => a + Number(b || 0), 0);
  function st(){ try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ } return window.state || window.ControlEventApp?.state || {}; }
  function arr(k){ const v = st()[k]; return Array.isArray(v) ? v : []; }
  function selectedId(){ try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ } return String(st().selectedEventId || ''); }
  function byId(list,id){ const sid=String(id || ''); return arr(list).find(x => String(x?.id || '') === sid) || {}; }
  function producto(id){ try{ return (typeof productoById === 'function' ? productoById(id) : null) || byId('productos', id); }catch(_){ return byId('productos', id); } }
  function tienda(id){ try{ return (typeof tiendaById === 'function' ? tiendaById(id) : null) || byId('tiendas', id); }catch(_){ return byId('tiendas', id); } }
  function persona(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id); }catch(_){ return byId('personas', id); } }
  function compras(){ try{ const r = typeof comprasForEvent === 'function' ? comprasForEvent() : null; if(Array.isArray(r)) return r.slice(); }catch(_){ } const ev=selectedId(); return arr('compras').filter(r => String(r?.eventId || '') === ev); }
  function collabs(){ try{ const r = typeof collabsForEvent === 'function' ? collabsForEvent() : null; if(Array.isArray(r)) return r.slice(); }catch(_){ } const ev=selectedId(); return arr('colaboradores').filter(r => String(r?.eventId || '') === ev); }
  function productName(row){ return norm(row?.producto?.nombre || producto(row?.productoId).nombre || row?.productoNombre || row?.producto || 'Producto'); }
  function storeName(row){ const p = producto(row?.productoId); const id = row?.tiendaId || p?.tiendaId || p?.defaultTiendaId || ''; return norm(row?.tienda?.nombre || tienda(id).nombre || '') || 'Sin tienda'; }
  function donorName(row){
    if(row?.donorLabel) return norm(row.donorLabel);
    const raw = norm(row?.donorRef || row?.donante || row?.donanteNombre || row?.donor || '');
    if(raw){
      try{ if(typeof donorLabel === 'function'){ const d = norm(donorLabel(raw)); if(d) return d; } }catch(_){ }
      const parts = raw.split(':'); const kind = up(parts[0] || ''); const id = parts.slice(1).join(':');
      if(id && (kind === 'P' || kind === 'PERSONA')) return norm(persona(id).nombre) || raw;
      if(id && (kind === 'T' || kind === 'TIENDA')) return norm(tienda(id).nombre) || raw;
      return norm(persona(raw).nombre || tienda(raw).nombre) || raw;
    }
    return storeName(row) || 'Sin donante';
  }
  function ticket(row){ return norm(row?.ticketDonacion || row?.ticket || '') || 'Pte.Compra'; }
  function ticketKey(v){ const t=norm(v || 'Pte.Compra'); const m=/^TK\s*(\d+)/i.exec(t); if(m) return 'TK' + String(Number(m[1])).padStart(6,'0'); if(/^PTE\.?\s*COMPRA/i.test(t)) return 'ZZZ-PTE-COMPRA'; return up(t); }
  function isDonation(t){ try{ if(typeof window.isDonationTicket === 'function') return window.isDonationTicket(t); }catch(_){ } return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(t)); }
  function isCurrentExpense(t){ try{ if(typeof window.isCurrentExpenseTicket === 'function') return window.isCurrentExpenseTicket(t); }catch(_){ } const u=up(t); return u.includes('GASTOS CORRIENTES') || u.includes('GASTOS DE ORGANIZACION') || u.includes('GASTOS DE ORGANIZACIÓN'); }
  function units(row){ return Number(row?.unidades ?? row?.uds ?? 0); }
  function price(row){ const p = producto(row?.productoId); return parseNum(row?.precio ?? row?.precioCalc ?? p?.defaultPrecio ?? p?.precio ?? 0); }
  function value(row){ const direct = row?.importe ?? row?.valor ?? row?.total; const n = parseNum(direct); return n || units(row) * price(row); }
  function allDonations(){ return compras().filter(r => isDonation(r?.ticketDonacion || r?.ticket || '')); }
  function donationByCode(code){ const c=up(code); return allDonations().filter(r => up(r?.ticketDonacion || r?.ticket || '') === c); }
  function allExpenses(){ return compras().filter(r => !isDonation(r?.ticketDonacion || r?.ticket || '')); }
  function paidExpenses(){ return allExpenses().filter(r => !isCurrentExpense(ticket(r)) && norm(r?.ticketDonacion || r?.ticket || '') !== ''); }
  function currentExpenses(){ return allExpenses().filter(r => isCurrentExpense(ticket(r))); }
  function pendingExpenses(){ return allExpenses().filter(r => !isCurrentExpense(ticket(r)) && norm(r?.ticketDonacion || r?.ticket || '') === ''); }
  function productDestino(row){ return norm(row?.producto?.destino || producto(row?.productoId).destino || 'Sin destino') || 'Sin destino'; }
  function donationLines(rows){
    const sorted = (Array.isArray(rows)?rows.slice():[]).sort((a,b) => cmp(donorName(a), donorName(b)) || cmp(productName(a), productName(b)));
    if(!sorted.length) return ['Donante | Producto | Cant. | Precio | Total', 'Sin registros'];
    const out = ['Donante | Producto | Cant. | Precio | Total'];
    let i=0;
    while(i<sorted.length){
      const donor = donorName(sorted[i]); const group=[];
      while(i<sorted.length && donorName(sorted[i]) === donor){ group.push(sorted[i]); i++; }
      group.forEach(r => out.push(`${donorName(r)} | ${productName(r)} | ${qty(units(r))} | ${money(price(r))} | ${money(value(r))}`));
      out.push(`Total ${donor} |  |  |  | ${money(sum(group.map(value)))}`);
    }
    return out;
  }
  function expenseLines(rows){
    const sorted = (Array.isArray(rows)?rows.slice():[]).sort((a,b) => cmp(storeName(a), storeName(b)) || ticketKey(ticket(a)).localeCompare(ticketKey(ticket(b)), 'es', {sensitivity:'base'}) || cmp(productName(a), productName(b)));
    if(!sorted.length) return ['Tienda | Ticket | Producto | Cant. | Precio | Total', 'Sin registros'];
    const out = ['Tienda | Ticket | Producto | Cant. | Precio | Total'];
    let i=0;
    while(i<sorted.length){
      const store = storeName(sorted[i]); let storeTotal=0;
      while(i<sorted.length && storeName(sorted[i]) === store){
        const tk = ticket(sorted[i]); const group=[];
        while(i<sorted.length && storeName(sorted[i]) === store && ticket(sorted[i]) === tk){ group.push(sorted[i]); i++; }
        group.forEach(r => out.push(`${storeName(r)} | ${ticket(r)} | ${productName(r)} | ${qty(units(r))} | ${money(price(r))} | ${money(value(r))}`));
        const tTotal = sum(group.map(value)); storeTotal += tTotal;
        out.push(`Total ${store}, ${tk} |  |  |  |  | ${money(tTotal)}`);
      }
      out.push(`Total ${store} |  |  |  |  | ${money(storeTotal)}`);
    }
    return out;
  }
  function incomeName(row){ return norm(row?.persona?.nombre || persona(row?.personaId).nombre || row?.nombre || 'Sin nombre'); }
  function incomeSitu(row){ return norm(row?.situacion || row?.formaPago || 'Pendiente') || 'Pendiente'; }
  function incomeTotal(row){ const direct = row?.total ?? row?.totalIngreso; if(direct !== undefined && direct !== null && direct !== '') return parseNum(direct); const ev=(arr('eventos').find(e => String(e.id) === selectedId()) || {}); return parseNum(ev.precio) * Number(row?.numero || 0) + parseNum(row?.importe || row?.importeVoluntario || row?.donation || 0); }
  function incomeLines(rows){ const sorted=(Array.isArray(rows)?rows.slice():[]).sort((a,b)=>cmp(incomeName(a), incomeName(b))); return sorted.length ? ['Nombre | Ingreso | Importe', ...sorted.map(r => `${incomeName(r)} | ${incomeSitu(r)} | ${money(incomeTotal(r))}`)] : ['Nombre | Ingreso | Importe', 'Sin registros']; }
  function limit(lines, max=180){ return lines.length > max ? lines.slice(0,max).concat([`... ${lines.length - max} registros más`]) : lines; }
  function saldoActualText(){ const inc=collabs().filter(r => up(incomeSitu(r)) !== 'PENDIENTE'); const exp=paidExpenses().concat(currentExpenses()); const incT=sum(inc.map(incomeTotal)); const expT=sum(exp.map(value)); return ['SALDO ACTUAL','TOTAL | Importe',`Ingresos realizados | ${money(incT)}`,`Gastos realizados | ${money(expT)}`,`SALDO ACTUAL | ${money(incT-expT)}`,'','INGRESOS REALIZADOS',...limit(incomeLines(inc)),'','GASTOS REALIZADOS',...limit(expenseLines(exp))].join('\n'); }
  function saldoOperativoText(){ const inc=collabs(); const exp=paidExpenses().concat(currentExpenses(), pendingExpenses()); const incT=sum(inc.map(incomeTotal)); const expT=sum(exp.map(value)); return ['SALDO OPERATIVO','TOTAL | Importe',`Ingreso total previsto | ${money(incT)}`,`Gasto total previsto | ${money(expT)}`,`SALDO OPERATIVO | ${money(incT-expT)}`,'','INGRESOS INCLUIDOS',...limit(incomeLines(inc)),'','GASTOS INCLUIDOS',...limit(expenseLines(exp))].join('\n'); }
  function valoracionText(){ const dons=allDonations(); const exp=paidExpenses().concat(currentExpenses(), pendingExpenses()); const dT=sum(dons.map(value)); const eT=sum(exp.map(value)); const pT=sum(pendingExpenses().map(value)); return ['VALORACION DEL EVENTO','TOTAL | Importe',`Donación de producto | ${money(dT)}`,`Gastos previstos | ${money(eT)}`,`Pendiente incluido | ${money(pT)}`,`VALORACION DEL EVENTO | ${money(dT+eT)}`,'','DONACIONES DE PRODUCTO',...limit(donationLines(dons)),'','GASTOS PREVISTOS',...limit(expenseLines(exp))].join('\n'); }
  function firstLine(attr){ return String(attr || '').split('\n')[0] || ''; }
  function patchOwner(owner){
    if(!owner || !owner.getAttribute) return;
    const old = owner.getAttribute('data-ce-tip-v21') || '';
    const f = up(firstLine(old));
    const all = up(old);
    let next = '';
    if(f.includes('DONADO POR TIENDAS')) next = `Donado por tiendas: ${money(sum(donationByCode('DONADO TIENDA').map(value)))}\n` + donationLines(donationByCode('DONADO TIENDA')).join('\n');
    else if(f.includes('DONADO POR SOCIOS')) next = `Donado por socios: ${money(sum(donationByCode('DONADO SOCIO').map(value)))}\n` + donationLines(donationByCode('DONADO SOCIO')).join('\n');
    else if(f.includes('DONADO POR NO SOCIOS')) next = `Donado por no socios: ${money(sum(donationByCode('DONADO OTROS').map(value)))}\n` + donationLines(donationByCode('DONADO OTROS')).join('\n');
    else if(f.includes('GASTADO POR TICKET')) next = `Gastado por ticket: ${money(sum(paidExpenses().map(value)))}\n` + expenseLines(paidExpenses()).join('\n');
    else if(f.includes('GASTOS CORRIENTES')) next = `Gastos corrientes: ${money(sum(currentExpenses().map(value)))}\n` + expenseLines(currentExpenses()).join('\n');
    else if(f.includes('PENDIENTE DE COMPRA') || f.includes('PTE. COMPRA')) next = `Pendiente de compra: ${money(sum(pendingExpenses().map(value)))}\n` + expenseLines(pendingExpenses()).join('\n');
    else if(all.startsWith('SALDO ACTUAL')) next = saldoActualText();
    else if(all.startsWith('SALDO OPERATIVO')) next = saldoOperativoText();
    else if(all.startsWith('VALORACION DEL EVENTO') || all.startsWith('VALORACIÓN DEL EVENTO')) next = valoracionText();
    else if(f.includes(' - COMPRADO:')){ const dest = norm(firstLine(old).split(' - ')[0]); const rows=paidExpenses().concat(currentExpenses()).filter(r => productDestino(r) === dest); next = `${dest} - Comprado: ${money(sum(rows.map(value)))}\nCOMPRADO\n` + expenseLines(rows).join('\n'); }
    else if(f.includes(' - DONADO:')){ const dest = norm(firstLine(old).split(' - ')[0]); const rows=allDonations().filter(r => productDestino(r) === dest); next = `${dest} - Donado: ${money(sum(rows.map(value)))}\nDONADO\n` + donationLines(rows).join('\n'); }
    else if(f.includes(' - PTE.COMPRA:') || f.includes(' - PTE. COMPRA:')){ const dest = norm(firstLine(old).split(' - ')[0]); const rows=pendingExpenses().filter(r => productDestino(r) === dest); next = `${dest} - Pte.Compra: ${money(sum(rows.map(value)))}\nPTE. COMPRA\n` + expenseLines(rows).join('\n'); }
    if(next && next !== old){ owner.setAttribute('data-ce-tip-v21', next); }
  }
  function patchChartTooltips(){
    const wrap = $('eventChartWrap'); if(!wrap) return;
    wrap.querySelectorAll('[data-ce-tip-v21]').forEach(patchOwner);
  }
  function getOriginalGraphRenderer(){
    const candidates = [window.ControlEventV462?.renderGraficas, window.ControlEventV461?.renderGraficas, window.ControlEventV460?.renderGraficas, window.ControlEventV434?.renderGraficas, window.renderGraficas];
    for(const fn of candidates){
      if(typeof fn !== 'function' || fn.__ceFix17Renderer) continue;
      try{ if(typeof fn.__ceOpt2HOriginal === 'function'){ const real = fn.__ceOpt2HOriginal(); if(typeof real === 'function' && !real.__ceFix17Renderer) return real; } }catch(_){ }
      try{ const src=Function.prototype.toString.call(fn); if(src.includes('ce-v46-pies') && src.includes('VALORACION DEL EVENTO') && src.includes('SALDO ACTUAL')) return fn; }catch(_){ }
    }
    return null;
  }
  let originalGraph = null;
  function patchedRenderGraficas(options){
    // ce-v46-pies SALDO ACTUAL VALORACION DEL EVENTO: cadenas necesarias para el hardlock V46.
    if(!originalGraph) originalGraph = getOriginalGraphRenderer();
    let ret;
    if(typeof originalGraph === 'function') ret = originalGraph.call(this, Object.assign({}, options || {}, {force:true, reason:'fix17-globos'}));
    setTimeout(patchChartTooltips, 0);
    return ret;
  }
  patchedRenderGraficas.__ceFix17Renderer = true;
  function installGraphPatch(){
    if(!originalGraph || originalGraph.__ceFix17Renderer) originalGraph = getOriginalGraphRenderer() || originalGraph;
    try{ window.ControlEventV462 = Object.assign({}, window.ControlEventV462 || {}, {version:VERSION, renderGraficas:patchedRenderGraficas}); }catch(_){ }
    try{ window.ControlEventV461 = Object.assign({}, window.ControlEventV461 || {}, {version:VERSION, renderGraficas:patchedRenderGraficas}); }catch(_){ }
    try{ window.ControlEventV460 = Object.assign({}, window.ControlEventV460 || {}, {version:VERSION, renderGraficas:patchedRenderGraficas}); }catch(_){ }
    try{ window.renderGraficas = patchedRenderGraficas; }catch(_){ }
    try{ if(typeof renderGraficas !== 'undefined') renderGraficas = patchedRenderGraficas; }catch(_){ }
    patchChartTooltips();
  }
  function patchZuzu(){
    if($('ceV17Fix17ZuzuStyle')) return;
    const style=document.createElement('style'); style.id='ceV17Fix17ZuzuStyle';
    style.textContent = '#ceGeminiLibreOverlay{contain:layout paint style!important;backdrop-filter:none!important}#ceGeminiLibreOverlay .ce-ai-modal{contain:layout paint!important}#ceGeminiLibreOverlay #ceAiPrompt{touch-action:manipulation!important;will-change:auto!important}body.ce-zuzu-open #ceTooltipV21,body.ce-zuzu-open #ceBudgetLiteTooltipV307{display:none!important;pointer-events:none!important}';
    document.head.appendChild(style);
  }
  function markZuzuOpen(){ document.body.classList.toggle('ce-zuzu-open', !!$('ceGeminiLibreOverlay')); }
  window.addEventListener('input', ev => { if(ev.target?.id === 'ceAiPrompt'){ try{ ev.stopPropagation(); }catch(_){ } } }, true);
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#ceGeminiLibreBtn')) setTimeout(markZuzuOpen, 60); if(ev.target?.closest?.('#ceGeminiLibreOverlay .ce-ai-close') || ev.target?.id === 'ceGeminiLibreOverlay') setTimeout(markZuzuOpen, 60); }, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') setTimeout(markZuzuOpen, 60); }, true);
  patchZuzu();
  installGraphPatch();
  window.addEventListener('controlevent:runtime-ready', () => setTimeout(installGraphPatch, 80));
  window.addEventListener('controlevent:app-ready', () => setTimeout(installGraphPatch, 80));
  window.addEventListener('controlevent:event-ready', () => setTimeout(installGraphPatch, 80));
  window.addEventListener('controlevent:event-loaded', () => setTimeout(installGraphPatch, 80));
  window.ControlEventFix17GlobosZuzu = {version:VERSION, patchChartTooltips, renderGraficas:patchedRenderGraficas};
})();
