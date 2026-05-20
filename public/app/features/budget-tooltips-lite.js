/* ControlEvent v30.5 - Globos ligeros para RESUMEN PRESUPUESTARIO.
   Sustituye los globos heredados de INGRESOS EN DINERO y DONACION DE PRODUCTO
   por un visor por clic, estable en iPad/Android y sin listeners de mousemove. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v30.5';
  const TOOLTIP_ID = 'ceBudgetLiteTooltipV305';
  const LEGACY_TIP_ATTRS = [
    'title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952',
    'data-ce-tip-v21','data-tip-bg-v21','data-ce-tip-layout-v21','data-ce-tip-lazy-v250',
    'data-ce-tip-bg','data-ce-tip-layout'
  ];
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm = value => String(value ?? '').trim();
  const up = value => norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const num = value => {
    const n = Number(value || 0);
    return new Intl.NumberFormat('es-ES', {minimumFractionDigits:0, maximumFractionDigits:2}).format(Number.isFinite(n) ? n : 0);
  };
  const money = value => {
    try{ if(typeof window.money === 'function') return window.money(Number(value || 0)); }catch(_){ }
    return new Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR'}).format(Number(value || 0));
  };
  const cmp = (a,b) => up(a).localeCompare(up(b), 'es');

  function stateRef(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || window.ControlEventApp?.state || {};
  }
  function arr(name){
    const value = stateRef()[name];
    return Array.isArray(value) ? value : [];
  }
  function selectedEventId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ }
    return String(stateRef().selectedEventId || '');
  }
  function selectedEventObj(){
    const id = selectedEventId();
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev) return ev; }catch(_){ }
    return arr('eventos').find(e => String(e.id || '') === id) || {};
  }
  function byId(listName, id){
    const sid = String(id || '');
    return arr(listName).find(item => String(item.id || '') === sid) || {};
  }
  function persona(id){
    try{ if(typeof personaById === 'function'){ const p = personaById(id); if(p) return p; } }catch(_){ }
    return byId('personas', id);
  }
  function producto(id){
    try{ if(typeof productoById === 'function'){ const p = productoById(id); if(p) return p; } }catch(_){ }
    return byId('productos', id);
  }
  function tienda(id){
    try{ if(typeof tiendaById === 'function'){ const t = tiendaById(id); if(t) return t; } }catch(_){ }
    return byId('tiendas', id);
  }
  function collabs(){
    try{ if(typeof collabsForEvent === 'function'){ const rows = collabsForEvent() || []; if(Array.isArray(rows)) return rows; } }catch(_){ }
    const ev = selectedEventId();
    return arr('colaboradores').filter(row => String(row.eventId || '') === ev).map(row => ({...row, persona: row.persona || persona(row.personaId)}));
  }
  function compras(){
    try{ if(typeof comprasForEvent === 'function'){ const rows = comprasForEvent() || []; if(Array.isArray(rows)) return rows; } }catch(_){ }
    const ev = selectedEventId();
    return arr('compras').filter(row => String(row.eventId || '') === ev);
  }
  function isDonationTicket(value){
    try{ if(typeof window.isDonationTicket === 'function') return window.isDonationTicket(value); }catch(_){ }
    return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(value));
  }
  function eventPrice(){ return Number(selectedEventObj().precio || selectedEventObj().price || 0); }
  function incomePersona(row){ return row.persona || persona(row.personaId) || {}; }
  function incomeIsSocio(row){ return up(incomePersona(row).rango || row.rango || '') === 'SOCIO'; }
  function incomeSitu(row){ return norm(row.situacion || row.formaPago || 'Pendiente') || 'Pendiente'; }
  function incomeParts(row){
    const p = incomePersona(row);
    const n = Number(row.numero || row.num || row.n || 0);
    const socioBase = row.base ?? row.importeObligatorio ?? (n * eventPrice());
    const socio = incomeIsSocio(row) ? Number(socioBase || 0) : 0;
    const voluntarioBase = row.donation ?? row.importeVoluntario ?? row.importe ?? row.voluntario ?? 0;
    const voluntario = Number(voluntarioBase || 0);
    const totalBase = row.total ?? row.totalIngreso ?? (socio + voluntario);
    const total = Number(totalBase || 0);
    const pending = up(incomeSitu(row)) === 'PENDIENTE';
    return {
      nombre: norm(p.nombre || row.nombre || 'Sin nombre'),
      rango: norm(p.rango || row.rango || ''),
      numero: n,
      socio,
      voluntario,
      ingresado: pending ? 0 : total,
      pendiente: pending ? total : 0,
      total
    };
  }
  function productName(row){ return norm(row.producto?.nombre || producto(row.productoId).nombre || row.productoNombre || row.producto || 'Producto'); }
  function productPrice(row){
    const p = producto(row.productoId);
    return Number(row.precio ?? row.precioCalc ?? p.defaultPrecio ?? p.precio ?? 0);
  }
  function productUnits(row){ return Number(row.unidades ?? row.uds ?? 0); }
  function productValue(row){
    const direct = Number(row.valor ?? row.importe ?? 0);
    return direct || productUnits(row) * productPrice(row);
  }
  function storeName(row){
    const p = producto(row.productoId);
    const id = row.tiendaId || p.tiendaId || p.defaultTiendaId || '';
    return norm(row.tienda?.nombre || tienda(id).nombre || '') || 'Sin tienda';
  }
  function donorName(row){
    try{ if(typeof donorLabel === 'function' && row.donorRef){ const v = donorLabel(row.donorRef); if(norm(v)) return norm(v); } }catch(_){ }
    const ref = norm(row.donorRef || row.donante || row.donanteNombre || row.donor || '');
    if(ref.startsWith('P:')) return norm(persona(ref.slice(2)).nombre) || 'Persona sin nombre';
    if(ref.startsWith('T:')) return norm(tienda(ref.slice(2)).nombre) || 'Tienda sin nombre';
    return ref || storeName(row) || 'Sin donante';
  }

  function tableHtml(headers, rows){
    const body = (rows && rows.length ? rows : [['Sin registros']]).map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
    return `<div class="ce-budget-lite-table-wrap"><table class="ce-budget-lite-table"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function showTooltip(title, totalLabel, totalValue, table){
    const box = ensureTooltip();
    box.innerHTML = `<button type="button" class="ce-budget-lite-close" aria-label="Cerrar">×</button><div class="ce-budget-lite-title">${esc(title)}</div><div class="ce-budget-lite-total"><span>${esc(totalLabel)}</span><strong>${esc(totalValue)}</strong></div>${table}`;
    box.classList.add('open');
    box.querySelector('.ce-budget-lite-close')?.addEventListener('click', hideTooltip, {once:true});
  }
  function ensureTooltip(){
    let box = $(TOOLTIP_ID);
    if(box) return box;
    box = document.createElement('div');
    box.id = TOOLTIP_ID;
    box.className = 'ce-budget-lite-tooltip-v305';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
    return box;
  }
  function hideTooltip(){
    const box = $(TOOLTIP_ID);
    if(box) box.classList.remove('open');
  }

  function incomeTipForRow(row){
    const label = norm(row.querySelector('span')?.textContent || row.textContent || '');
    const sectionText = row.closest('.budget-subrows')?.previousElementSibling?.textContent || '';
    const noSocio = /NO\s+SOCIOS/i.test(sectionText);
    const base = collabs().filter(item => incomeIsSocio(item) !== noSocio);
    let mode = 'all';
    let title = noSocio ? 'NO SOCIOS' : 'SOCIOS';
    if(/^Personas$/i.test(label)) title += ' / PERSONAS';
    else if(/Importe/i.test(label)) title += noSocio ? ' / IMPORTE NO SOCIO' : ' / IMPORTE SOCIO';
    else if(/Ingresado/i.test(label)){ title += noSocio ? ' / INGRESADO NO SOCIO' : ' / INGRESADO SOCIO'; mode = 'paid'; }
    else if(/Pendiente/i.test(label)){ title += noSocio ? ' / PENDIENTE NO SOCIO' : ' / PENDIENTE SOCIO'; mode = 'pending'; }
    else return null;
    const rows = base.filter(item => {
      if(mode === 'paid') return up(incomeSitu(item)) !== 'PENDIENTE';
      if(mode === 'pending') return up(incomeSitu(item)) === 'PENDIENTE';
      return true;
    }).sort((a,b) => cmp(incomeParts(a).nombre, incomeParts(b).nombre));
    const total = rows.reduce((sum, item) => sum + incomeParts(item).total, 0);
    const table = tableHtml(['Nombre','Nº','Rango','Imp. socio','Imp. voluntario','Ingresado','Pendiente','Total'], rows.map(item => {
      const p = incomeParts(item);
      return [p.nombre, num(p.numero), p.rango || (incomeIsSocio(item) ? 'SOCIO' : 'DONANTE'), money(p.socio), money(p.voluntario), money(p.ingresado), money(p.pendiente), money(p.total)];
    }));
    return {title, totalLabel:'TOTAL', totalValue: money(total), table};
  }

  function donationRows(code){
    const c = up(code);
    return compras().filter(row => up(row.ticketDonacion || row.ticket || '') === c).sort((a,b) => cmp(donorName(a), donorName(b)) || cmp(productName(a), productName(b)));
  }
  function donationTipForCode(title, code){
    const rows = donationRows(code);
    const total = rows.reduce((sum, row) => sum + productValue(row), 0);
    const table = tableHtml(['Donante','Producto','Uds','Precio estimado','Valor estimado'], rows.map(row => [donorName(row), productName(row), num(productUnits(row)), money(productPrice(row)), money(productValue(row))]));
    return {title:`DONACION DE PRODUCTO / ${title}`, totalLabel:'TOTAL ESTIMADO', totalValue: money(total), table};
  }
  function donationTotalTip(){
    const groups = [
      ['TIENDAS','DONADO TIENDA'],
      ['SOCIOS','DONADO SOCIO'],
      ['NO SOCIOS','DONADO OTROS']
    ];
    const rows = [];
    let total = 0;
    groups.forEach(([title, code]) => {
      const value = donationRows(code).reduce((sum, row) => sum + productValue(row), 0);
      total += value;
      rows.push([title, money(value)]);
    });
    return {title:'DONACION DE PRODUCTO / TOTAL', totalLabel:'TOTAL ESTIMADO', totalValue: money(total), table: tableHtml(['Tipo','Valor estimado'], rows)};
  }
  function donationTipForRow(row){
    const text = up(row.textContent || '');
    if(text.includes('VALOR PRODUCTO DONADO')) return donationTotalTip();
    if(text.includes('TIENDA')) return donationTipForCode('TIENDAS', 'DONADO TIENDA');
    if(text.includes('NO SOCIO')) return donationTipForCode('NO SOCIOS', 'DONADO OTROS');
    if(text.includes('SOCIO')) return donationTipForCode('SOCIOS', 'DONADO SOCIO');
    return null;
  }


  function installLegacyTipAttributeFirewall(){
    try{
      if(Element.prototype.setAttribute.__ceV305BudgetTipFirewall) return;
      const nativeSetAttribute = Element.prototype.setAttribute;
      const wrapped = function(name, value){
        try{
          const attr = String(name || '');
          if(LEGACY_TIP_ATTRS.includes(attr) && this?.closest?.('#budgetLayout .budget-panel.socios,#budgetLayout .budget-panel.donantes,#budgetLayout .budget-panel.ce-v305-donantes-lite')){
            return undefined;
          }
        }catch(_){ }
        return nativeSetAttribute.call(this, name, value);
      };
      wrapped.__ceV305BudgetTipFirewall = true;
      Element.prototype.setAttribute = wrapped;
    }catch(_){ }
  }

  function removeLegacyAttributes(root){
    if(!root) return;
    const nodes = [root, ...root.querySelectorAll('*')];
    nodes.forEach(node => LEGACY_TIP_ATTRS.forEach(attr => node.removeAttribute(attr)));
  }
  function sanitizeBudgetPanels(){
    const budget = $('budgetLayout');
    if(!budget) return;
    const donationPanel = budget.querySelector('.budget-panel.donantes');
    if(donationPanel){
      donationPanel.classList.remove('donantes');
      donationPanel.classList.add('ce-v305-donantes-lite');
    }
    budget.querySelectorAll('.budget-panel.socios,.budget-panel.ce-v305-donantes-lite').forEach(panel => {
      removeLegacyAttributes(panel);
      panel.classList.add('ce-v305-budget-lite-panel');
      panel.querySelectorAll('.budget-subrow,.budget-row').forEach(row => {
        const active = panel.classList.contains('socios') ? row.classList.contains('budget-subrow') : (row.classList.contains('budget-subrow') || up(row.textContent).includes('VALOR PRODUCTO DONADO'));
        if(!active) return;
        row.classList.add('ce-v305-budget-lite-row');
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-label', 'Ver detalle');
        removeLegacyAttributes(row);
      });
    });
  }

  function openForTarget(target){
    const row = target?.closest?.('#budgetLayout .ce-v305-budget-lite-row');
    if(!row) return false;
    const panel = row.closest('.budget-panel');
    let tip = null;
    if(panel?.classList.contains('socios')) tip = incomeTipForRow(row);
    else if(panel?.classList.contains('ce-v305-donantes-lite')) tip = donationTipForRow(row);
    if(!tip) return false;
    sanitizeBudgetPanels();
    showTooltip(tip.title, tip.totalLabel, tip.totalValue, tip.table);
    return true;
  }

  document.addEventListener('click', event => {
    const box = $(TOOLTIP_ID);
    if(box && box.classList.contains('open') && box.contains(event.target)) return;
    if(openForTarget(event.target)){
      try{ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
      return;
    }
    if(box && box.classList.contains('open') && !event.target?.closest?.('#budgetLayout .ce-v305-budget-lite-row')) hideTooltip();
  }, true);
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') hideTooltip();
    if((event.key === 'Enter' || event.key === ' ') && openForTarget(event.target)){
      try{ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
    }
  }, true);

  function patchRenderBudget(){
    const old = (typeof window.renderBudget === 'function') ? window.renderBudget : null;
    if(!old || old.__ceV305BudgetLiteWrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      scheduleSanitize();
      return ret;
    };
    wrapped.__ceV305BudgetLiteWrapped = true;
    try{ window.renderBudget = wrapped; renderBudget = wrapped; }catch(_){ window.renderBudget = wrapped; }
  }
  let sanitizeTimer = 0;
  function scheduleSanitize(){
    clearTimeout(sanitizeTimer);
    sanitizeTimer = setTimeout(sanitizeBudgetPanels, 30);
  }
  installLegacyTipAttributeFirewall();
  patchRenderBudget();
  sanitizeBudgetPanels();
  [60, 180, 500, 1100, 2200].forEach(ms => setTimeout(sanitizeBudgetPanels, ms));
  setInterval(sanitizeBudgetPanels, window.ControlEventLowResource?.interval?.(1600) || 1600);
  try{
    const observer = new MutationObserver(() => scheduleSanitize());
    observer.observe(document.documentElement, {childList:true, subtree:true});
  }catch(_){ }
  window.addEventListener('controlevent:runtime-ready', () => { patchRenderBudget(); sanitizeBudgetPanels(); });
  window.ControlEventBudgetLiteTips = {version: VERSION, sanitize: sanitizeBudgetPanels, hide: hideTooltip};
})();
