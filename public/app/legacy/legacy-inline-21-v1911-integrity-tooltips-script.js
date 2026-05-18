/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #21. */
/* ==== V19.1.1: parte de v19.0; bloqueo real de dependencias y globos restaurados ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const DELETE_BLOCK_MSG = 'No se pueden eliminar datos sin previamente eliminar sus dependencia';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch));
  const moneyF = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const numF = v => {
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0, maximumFractionDigits:2}).format(Number(v || 0)); }
    catch(_){ return String(v ?? ''); }
  };
  function getState(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  }
  function getSelectedEventId(){
    const st = getState();
    try{ const ev = (typeof selectedEvent === 'function') ? selectedEvent() : null; if(ev && ev.id) return String(ev.id); }catch(_){ }
    return String(st.selectedEventId || '');
  }
  function rowsForEvent(){
    try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ }
    const st = getState(); const evId = getSelectedEventId();
    return (st.compras || []).filter(c => String(c.eventId || '') === evId);
  }
  function collabsForCurrentEvent(){
    try{ if(typeof collabsForEvent === 'function') return collabsForEvent() || []; }catch(_){ }
    const st = getState(); const evId = getSelectedEventId();
    return (st.colaboradores || []).filter(c => String(c.eventId || '') === evId);
  }
  function findById(listName, id){
    const st = getState();
    return (st[listName] || []).find(x => String(x.id) === String(id)) || {};
  }
  function personaName(id){
    try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p && p.nombre) return p.nombre; }catch(_){ }
    return findById('personas', id).nombre || '';
  }
  function tiendaName(id){
    try{ const t = (typeof tiendaById === 'function') ? tiendaById(id) : null; if(t && t.nombre) return t.nombre; }catch(_){ }
    return findById('tiendas', id).nombre || '';
  }
  function productoObj(id){
    try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return p; }catch(_){ }
    return findById('productos', id);
  }
  function productoName(c){
    try{ if(typeof productNameV171 === 'function') return productNameV171(c); }catch(_){ }
    try{ if(typeof productNameV164 === 'function') return productNameV164(c); }catch(_){ }
    return c?.producto?.nombre || productoObj(c?.productoId).nombre || 'Producto';
  }
  function productoPrice(c){
    const p = productoObj(c?.productoId);
    return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
  }
  function productoValue(c){
    try{ if(typeof valueCompraV171 === 'function') return Number(valueCompraV171(c) || 0); }catch(_){ }
    try{ if(typeof valueCompraV164 === 'function') return Number(valueCompraV164(c) || 0); }catch(_){ }
    return Number(c?.valor != null ? c.valor : productoPrice(c) * Number(c?.unidades || 0));
  }
  function storeName(c){
    try{ if(typeof storeNameV171 === 'function'){ const v = storeNameV171(c); if(norm(v)) return v; } }catch(_){ }
    try{ if(typeof storeNameV164 === 'function'){ const v = storeNameV164(c); if(norm(v)) return v; } }catch(_){ }
    return c?.tienda?.nombre || tiendaName(c?.tiendaId) || 'Sin tienda';
  }
  function donorName(c){
    try{ if(typeof resolveDonorNameV171 === 'function'){ const v = resolveDonorNameV171(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    try{ if(typeof resolveDonorNameV164 === 'function'){ const v = resolveDonorNameV164(c); if(norm(v) && normUp(v) !== 'SIN TIENDA') return v; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personaName(raw.slice(2)) || 'Sin donante';
    if(raw.startsWith('T:')) return tiendaName(raw.slice(2)) || 'Sin donante';
    return raw || 'Sin donante';
  }
  function isDon(v){
    try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ }
    return normUp(v).startsWith('DONADO');
  }
  function ticket(c){ return norm(c?.ticketDonacion) || ''; }
  function compareText(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function setTip(el, text, bg, forceBlack=true){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip', text);
    el.setAttribute('data-tip-bg', bg || '#ffffff');
    if(forceBlack) el.setAttribute('data-ce-tip-black', '1');
    el.removeAttribute('title');
    el.removeAttribute('data-tip');
    el.removeAttribute('data-v181-tip');
  }
  function forceBlackTooltipFromTarget(target){
    const el = target?.closest?.('[data-ce-tip-black="1"]');
    if(!el) return;
    setTimeout(() => {
      const tip = $('ceTooltipV190');
      if(tip && tip.style.display !== 'none'){
        tip.style.color = '#111827';
        tip.style.borderColor = 'rgba(15,23,42,.18)';
      }
    }, 0);
  }
  document.addEventListener('mouseover', e => forceBlackTooltipFromTarget(e.target), true);
  document.addEventListener('focusin', e => forceBlackTooltipFromTarget(e.target), true);

  function hasDependency(action, id){
    const st = getState();
    const sid = String(id || '');
    if(!sid) return false;
    const cols = st.colaboradores || [];
    const buys = st.compras || [];
    const persons = st.personas || [];
    const stores = st.tiendas || [];
    const products = st.productos || [];
    if(action === 'delete-persona'){
      return cols.some(c => String(c.personaId || '') === sid)
        || buys.some(c => String(c.responsableId || '') === sid || String(c.personaId || '') === sid || String(c.donorRef || '') === `P:${sid}` || String(c.donanteId || '') === sid);
    }
    if(action === 'delete-producto'){
      return buys.some(c => String(c.productoId || '') === sid);
    }
    if(action === 'delete-tienda'){
      return products.some(p => String(p.tiendaId || '') === sid || String(p.defaultTiendaId || '') === sid)
        || buys.some(c => String(c.tiendaId || '') === sid || String(c.storeId || '') === sid || String(c.donorRef || '') === `T:${sid}`);
    }
    if(action === 'delete-evento'){
      return cols.some(c => String(c.eventId || '') === sid)
        || buys.some(c => String(c.eventId || '') === sid)
        || persons.some(p => String(p.eventId || '') === sid)
        || stores.some(t => String(t.eventId || '') === sid)
        || products.some(p => String(p.eventId || '') === sid)
        || Object.keys(st.ticketImages || {}).some(k => String(k).startsWith(`${sid}|`));
    }
    return false;
  }
  function blockDeleteIfNeeded(e){
    const btn = e.target.closest?.('button[data-action]');
    if(!btn) return;
    const action = btn.dataset.action || '';
    if(!/^delete-(persona|producto|tienda|evento)$/.test(action)) return;
    if(hasDependency(action, btn.dataset.id)){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      alert(DELETE_BLOCK_MSG);
      return false;
    }
  }
  document.addEventListener('click', blockDeleteIfNeeded, true);
  function markDependentDeleteButtons(){
    document.querySelectorAll('button[data-action^="delete-"]').forEach(btn => {
      const action = btn.dataset.action || '';
      const blocked = /^delete-(persona|producto|tienda|evento)$/.test(action) && hasDependency(action, btn.dataset.id);
      btn.classList.toggle('ce-delete-blocked-v1911', blocked);
      if(blocked){
        btn.setAttribute('data-ce-tip', DELETE_BLOCK_MSG);
        btn.setAttribute('data-tip-bg', '#ffffff');
        btn.setAttribute('data-ce-tip-black', '1');
      }else if(btn.getAttribute('data-ce-tip') === DELETE_BLOCK_MSG){
        btn.removeAttribute('data-ce-tip');
        btn.removeAttribute('data-tip-bg');
        btn.removeAttribute('data-ce-tip-black');
      }
    });
  }

  function incomeDetail(r){
    const n = Number(r?.numero || 0);
    const ev = (() => { try{ return typeof selectedEvent === 'function' ? selectedEvent() : null; }catch(_){ return null; } })() || {};
    const base = Number(r?.base != null ? r.base : (n * Number(ev.precio || 0)));
    const vol = Number(r?.donation != null ? r.donation : (r?.importe || 0));
    const total = Number(r?.total != null ? r.total : base + vol);
    const name = r?.persona?.nombre || personaName(r?.personaId) || 'Sin nombre';
    return `${name} — Nº ${numF(n)} — Importe socio: ${moneyF(base)} — Voluntario: ${moneyF(vol)} — Total: ${moneyF(total)} — ${r?.situacion || ''}`;
  }
  function applyBudgetTooltips(){
    const wrap = $('budgetLayout');
    if(!wrap || typeof budgetSummary !== 'function') return;
    let b; try{ b = budgetSummary(); }catch(_){ return; }
    const socios = b.ingresosDinero?.socios || {};
    const noSocios = b.ingresosDinero?.noSocios || b.ingresosDinero?.donantes || {};
    const d = b.donacionProducto || {};
    const ingresoText = [
      'INGRESOS',
      `TOTAL INGRESADO: ${moneyF(b.ingresosDinero?.totalIngresado || 0)}`,
      `TOTAL COMPROMETIDO: ${moneyF(b.ingresosDinero?.totalComprometido || 0)}`,
      `PENDIENTE: ${moneyF(b.ingresosDinero?.pendiente || 0)}`,
      '',
      `SOCIOS: ${moneyF(socios.ingresado || socios.importe || 0)}`,
      ...((socios.listImporte || []).map(x => `• ${x}`)),
      '',
      `NO SOCIOS: ${moneyF(noSocios.ingresado || noSocios.importe || 0)}`,
      ...((noSocios.listImporte || []).map(x => `• ${x}`))
    ].join('\n');
    const donText = [
      'DONACIÓN DE PRODUCTO',
      `VALOR PRODUCTO DONADO: ${moneyF(d.valorDonado || 0)}`,
      '',
      `TIENDAS: ${moneyF(d.donadoTienda || 0)}`,
      ...((d.listTiendas || []).map(x => `• ${x}`)),
      '',
      `SOCIOS: ${moneyF(d.donadoSocio || 0)}`,
      ...((d.listSocios || []).map(x => `• ${x}`)),
      '',
      `NO SOCIOS: ${moneyF(d.donadoOtros || 0)}`,
      ...((d.listNoSocios || []).map(x => `• ${x}`))
    ].join('\n');
    const panels = wrap.querySelectorAll('.budget-panel');
    const pIng = Array.from(panels).find(p => normUp(p.querySelector('h3')?.textContent || '').includes('INGRES'));
    const pDon = Array.from(panels).find(p => normUp(p.querySelector('h3')?.textContent || '').includes('DONACION') || normUp(p.querySelector('h3')?.textContent || '').includes('DONACIÓN'));
    setTip(pIng, ingresoText, '#ffffff', true);
    pIng?.querySelectorAll('.budget-row,.budget-subrow').forEach(el => setTip(el, ingresoText, '#ffffff', true));
    setTip(pDon, donText, '#ffffff', true);
    pDon?.querySelectorAll('.budget-row,.budget-subrow').forEach(el => setTip(el, donText, '#ffffff', true));
  }

  function detailTextForGraphItem(groupLabel, it){
    const amount = it?.displayValue ?? it?.value ?? 0;
    const lines = Array.isArray(it?.lines) ? it.lines : [];
    return `${groupLabel}\n${it?.label || ''}: ${moneyF(amount)}${lines.length ? '\n\n' + lines.map(x => `• ${x}`).join('\n') : ''}`;
  }
  function applyGraphTooltips(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    let g = null;
    try{ if(typeof graphPartsV171 === 'function') g = graphPartsV171(); }catch(_){ }
    if(!g){ try{ if(typeof graphPartsV164 === 'function') g = graphPartsV164(); }catch(_){ } }
    if(!g) return;
    const groups = [
      ['INGRESOS', g.incomeItems || []],
      ['DONACIÓN DE PRODUCTO', g.donationItems || []],
      ['GASTOS', g.expenseItems || []],
      ['SALDO OPERATIVO', g.saldoItems || []]
    ];
    const rows = wrap.querySelectorAll('.chart-row');
    rows.forEach((row, idx) => {
      const group = groups[idx];
      if(!group) return;
      row.querySelectorAll('.chart-seg').forEach((seg, j) => {
        const it = group[1][j];
        if(!it) return;
        const bg = it.color || getComputedStyle(seg).backgroundColor || '#ffffff';
        setTip(seg, detailTextForGraphItem(group[0], it), bg, true);
      });
    });
  }

  function applyGroupingTooltips(){
    const configs = [
      ['summarySegmento', 'Por segmento', (() => { try{ return typeof summaryBySegmento === 'function' ? summaryBySegmento() : []; }catch(_){ return []; } })()],
      ['summaryDestino', 'Por destino', (() => { try{ return typeof summaryByDestino === 'function' ? summaryByDestino() : []; }catch(_){ return []; } })()]
    ];
    const specs = [
      ['Comprado', 'comprado', 'listComprado', '#dc2626'],
      ['Donado', 'donado', 'listDonado', '#f59e0b'],
      ['Pte. Compra u otros gastos', 'pendiente', 'listPendiente', '#fb7185']
    ];
    configs.forEach(([id, title, rows]) => {
      const wrap = $(id); if(!wrap) return;
      const cards = wrap.querySelectorAll('.vbars-card');
      cards.forEach((card, i) => {
        const r = rows[i] || {};
        const cols = card.querySelectorAll('.vbar-col');
        specs.forEach(([label, valKey, listKey, color], j) => {
          const list = Array.isArray(r[listKey]) ? r[listKey] : [];
          const text = `${title}\n${r.label || ''}\n${label}: ${moneyF(r[valKey] || 0)}\n\n${list.length ? list.map(x => `• ${x}`).join('\n') : 'Sin productos'}`;
          const col = cols[j];
          if(col){ setTip(col, text, color, true); }
          const stick = col?.querySelector?.('.vbar-stick');
          if(stick){ setTip(stick, text, color, true); }
        });
      });
    });
  }

  function buildTicketMaps(){
    const donationMap = new Map();
    const purchaseMap = new Map();
    rowsForEvent().forEach(c => {
      const t = ticket(c);
      if(!t) return;
      const qty = Number(c.unidades || 0);
      const price = productoPrice(c);
      const val = productoValue(c);
      const line = `• ${productoName(c)} — Cantidad: ${numF(qty)} — Precio: ${moneyF(price)} — Importe: ${moneyF(val)}`;
      if(isDon(t)){
        const donor = donorName(c);
        const key = `${donor} | ${t}`;
        if(!donationMap.has(key)) donationMap.set(key, {key, donor, ticket:t, total:0, lines:[]});
        const rec = donationMap.get(key); rec.total += val; rec.lines.push(line);
      }else{
        const store = storeName(c);
        const key = `${store} | ${t}`;
        if(!purchaseMap.has(key)) purchaseMap.set(key, {key, store, ticket:t, total:0, lines:[]});
        const rec = purchaseMap.get(key); rec.total += val; rec.lines.push(line);
      }
    });
    donationMap.forEach(r => r.lines.sort((a,b)=>compareText(a,b)));
    purchaseMap.forEach(r => r.lines.sort((a,b)=>compareText(a,b)));
    return {donationMap, purchaseMap};
  }
  function applyTiendaTicketTooltips(){
    const wrap = $('summaryTiendaTicket');
    if(!wrap) return;
    const {donationMap, purchaseMap} = buildTicketMaps();
    wrap.querySelectorAll('.summary-item').forEach(item => {
      const labelEl = item.querySelector('span');
      const label = norm(labelEl?.textContent || '');
      if(!label || normUp(label) === 'TOTAL') return;
      for(const [key, rec] of donationMap.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          if(labelEl) labelEl.textContent = key;
          setTip(item, `DONACIÓN\n${key}\nTOTAL ESTIMADO: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`, '#ffffff', true);
          setTip(labelEl, `DONACIÓN\n${key}\nTOTAL ESTIMADO: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`, '#ffffff', true);
          return;
        }
      }
      for(const [key, rec] of purchaseMap.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          setTip(item, `TIENDA | TICKET\n${key}\nTOTAL: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`, '#ffffff', true);
          setTip(labelEl, `TIENDA | TICKET\n${key}\nTOTAL: ${moneyF(rec.total)}\n\n${rec.lines.join('\n')}`, '#ffffff', true);
          return;
        }
      }
    });
  }

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  function afterRender(){
    refreshVersion();
    markDependentDeleteButtons();
    applyBudgetTooltips();
    applyGraphTooltips();
    applyGroupingTooltips();
    applyTiendaTicketTooltips();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender){
    render = function(){
      const ret = prevRender.apply(this, arguments);
      setTimeout(afterRender, 0);
      setTimeout(afterRender, 60);
      return ret;
    };
    window.render = render;
  }
  const prevRenderBudget = typeof renderBudget === 'function' ? renderBudget : null;
  if(prevRenderBudget){
    renderBudget = function(){
      const ret = prevRenderBudget.apply(this, arguments);
      setTimeout(afterRender, 0);
      setTimeout(afterRender, 60);
      return ret;
    };
    window.renderBudget = renderBudget;
  }
  const prevRenderGraficas = typeof renderGraficas === 'function' ? renderGraficas : null;
  if(prevRenderGraficas){
    renderGraficas = function(){
      const ret = prevRenderGraficas.apply(this, arguments);
      setTimeout(applyGraphTooltips, 0);
      setTimeout(applyGraphTooltips, 60);
      return ret;
    };
    window.renderGraficas = renderGraficas;
  }
  function normalizeDownloadNameV1911(name){
    let n = String(name || '');
    n = n.replace(/^ControlEvent_v\d+_\d+(?:_\d+)?/i, VERSION_FILE);
    return n;
  }
  const oldAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){
    try{ if(this.download) this.download = normalizeDownloadNameV1911(this.download); }catch(_){ }
    return oldAnchorClick.apply(this, arguments);
  };
  document.addEventListener('DOMContentLoaded', () => { afterRender(); setTimeout(afterRender, 250); });
  window.addEventListener('load', () => { afterRender(); setTimeout(afterRender, 250); setTimeout(afterRender, 900); });
  afterRender();
  setTimeout(afterRender, 250);
})();
