/* ControlEvent v32.0 - Planificación inicial por histórico de COMPRAS.
   Primera versión: genera una propuesta revisable, sin grabar datos reales. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v32.0';
  const TAB_BUTTON_ID = 'tabPlanificacionBtn';
  const PANEL_ID = 'tabPlanificacionInicial';
  const KNOWN_BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabPlanificacionBtn','tabResumenBtn','tabGraficasBtn'];
  const KNOWN_PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','noEventMessage'];
  const JUERGA = [
    {id:'BARATO', nombre:'Barato', precio:10},
    {id:'CONSERVADOR', nombre:'Conservador', precio:20},
    {id:'CARILLO', nombre:'Carillo', precio:30},
    {id:'LUJO', nombre:'De lujo', precio:40}
  ];
  const FUENTES = [
    {id:'ALL', nombre:'Todos los eventos anteriores'},
    {id:'LAST3', nombre:'Últimos 3 eventos'},
    {id:'BASE', nombre:'Elegir evento base'}
  ];
  const NIVELES = [
    {id:'HABITUALES', nombre:'Muy habituales y habituales'},
    {id:'TODOS', nombre:'Todo lo comprado anteriormente'},
    {id:'MUY', nombre:'Solo productos muy habituales'}
  ];
  const DONATION_TYPES = ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'];
  let initialized = false;
  let lastProposal = [];

  function app(){ return window.ControlEventApp || window.ControlEventRuntime?.app || null; }
  function state(){ return app()?.state || window.state || {}; }
  function auth(){ return app()?.authUser || window.authUser || null; }
  function isGD(){ return String(auth()?.nivel || '').toUpperCase() === 'GD'; }
  function rows(name){ const value = state()[name]; return Array.isArray(value) ? value : []; }
  function byId(name, id){ const sid = String(id || ''); return rows(name).find(item => String(item.id || '') === sid) || null; }
  function esc(value){ return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
  function up(value){ return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase(); }
  function money(value){
    try{ if(typeof window.money === 'function') return window.money(value); }catch(_){ }
    return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value || 0));
  }
  function qty(value){ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(value || 0)); }
  function parseNum(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').replace(/€/g,'').replace(/\s/g,'').trim();
    if(!s) return 0;
    const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if(c !== -1 && d !== -1) s = c > d ? s.replace(/\./g,'').replace(',', '.') : s.replace(/,/g,'');
    else if(c !== -1) s = s.replace(/\./g,'').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function normalizeText(value){ return up(value).replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
  function productOf(row){ return byId('productos', row?.productoId) || null; }
  function tiendaOf(id){ return byId('tiendas', id) || null; }
  function personaOf(id){ return byId('personas', id) || null; }
  function productName(row){ return productOf(row)?.nombre || row?.producto || 'Producto sin nombre'; }
  function segmentName(row){ return productOf(row)?.segmento || row?.segmento || 'Sin segmento'; }
  function destinoName(row){ return productOf(row)?.destino || row?.destino || 'Sin destino'; }
  function tiendaName(id){ return tiendaOf(id)?.nombre || 'Sin tienda'; }
  function personaName(id){ return personaOf(id)?.nombre || 'Sin responsable'; }
  function rowResponsible(row){ return String(row?.responsableId || row?.responsable || row?.socioResponsableId || ''); }
  function rowTienda(row){
    const p = productOf(row) || {};
    return String(row?.tiendaId || p.tiendaId || p.defaultTiendaId || '');
  }
  function isDonation(row){ return DONATION_TYPES.includes(String(row?.ticketDonacion || row?.ticket || '').trim()); }
  function unitPrice(row){
    const p = productOf(row) || {};
    const candidates = [row?.precio, p.precio, p.precioReferencia, p.defaultPrecio];
    for(const item of candidates){ const n = parseNum(item); if(Number.isFinite(n) && n > 0) return n; }
    return 0;
  }
  function rowValue(row){ return Number(row?.unidades || 0) * unitPrice(row); }
  function parseDate(value){
    const s = String(value || '').trim();
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if(m){
      const d = Number(m[1]), mo = Number(m[2]) - 1;
      let y = Number(m[3]); if(y < 100) y += 2000;
      const dt = new Date(y, mo, d);
      if(dt && dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m){
      const y = Number(m[1]), mo = Number(m[2])-1, d = Number(m[3]);
      const dt = new Date(y, mo, d);
      if(dt && dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
    }
    return null;
  }
  function daysBetween(start, end){
    const a = parseDate(start), b = parseDate(end || start);
    if(!a || !b) return 1;
    const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate());
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }
  function eventDays(event){ return daysBetween(event?.fechaIni, event?.fechaFin || event?.fechaIni); }
  function dateKey(event){
    const d = parseDate(event?.fechaIni || '');
    return d ? d.getTime() : 0;
  }
  function peopleForEvent(eventId){
    const items = rows('colaboradores').filter(c => String(c.eventId || '') === String(eventId || ''));
    const total = items.reduce((sum, row) => sum + Math.max(0, Number(row.numero || 0)), 0);
    return total > 0 ? total : 0;
  }
  function confidence(countEvents, totalEvents){
    if(totalEvents <= 1) return countEvents >= 1 ? 'Solo evento base' : 'Ocasional';
    const ratio = countEvents / totalEvents;
    if(countEvents >= 4 || ratio >= 0.7) return 'Muy habitual';
    if(countEvents >= 2 || ratio >= 0.35) return 'Habitual';
    return 'Ocasional';
  }
  function confidenceClass(value){
    const t = up(value);
    if(t.includes('MUY')) return 'alta';
    if(t.includes('HABITUAL')) return 'media';
    return 'baja';
  }
  function mostFrequent(items){
    const map = new Map();
    items.filter(Boolean).forEach(id => map.set(String(id), (map.get(String(id)) || 0) + 1));
    let best = '', score = -1;
    map.forEach((count, id) => { if(count > score){ best = id; score = count; } });
    return best;
  }
  function latestByEventDate(items){
    return items.slice().sort((a,b)=>dateKey(byId('eventos', b.eventId)) - dateKey(byId('eventos', a.eventId)))[0] || null;
  }
  function selectedJuerga(){ return JUERGA.find(j => j.id === document.getElementById('planTipoJuerga')?.value) || JUERGA[1]; }
  function getNewDays(){
    const manual = Math.max(1, Number(document.getElementById('planDias')?.value || 1));
    return Number.isFinite(manual) && manual > 0 ? Math.round(manual) : 1;
  }
  function setOptions(select, options, value){
    if(!select) return;
    const current = value ?? select.value;
    select.innerHTML = options.map(opt => `<option value="${esc(opt.value)}">${esc(opt.label)}</option>`).join('');
    if(options.some(opt => String(opt.value) === String(current))) select.value = String(current);
  }
  function socios(){
    return rows('personas').filter(p => up(p.rango || '') === 'SOCIO').slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
  }
  function tiendas(){ return rows('tiendas').slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es')); }
  function eventosOrdenados(){ return rows('eventos').slice().sort((a,b)=>dateKey(b)-dateKey(a)); }

  function initForm(){
    setOptions(document.getElementById('planTipoJuerga'), JUERGA.map(j => ({value:j.id, label:`${j.nombre} · ${money(j.precio)} por persona`})), 'CONSERVADOR');
    setOptions(document.getElementById('planFuenteHistorica'), FUENTES.map(f => ({value:f.id, label:f.nombre})), 'LAST3');
    setOptions(document.getElementById('planNivelPropuesta'), NIVELES.map(n => ({value:n.id, label:n.nombre})), 'HABITUALES');
    const socioOptions = socios().map(p => ({value:p.id, label:p.nombre || 'Socio sin nombre'}));
    setOptions(document.getElementById('planResponsable'), socioOptions.length ? socioOptions : [{value:'', label:'Sin socios disponibles'}]);
    const tiendaOptions = tiendas().map(t => ({value:t.id, label:t.nombre || 'Tienda sin nombre'}));
    setOptions(document.getElementById('planTienda'), tiendaOptions.length ? tiendaOptions : [{value:'', label:'Sin tiendas disponibles'}]);
    const events = eventosOrdenados();
    setOptions(document.getElementById('planEventoBase'), events.map(e => ({value:e.id, label:`${e.fechaIni || '--/--/--'} · ${e.titulo || 'Evento sin título'}`})), events[0]?.id || '');
    syncBaseEventAvailability();
  }
  function syncBaseEventAvailability(){
    const source = document.getElementById('planFuenteHistorica')?.value || 'LAST3';
    const base = document.getElementById('planEventoBase');
    if(base) base.disabled = source !== 'BASE';
  }
  function updateDaysFromDates(){
    const ini = document.getElementById('planFechaIni')?.value;
    const fin = document.getElementById('planFechaFin')?.value;
    const days = daysBetween(ini, fin || ini);
    const field = document.getElementById('planDias');
    if(field && ini && fin) field.value = String(days);
  }
  function historicalEventIds(){
    const source = document.getElementById('planFuenteHistorica')?.value || 'LAST3';
    const all = eventosOrdenados();
    if(source === 'BASE'){
      const id = document.getElementById('planEventoBase')?.value || '';
      return id ? [id] : [];
    }
    if(source === 'LAST3') return all.slice(0,3).map(e => e.id);
    return all.map(e => e.id);
  }
  function groupHistoricalRows(){
    const eventIds = new Set(historicalEventIds().map(String));
    const totalEvents = Math.max(1, eventIds.size);
    const newDays = getNewDays();
    const newPeople = Math.max(1, Number(document.getElementById('planPersonas')?.value || 1));
    const defaultTienda = document.getElementById('planTienda')?.value || '';
    const defaultResponsable = document.getElementById('planResponsable')?.value || '';
    const compraRows = rows('compras').filter(row => eventIds.has(String(row.eventId || '')) && !isDonation(row));
    const groups = new Map();
    compraRows.forEach(row => {
      const prod = productOf(row);
      const key = prod?.id ? `id:${prod.id}` : `name:${normalizeText(productName(row))}`;
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    const proposals = [];
    groups.forEach((items, key) => {
      const latest = latestByEventDate(items) || items[0];
      const product = productOf(latest) || {};
      const eventSet = new Set(items.map(row => String(row.eventId || '')));
      const eventCount = eventSet.size;
      const conf = confidence(eventCount, totalEvents);
      const qtySamples = items.map(row => {
        const ev = byId('eventos', row.eventId) || {};
        const histDays = Math.max(1, eventDays(ev));
        const histPeople = peopleForEvent(row.eventId);
        const basePerDay = Number(row.unidades || 0) / histDays;
        let q = basePerDay * newDays;
        if(histPeople > 0) q = q * (newPeople / histPeople);
        return Number.isFinite(q) ? q : Number(row.unidades || 0);
      }).filter(n => Number.isFinite(n) && n > 0);
      const suggestedQty = qtySamples.length ? qtySamples.reduce((a,b)=>a+b,0) / qtySamples.length : Number(latest?.unidades || 1) || 1;
      const priceRef = unitPrice(latest);
      const tiendaId = mostFrequent(items.map(rowTienda)) || defaultTienda;
      const responsableId = mostFrequent(items.map(rowResponsible).filter(id => up(personaOf(id)?.rango || '') === 'SOCIO')) || defaultResponsable;
      const include = document.getElementById('planNivelPropuesta')?.value === 'TODOS'
        ? true
        : document.getElementById('planNivelPropuesta')?.value === 'MUY'
          ? conf === 'Muy habitual'
          : conf !== 'Ocasional' || totalEvents <= 1;
      proposals.push({
        key,
        include,
        productId: product.id || '',
        productName: product.nombre || productName(latest),
        segmento: product.segmento || segmentName(latest),
        destino: product.destino || destinoName(latest),
        unidades: Math.max(0.01, Math.round(suggestedQty * 100) / 100),
        precio: priceRef,
        tiendaId,
        responsableId,
        eventCount,
        totalEvents,
        confidence: conf,
        reason: `${eventCount} de ${totalEvents} evento(s) analizados · cantidades ajustadas a ${newDays} día(s)${newPeople ? ` y ${newPeople} persona(s) previstas` : ''}`
      });
    });
    return proposals.sort((a,b) => {
      const c = ['Muy habitual','Habitual','Solo evento base','Ocasional'];
      return (c.indexOf(a.confidence) - c.indexOf(b.confidence)) || a.segmento.localeCompare(b.segmento,'es') || a.productName.localeCompare(b.productName,'es');
    });
  }
  function renderProposal(){
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    const title = document.getElementById('planEventoTitulo')?.value.trim() || 'Nuevo evento sin título';
    const juerga = selectedJuerga();
    const personas = Math.max(1, Number(document.getElementById('planPersonas')?.value || 1));
    const presupuesto = personas * juerga.precio;
    const proposals = lastProposal;
    const included = proposals.filter(p => p.include);
    const totalCompras = included.reduce((sum,p)=>sum + Number(p.unidades || 0) * Number(p.precio || 0), 0);
    const sourceLabel = FUENTES.find(f => f.id === (document.getElementById('planFuenteHistorica')?.value || ''))?.nombre || 'Histórico';
    const cards = proposals.length ? proposals.map((p, index) => renderProposalRow(p, index)).join('') : '<div class="empty">No hay compras históricas suficientes para generar propuesta con los criterios elegidos.</div>';
    box.classList.remove('hidden');
    box.innerHTML = `
      <div class="plan-summary-grid">
        <div class="plan-metric"><span>Evento previsto</span><strong>${esc(title)}</strong><small>${esc(sourceLabel)}</small></div>
        <div class="plan-metric"><span>Presupuesto ingresos</span><strong>${money(presupuesto)}</strong><small>${personas} personas × ${money(juerga.precio)}</small></div>
        <div class="plan-metric"><span>Duración</span><strong>${getNewDays()} día(s)</strong><small>Factor usado para ajustar cantidades</small></div>
        <div class="plan-metric"><span>Compras propuestas</span><strong>${money(totalCompras)}</strong><small>${included.length} de ${proposals.length} productos incluidos</small></div>
      </div>
      <div class="plan-actions-line">
        <button type="button" class="outline" id="btnPlanSelectAll">Incluir todo</button>
        <button type="button" class="outline" id="btnPlanSelectHabitual">Solo habituales</button>
        <button type="button" class="outline" id="btnPlanSelectNone">Quitar todo</button>
        <button type="button" class="secondary" id="btnPlanApplyDisabled" disabled title="Se activará en la siguiente versión cuando validemos la propuesta">Crear evento desde planificación · próxima versión</button>
      </div>
      <div class="plan-proposal-list">${cards}</div>
    `;
    bindProposalControls();
  }
  function renderProposalRow(p, index){
    const tiendasOpts = tiendas().map(t => `<option value="${esc(t.id)}" ${String(t.id)===String(p.tiendaId)?'selected':''}>${esc(t.nombre || 'Tienda')}</option>`).join('');
    const sociosOpts = socios().map(s => `<option value="${esc(s.id)}" ${String(s.id)===String(p.responsableId)?'selected':''}>${esc(s.nombre || 'Socio')}</option>`).join('');
    const importe = Number(p.unidades || 0) * Number(p.precio || 0);
    return `
      <div class="plan-product-card ${p.include ? '' : 'excluded'}" data-plan-index="${index}">
        <div class="plan-product-head">
          <label class="plan-include"><input type="checkbox" data-plan-field="include" ${p.include ? 'checked' : ''}/> Incluir</label>
          <div class="plan-product-title"><strong>${esc(p.productName)}</strong><span>${esc(p.segmento)} · ${esc(p.destino)}</span></div>
          <span class="plan-confidence ${confidenceClass(p.confidence)}">${esc(p.confidence)}</span>
        </div>
        <div class="plan-product-grid">
          <div class="field"><label>Unidades sugeridas</label><input type="number" min="0" step="0.01" value="${esc(p.unidades)}" data-plan-field="unidades" /></div>
          <div class="field"><label>Precio ref./histórico</label><input type="number" min="0" step="0.01" value="${esc(p.precio)}" data-plan-field="precio" /></div>
          <div class="field"><label>Importe previsto</label><input readonly class="soft-readonly" value="${esc(money(importe))}" data-plan-output="importe" /></div>
          <div class="field"><label>Tienda propuesta</label><select data-plan-field="tiendaId">${tiendasOpts || '<option value="">Sin tiendas</option>'}</select></div>
          <div class="field"><label>Responsable propuesto</label><select data-plan-field="responsableId">${sociosOpts || '<option value="">Sin socios</option>'}</select></div>
        </div>
        <div class="plan-reason">${esc(p.reason)}</div>
      </div>
    `;
  }
  function bindProposalControls(){
    const box = document.getElementById('planificacionResultado');
    if(!box) return;
    box.querySelectorAll('[data-plan-index]').forEach(card => {
      const idx = Number(card.dataset.planIndex);
      card.querySelectorAll('[data-plan-field]').forEach(input => {
        input.addEventListener('change', () => updateProposalFromCard(idx, card));
        input.addEventListener('input', () => {
          if(input.dataset.planField === 'unidades' || input.dataset.planField === 'precio') updateProposalFromCard(idx, card, true);
        });
      });
    });
    const setIncluded = mode => {
      lastProposal = lastProposal.map(p => ({...p, include: mode === 'all' ? true : mode === 'none' ? false : p.confidence !== 'Ocasional'}));
      renderProposal();
    };
    document.getElementById('btnPlanSelectAll')?.addEventListener('click', () => setIncluded('all'));
    document.getElementById('btnPlanSelectNone')?.addEventListener('click', () => setIncluded('none'));
    document.getElementById('btnPlanSelectHabitual')?.addEventListener('click', () => setIncluded('habitual'));
  }
  function updateProposalFromCard(idx, card, light){
    const p = lastProposal[idx];
    if(!p) return;
    card.querySelectorAll('[data-plan-field]').forEach(input => {
      const field = input.dataset.planField;
      if(field === 'include') p.include = !!input.checked;
      else if(field === 'unidades' || field === 'precio') p[field] = Math.max(0, Number(input.value || 0));
      else p[field] = input.value;
    });
    card.classList.toggle('excluded', !p.include);
    const out = card.querySelector('[data-plan-output="importe"]');
    if(out) out.value = money(Number(p.unidades || 0) * Number(p.precio || 0));
    if(!light) setTimeout(renderProposal, 0);
  }
  function generateProposal(){
    if(!isGD()) return;
    lastProposal = groupHistoricalRows();
    renderProposal();
    document.getElementById('planificacionResultado')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function showPlanificacion(){
    if(!isGD()){
      try{ alert('Planificación inicial solo está disponible para usuarios GD.'); }catch(_){ }
      return false;
    }
    ensureReady();
    KNOWN_PANELS.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    document.getElementById('maintenanceWrapper')?.classList.add('hidden');
    document.getElementById(PANEL_ID)?.classList.remove('hidden');
    KNOWN_BUTTONS.forEach(id => document.getElementById(id)?.classList.toggle('active', id === TAB_BUTTON_ID));
    document.querySelectorAll('.mobile-menu-action').forEach(el => el.classList.toggle('primary', el.dataset.target === TAB_BUTTON_ID));
    initForm();
    setTimeout(() => document.getElementById(PANEL_ID)?.scrollIntoView({behavior:'smooth', block:'start'}), 20);
    return false;
  }
  function hideByRole(){
    const visible = isGD();
    const btn = document.getElementById(TAB_BUTTON_ID);
    if(btn){ btn.classList.toggle('hidden', !visible); btn.style.display = visible ? '' : 'none'; }
    document.querySelectorAll(`.mobile-menu-action[data-target="${TAB_BUTTON_ID}"]`).forEach(el => { el.classList.toggle('hidden', !visible); el.style.display = visible ? '' : 'none'; });
    const panel = document.getElementById(PANEL_ID);
    if(panel && !visible) panel.classList.add('hidden');
  }
  function ensureMobileButton(){
    const drawer = document.getElementById('ceMobileDrawer') || document.querySelector('.mobile-menu-drawer');
    const grid = drawer?.querySelector?.('.mobile-menu-grid') || document.querySelector('.mobile-menu-grid');
    if(!grid || grid.querySelector(`[data-target="${TAB_BUTTON_ID}"]`)) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mobile-menu-action';
    btn.dataset.target = TAB_BUTTON_ID;
    btn.innerHTML = '<span class="mi">🧠</span>Planificación inicial';
    const ref = grid.querySelector('[data-target="tabMapaBtn"]') || grid.querySelector('[data-target="tabResumenBtn"]');
    if(ref && ref.parentNode === grid) grid.insertBefore(btn, ref.nextSibling);
    else grid.appendChild(btn);
    btn.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); closeMobileMenu(); showPlanificacion(); }, true);
  }
  function closeMobileMenu(){
    document.body.classList.remove('mobile-menu-open');
    document.getElementById('ceMobileDrawer')?.classList.add('hidden');
    document.getElementById('ceMobileOverlay')?.classList.add('hidden');
  }
  function bindOnce(element, eventName, handler, options){
    if(!element) return;
    const key = `__cePlanV320_${eventName}`;
    if(element[key]) return;
    element[key] = true;
    element.addEventListener(eventName, handler, options);
  }
  function bindEvents(){
    const btn = document.getElementById(TAB_BUTTON_ID);
    bindOnce(btn, 'click', event => { event.preventDefault(); event.stopPropagation(); showPlanificacion(); }, true);
    bindOnce(document.getElementById('btnGenerarPlanificacion'), 'click', generateProposal);
    bindOnce(document.getElementById('planFuenteHistorica'), 'change', syncBaseEventAvailability);
    bindOnce(document.getElementById('planFechaIni'), 'change', updateDaysFromDates);
    bindOnce(document.getElementById('planFechaFin'), 'change', updateDaysFromDates);
    if(!document.__cePlanMobileClickV320){
      document.__cePlanMobileClickV320 = true;
      document.addEventListener('click', event => {
        const mobile = event.target?.closest?.(`.mobile-menu-action[data-target="${TAB_BUTTON_ID}"]`);
        if(mobile){ event.preventDefault(); event.stopPropagation(); closeMobileMenu(); showPlanificacion(); }
      }, true);
    }
  }
  function ensureReady(){
    if(!document.getElementById(PANEL_ID)) return;
    bindEvents();
    ensureMobileButton();
    hideByRole();
  }
  function install(){
    if(initialized) return;
    initialized = true;
    ensureReady();
    window.showPlanificacionInicial = showPlanificacion;
    window.renderPlanificacionInicial = ensureReady;
    window.addEventListener('controlevent:app-ready', ensureReady);
    window.addEventListener('controlevent:runtime-ready', ensureReady);
    setInterval(ensureReady, window.ControlEventLowResource?.interval?.(1800) || 1800);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
