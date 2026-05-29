/* ControlEvent v2.0-pr - Globos ligeros para RESUMEN PRESUPUESTARIO.
   Corrige la instalación del visor, abre sin esperar a sanitizados tardíos y
   bloquea restos de globos heredados que tapaban pulsaciones en iPad/Android. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v2.0-pr';
  const TOOLTIP_ID = 'ceBudgetLiteTooltipV307';
  const LEGACY_TIP_ATTRS = [
    'title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952',
    'data-ce-tip-v21','data-tip-bg-v21','data-ce-tip-layout-v21','data-ce-tip-lazy-v250',
    'data-ce-tip-bg','data-ce-tip-layout','data-tip-bg-v196','data-tip-bg-v1952','data-tip-bg-v21','data-ce-tip-layout-v20','data-ce-tip-layout-v21','data-ce-tip-layout-v196','data-ce-tip-black'
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

  const LEGACY_TOOLTIP_IDS = ['ceTooltipV181','ceTooltipV190','ceTooltipV1952','ceTooltipV196','ceTooltipV21'];
  let lastOpenAt = 0;
  let sanitizeTimer = 0;
  let lastSanitizeAt = 0;
  const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  function isBudgetLegacyText(text){
    const t = up(text);
    return /\b(SOCIOS|NO SOCIOS)\s*\/\s*(PERSONAS|IMPORTE|INGRESADO|PENDIENTE)/.test(t)
      || /DONACI[OÓ]N\s+DE\s+PRODUCTO\s*\//.test(t)
      || /VALOR\s+PRODUCTO\s+DONADO/.test(t);
  }
  function isActuallyVisible(el){
    if(!el) return false;
    try{
      const cs = window.getComputedStyle ? getComputedStyle(el) : null;
      if(cs && (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity || 1) === 0)) return false;
      if(el.classList?.contains('hidden')) return false;
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }catch(_){ return false; }
  }
  function isBudgetLayoutActive(){
    const budget = $('budgetLayout');
    if(!budget || !isActuallyVisible(budget)) return false;
    const resumen = $('tabResumen');
    if(resumen && !isActuallyVisible(resumen)) return false;
    return true;
  }
  function releaseLegacyTooltipElement(el){
    if(!el) return;
    try{ el.classList.remove('ce-budget-legacy-suppressed-v307'); }catch(_){ }
    try{ el.style.removeProperty('display'); }catch(_){ }
    try{ el.style.removeProperty('visibility'); }catch(_){ }
    try{ el.style.removeProperty('pointer-events'); }catch(_){ }
    try{ el.removeAttribute('aria-hidden'); }catch(_){ }
  }
  function releaseLegacyBudgetTooltipsOutsideResumen(){
    if(isBudgetLayoutActive()) return;
    document.querySelectorAll('.ce-budget-legacy-suppressed-v307').forEach(releaseLegacyTooltipElement);
  }
  function suppressLegacyTooltipElement(el){
    if(!el) return;
    try{ el.classList.add('ce-budget-legacy-suppressed-v307'); }catch(_){ }
    try{ el.style.display = 'none'; }catch(_){ }
    try{ el.style.visibility = 'hidden'; }catch(_){ }
    try{ el.style.pointerEvents = 'none'; }catch(_){ }
    try{ el.setAttribute('aria-hidden', 'true'); }catch(_){ }
  }
  function hideLegacyBudgetTooltips(){
    if(!isBudgetLayoutActive()){
      releaseLegacyBudgetTooltipsOutsideResumen();
      return;
    }
    document.querySelectorAll('.ce-budget-legacy-suppressed-v307').forEach(suppressLegacyTooltipElement);
    LEGACY_TOOLTIP_IDS.forEach(id => {
      const el = $(id);
      if(!el) return;
      const text = el.textContent || '';
      const cls = String(el.className || '');
      const layout = Array.from(el.classList || []).join(' ');
      const looksBudget = isBudgetLegacyText(text) || /budget(income|donation)|budgetdonation|budgetincome/i.test(cls + ' ' + layout);
      if(looksBudget) suppressLegacyTooltipElement(el);
    });
  }
  function stripLegacyAttrs(node){
    try{ LEGACY_TIP_ATTRS.forEach(attr => node.removeAttribute(attr)); }catch(_){ }
  }

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
    hideLegacyBudgetTooltips();
    box.innerHTML = `<button type="button" class="ce-budget-lite-close" aria-label="Cerrar">×</button><div class="ce-budget-lite-title">${esc(title)}</div><div class="ce-budget-lite-total"><span>${esc(totalLabel)}</span><strong>${esc(totalValue)}</strong></div>${table}`;
    box.dataset.ceBudgetOpenedAt = String(Date.now());
    box.dataset.ceBudgetLastTitle = String(title || '');
    box.classList.add('open');
    box.removeAttribute('aria-hidden');
    lastOpenAt = now();
    box.querySelector('.ce-budget-lite-close')?.addEventListener('click', event => { try{ event.preventDefault(); event.stopPropagation(); }catch(_){} hideTooltip(); }, {once:true});
    try{ box.focus({preventScroll:true}); }catch(_){ }
    setTimeout(hideLegacyBudgetTooltips, 0);
    requestAnimationFrame(hideLegacyBudgetTooltips);
  }
  function ensureTooltip(){
    let box = $(TOOLTIP_ID);
    if(box) return box;
    box = document.createElement('div');
    box.id = TOOLTIP_ID;
    box.className = 'ce-budget-lite-tooltip-v306';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    box.setAttribute('tabindex', '-1');
    document.body.appendChild(box);
    return box;
  }
  function hideTooltip(){
    const box = $(TOOLTIP_ID);
    if(box){
      box.classList.remove('open');
      box.setAttribute('aria-hidden', 'true');
    }
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
      if(Element.prototype.setAttribute.__ceV306BudgetTipFirewall) return;
      const nativeSetAttribute = Element.prototype.setAttribute;
      const wrapped = function(name, value){
        try{
          const attr = String(name || '');
          if(LEGACY_TIP_ATTRS.includes(attr) && this?.closest?.('#budgetLayout .budget-panel.socios,#budgetLayout .budget-panel.donantes,#budgetLayout .budget-panel.ce-v306-donantes-lite')){
            return undefined;
          }
        }catch(_){ }
        return nativeSetAttribute.call(this, name, value);
      };
      wrapped.__ceV306BudgetTipFirewall = true;
      Element.prototype.setAttribute = wrapped;
    }catch(_){ }
  }

  function removeLegacyAttributes(root){
    if(!root) return;
    const nodes = [root, ...root.querySelectorAll('*')];
    nodes.forEach(stripLegacyAttrs);
  }
  function sanitizeBudgetPanels(){
    if(!isBudgetLayoutActive()){ releaseLegacyBudgetTooltipsOutsideResumen(); return; }
    const t = now();
    if(t - lastSanitizeAt < 20) return;
    lastSanitizeAt = t;
    hideLegacyBudgetTooltips();
    const budget = $('budgetLayout');
    if(!budget) return;
    const donationPanel = budget.querySelector('.budget-panel.donantes');
    if(donationPanel){
      donationPanel.classList.remove('donantes');
      donationPanel.classList.add('ce-v306-donantes-lite');
    }
    budget.querySelectorAll('.budget-panel.socios,.budget-panel.ce-v306-donantes-lite').forEach(panel => {
      removeLegacyAttributes(panel);
      panel.classList.add('ce-v306-budget-lite-panel');
      panel.querySelectorAll('.budget-subrow,.budget-row').forEach(row => {
        const active = panel.classList.contains('socios') ? row.classList.contains('budget-subrow') : (row.classList.contains('budget-subrow') || up(row.textContent).includes('VALOR PRODUCTO DONADO'));
        if(!active) return;
        row.classList.add('ce-v306-budget-lite-row');
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-label', 'Ver detalle');
        removeLegacyAttributes(row);
      });
    });
  }

  function isBudgetPanel(panel){
    if(!panel) return false;
    const text = up(panel.querySelector('h3')?.textContent || panel.textContent || '');
    return panel.classList.contains('socios')
      || panel.classList.contains('donantes')
      || panel.classList.contains('ce-v306-donantes-lite')
      || /INGRESOS\s+EN\s+DINERO|DONACION\s+DE\s+PRODUCTO|DONACI[OÓ]N\s+DE\s+PRODUCTO/.test(text);
  }
  function isDonationPanel(panel){
    if(!panel) return false;
    const text = up(panel.querySelector('h3')?.textContent || panel.textContent || '');
    return panel.classList.contains('donantes')
      || panel.classList.contains('ce-v306-donantes-lite')
      || /DONACION\s+DE\s+PRODUCTO|DONACI[OÓ]N\s+DE\s+PRODUCTO/.test(text);
  }
  function isIncomePanel(panel){
    if(!panel) return false;
    const text = up(panel.querySelector('h3')?.textContent || panel.textContent || '');
    return panel.classList.contains('socios') || /INGRESOS\s+EN\s+DINERO|SOCIOS|NO\s+SOCIOS/.test(text);
  }
  function findBudgetRow(target){
    if(!isBudgetLayoutActive()) return null;
    const row = target?.closest?.('#budgetLayout .ce-v306-budget-lite-row,#budgetLayout .budget-subrow,#budgetLayout .budget-row');
    if(!row) return null;
    const panel = row.closest('.budget-panel');
    if(!isBudgetPanel(panel)) return null;
    return row;
  }
  function openForTarget(target){
    hideLegacyBudgetTooltips();
    const row = findBudgetRow(target);
    if(!row) return false;
    const panel = row.closest('.budget-panel');
    let tip = null;
    if(isIncomePanel(panel)) tip = incomeTipForRow(row);
    if(!tip && isDonationPanel(panel)) tip = donationTipForRow(row);
    if(!tip) return false;
    row.classList.add('ce-v306-budget-lite-row');
    try{ row.setAttribute('role', 'button'); row.setAttribute('tabindex', '0'); }catch(_){ }
    sanitizeBudgetPanels();
    hideLegacyBudgetTooltips();
    showTooltip(tip.title, tip.totalLabel, tip.totalValue, tip.table);
    return true;
  }

  function shouldIgnoreActivation(event){
    if(event?.target?.closest?.('.ce-v465-modal,[data-ce-preserve-tooltip]')) return true;
    const box = $(TOOLTIP_ID);
    if(box && box.classList.contains('open') && box.contains(event.target)) return true;
    if(now() - lastOpenAt < 80) return true;
    return false;
  }
  function activateFromEvent(event){
    if(shouldIgnoreActivation(event)) return false;
    if(openForTarget(event.target)){
      try{ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
      setTimeout(hideLegacyBudgetTooltips, 0);
      return true;
    }
    return false;
  }
  document.addEventListener('pointerup', event => {
    if(activateFromEvent(event)) return;
  }, true);
  document.addEventListener('touchend', event => {
    if(activateFromEvent(event)) return;
  }, {capture:true, passive:false});
  document.addEventListener('click', event => {
    if(event.target?.closest?.('.ce-v465-modal,[data-ce-preserve-tooltip]')) return;
    const box = $(TOOLTIP_ID);
    if(box && box.classList.contains('open') && box.contains(event.target)) return;
    if(activateFromEvent(event)) return;
    if(box && box.classList.contains('open') && !event.target?.closest?.('#budgetLayout .ce-v306-budget-lite-row')) hideTooltip();
    hideLegacyBudgetTooltips();
  }, true);
  document.addEventListener('pointerdown', event => {
    if(event.target?.closest?.('.ce-v465-modal,[data-ce-preserve-tooltip]')) return;
    const box = $(TOOLTIP_ID);
    if(box && box.classList.contains('open') && !box.contains(event.target) && !event.target?.closest?.('#budgetLayout .ce-v306-budget-lite-row')) hideTooltip();
    hideLegacyBudgetTooltips();
  }, true);
  document.addEventListener('focusin', event => {
    if(event.target?.closest?.('.ce-v465-modal,[data-ce-preserve-tooltip]')) return;
    const box = $(TOOLTIP_ID);
    if(box && box.classList.contains('open') && !box.contains(event.target) && !event.target?.closest?.('#budgetLayout .ce-v306-budget-lite-row')) hideTooltip();
    hideLegacyBudgetTooltips();
  }, true);
  document.addEventListener('keydown', event => {
    if(document.querySelector('.ce-v465-modal,[data-ce-preserve-tooltip]')) return;
    if(event.key === 'Escape') hideTooltip();
    if((event.key === 'Enter' || event.key === ' ') && activateFromEvent(event)) return;
  }, true);
  window.addEventListener('resize', hideTooltip, true);
  window.addEventListener('orientationchange', hideTooltip, true);
  window.addEventListener('scroll', event => {
    // v46.8: no cerrar globos al mover la ruleta o el ascensor.
    // Se cierran solo al pulsar fuera/perder foco o con Escape.
    const box = $(TOOLTIP_ID);
    if(box && box.classList.contains('open')) return;
  }, true);
  document.addEventListener('visibilitychange', hideTooltip, true);

  document.addEventListener('click', event => {
    if(event.target?.closest?.('#tabGraficas')){
      releaseLegacyBudgetTooltipsOutsideResumen();
      const box = $(TOOLTIP_ID);
      if(box) hideTooltip();
    }
  }, false);

  function patchRenderBudget(){
    const old = (typeof window.renderBudget === 'function') ? window.renderBudget : null;
    if(!old || old.__ceV306BudgetLiteWrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      scheduleSanitize();
      return ret;
    };
    wrapped.__ceV306BudgetLiteWrapped = true;
    try{ window.renderBudget = wrapped; renderBudget = wrapped; }catch(_){ window.renderBudget = wrapped; }
  }
  function scheduleSanitize(){
    clearTimeout(sanitizeTimer);
    sanitizeTimer = setTimeout(sanitizeBudgetPanels, 0);
  }
  function rehydrateBudgetLite(reason){
    try{ patchRenderBudget(); }catch(_){ }
    try{ sanitizeBudgetPanels(); }catch(_){ }
    try{ hideLegacyBudgetTooltips(); }catch(_){ }
  }
  try{ document.body.classList.add('ce-budget-tips-lite-active-v307'); }catch(_){ }
  installLegacyTipAttributeFirewall();
  patchRenderBudget();
  sanitizeBudgetPanels();
  [0, 80, 240, 700, 1400].forEach(ms => setTimeout(() => rehydrateBudgetLite('startup'), ms));
  ['controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-ready'].forEach(evt => {
    window.addEventListener(evt, () => setTimeout(() => rehydrateBudgetLite(evt), 60));
  });
  document.addEventListener('click', event => {
    if(event.target?.closest?.('#tabResumenBtn,.mobile-menu-action[data-target="tabResumenBtn"]')) setTimeout(() => rehydrateBudgetLite('resumen-tab'), 180);
  }, true);
  window.ControlEventBudgetLiteTips = {version: VERSION, sanitize: sanitizeBudgetPanels, rehydrate: rehydrateBudgetLite, hide: hideTooltip};
})();
