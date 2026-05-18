/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #28. */
/* ==== V20.0: formato de globos, mantenimiento robusto y avisos en eliminar ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const BLOCK_MSG = 'No autorizado. Tiene dependencias';
  const OK_MSG = 'Se puede eliminar. No hay dependencias';
  const DELETE_BLOCK_MSG = 'No se pueden eliminar datos sin previamente eliminar sus dependencia';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const normUp = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const fmtMoney = v => {
    try{ return (typeof money === 'function') ? money(Number(v||0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
    catch(_){ return String(v ?? ''); }
  };
  const fmtNum = v => {
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v||0)); }
    catch(_){ return String(v ?? ''); }
  };
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function selectedId(){ try{ return String((typeof selectedEvent === 'function' ? selectedEvent()?.id : '') || st().selectedEventId || ''); }catch(_){ return String(st().selectedEventId || ''); } }
  function compras(){
    try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ }
    const eid = selectedId(); return (st().compras || []).filter(c => String(c.eventId || '') === eid);
  }
  function byId(list, id){ return (st()[list] || []).find(x => String(x.id) === String(id)) || {}; }
  function productObj(id){ try{ const p = (typeof productoById === 'function') ? productoById(id) : null; if(p) return p; }catch(_){ } return byId('productos', id); }
  function storeObj(id){ try{ const t = (typeof tiendaById === 'function') ? tiendaById(id) : null; if(t) return t; }catch(_){ } return byId('tiendas', id); }
  function personObj(id){ try{ const p = (typeof personaById === 'function') ? personaById(id) : null; if(p) return p; }catch(_){ } return byId('personas', id); }
  function prodName(c){ return c?.producto?.nombre || productObj(c?.productoId).nombre || 'Producto'; }
  function storeName(c){
    const p = productObj(c?.productoId);
    return c?.tienda?.nombre || storeObj(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda';
  }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const d = donorLabel(c.donorRef); if(norm(d)) return d; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personObj(raw.slice(2)).nombre || 'Sin donante';
    if(raw.startsWith('T:')) return storeObj(raw.slice(2)).nombre || 'Sin donante';
    return raw || c?.donorLabel || c?.tienda?.nombre || 'Sin donante';
  }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return normUp(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return normUp(v) === 'GASTOS CORRIENTES'; }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function unitPrice(c){
    const p = productObj(c?.productoId);
    return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0)));
  }
  function value(c){ return Number(c?.valor != null ? c.valor : (unitPrice(c) * Number(c?.unidades || 0))); }
  function cmp(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function qtyPriceTotal(c){ return `${fmtNum(c?.unidades || 0)} uds x ${fmtMoney(unitPrice(c))} = ${fmtMoney(value(c))}`; }
  function donationLine(c){ return `${donorName(c)} | ${prodName(c)} | ${qtyPriceTotal(c)}`; }
  function expenseLine(c){ return `${ticket(c) || 'PTE.COMPRA'} | ${storeName(c)} | ${prodName(c)} | ${qtyPriceTotal(c)}`; }
  function donationRows(code){
    return compras().filter(c => ticket(c) === code).slice().sort((a,b)=>cmp(donorName(a),donorName(b)) || cmp(prodName(a),prodName(b))).map(donationLine);
  }
  function expenseRows(kind){
    let filter;
    if(kind === 'ticket') filter = c => !isDon(ticket(c)) && !isCurrent(ticket(c)) && ticket(c) !== '';
    else if(kind === 'current') filter = c => isCurrent(ticket(c));
    else filter = c => !isDon(ticket(c)) && ticket(c) === '';
    return compras().filter(filter).slice().sort((a,b)=>cmp(ticket(a)||'PTE.COMPRA',ticket(b)||'PTE.COMPRA') || cmp(storeName(a),storeName(b)) || cmp(prodName(a),prodName(b))).map(expenseLine);
  }
  function rowsTotalByTicket(code){ return compras().filter(c => ticket(c) === code).reduce((a,b)=>a+value(b),0); }
  function rowsTotal(linesCode){ return rowsTotalByTicket(linesCode); }
  function setTip(el, text, bg='#ffffff', layout='default'){
    if(!el || !norm(text)) return;
    el.setAttribute('data-ce-tip-v196', text);
    el.setAttribute('data-tip-bg-v196', bg || '#ffffff');
    el.setAttribute('data-ce-tip-layout-v20', layout || 'default');
    ['data-ce-tip-v1952','data-ce-tip','data-v181-tip','data-tip','title'].forEach(a => el.removeAttribute(a));
  }
  function titleText(title,total,lines,empty='Sin registros'){
    return `${title}\nTOTAL: ${fmtMoney(total)}\n\n${lines && lines.length ? lines.join('\n') : empty}`;
  }
  let pendingLayout = 'default';
  document.addEventListener('pointerdown', ev => {
    const el = ev.target.closest?.('[data-ce-tip-layout-v20]');
    if(el) pendingLayout = el.getAttribute('data-ce-tip-layout-v20') || 'default';
  }, true);
  function applyTooltipLayout(){
    const tip = $('ceTooltipV196'); if(!tip) return;
    Array.from(tip.classList).forEach(c => { if(c.startsWith('ce-v20-layout-')) tip.classList.remove(c); });
    tip.classList.add('ce-v20-layout-' + (pendingLayout || 'default'));
    const layout = pendingLayout || 'default';
    tip.querySelectorAll('.ce-tip-table tr').forEach(tr => {
      const cells = Array.from(tr.children);
      cells.forEach(td => td.style.fontWeight = '');
      if(layout === 'expense' || layout === 'ticketpurchase'){
        if(cells[2]) cells[2].style.fontWeight = '900';
      }else if(layout === 'donation' || layout === 'budgetdonation'){
        if(cells[0]) cells[0].style.fontWeight = '900';
        if(cells[1]) cells[1].style.fontWeight = '900';
      }else if(layout === 'grouping'){
        if(cells[0]) cells[0].style.fontWeight = '900';
        if(cells[1]) cells[1].style.fontWeight = '900';
      }
      const last = cells[cells.length-1];
      if(last && /€/.test(last.textContent || '')) last.style.fontWeight = '900';
    });
  }
  const obs = new MutationObserver(() => setTimeout(applyTooltipLayout,0));
  function watchTip(){ const tip = $('ceTooltipV196'); if(tip && !tip.__v200Observed){ obs.observe(tip,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']}); tip.__v200Observed = true; } }

  function applyGraphTooltips(){
    const wrap = $('eventChartWrap'); if(!wrap) return;
    let g = null; try{ if(typeof graphPartsV171 === 'function') g = graphPartsV171(); }catch(_){ }
    if(!g) return;
    const rows = wrap.querySelectorAll('.chart-row');
    // DONACIÓN DE PRODUCTO: quitar columna de tipo DONADO y poner total destacado.
    const donationSegs = rows[1]?.querySelectorAll?.('.chart-seg') || [];
    const donationSpecs = [
      ['DONADO TIENDAS', 'DONADO TIENDA', g.donationItems?.[0]],
      ['DONADO SOCIOS', 'DONADO SOCIO', g.donationItems?.[1]],
      ['DONADO NO SOCIOS', 'DONADO OTROS', g.donationItems?.[2]]
    ];
    donationSegs.forEach((seg,i)=>{
      const [title,code,item] = donationSpecs[i] || [];
      if(!item) return;
      const lines = donationRows(code);
      setTip(seg, titleText(title, item.value || rowsTotal(code), lines), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'donation');
    });
    // GASTOS: TKXX | tienda | Producto | uds x Precio = total, con tienda más ancha por CSS.
    const expenseSegs = rows[2]?.querySelectorAll?.('.chart-seg') || [];
    const expenseSpecs = [
      ['GASTADO POR TICKET', 'ticket', g.expenseItems?.[0]],
      ['GASTOS CORRIENTES', 'current', g.expenseItems?.[1]],
      ['PENDIENTE DE COMPRA', 'pending', g.expenseItems?.[2]]
    ];
    expenseSegs.forEach((seg,i)=>{
      const [title,kind,item] = expenseSpecs[i] || [];
      if(!item) return;
      const lines = expenseRows(kind);
      setTip(seg, titleText(title, item.value || 0, lines), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'expense');
    });
  }

  function applyBudgetDonationTips(){
    document.querySelectorAll('#budgetLayout .budget-subrow').forEach(row => {
      const label = norm(row.querySelector('span')?.textContent || '');
      let code='', title='';
      if(/Donación de producto tiendas/i.test(label)){ code='DONADO TIENDA'; title='DONACIÓN DE PRODUCTO / TIENDAS'; }
      else if(/Donación de producto socios/i.test(label)){ code='DONADO SOCIO'; title='DONACIÓN DE PRODUCTO / SOCIOS'; }
      else if(/Donación de producto no socios/i.test(label)){ code='DONADO OTROS'; title='DONACIÓN DE PRODUCTO / NO SOCIOS'; }
      if(!code) return;
      const lines = donationRows(code);
      const total = compras().filter(c => ticket(c) === code).reduce((a,b)=>a+value(b),0);
      const text = titleText(title,total,lines);
      setTip(row,text,'#ffffff','budgetdonation');
      row.querySelectorAll('span').forEach(s => setTip(s,text,'#ffffff','budgetdonation'));
    });
  }

  function applyGroupingTips(){
    const configs = [
      ['summarySegmento', 'Por segmento', (()=>{ try{ return typeof summaryBySegmento === 'function' ? summaryBySegmento() : []; }catch(_){ return []; } })()],
      ['summaryDestino', 'Por destino', (()=>{ try{ return typeof summaryByDestino === 'function' ? summaryByDestino() : []; }catch(_){ return []; } })()]
    ];
    const specs = [
      ['Comprado', 'comprado', 'listComprado', '#dc2626'],
      ['Donado', 'donado', 'listDonado', '#f59e0b'],
      ['Pte. Compra u otros gastos', 'pendiente', 'listPendiente', '#fb7185']
    ];
    configs.forEach(([id,title,rows]) => {
      const wrap = $(id); if(!wrap) return;
      wrap.querySelectorAll('.vbars-card').forEach((card,i)=>{
        const r = rows[i] || {};
        const cols = card.querySelectorAll('.vbar-col');
        specs.forEach(([label,valKey,listKey,color],j)=>{
          const rawLines = Array.isArray(r[listKey]) ? r[listKey] : [];
          const lines = rawLines.filter(x => norm(x) && normUp(x) !== 'SIN PRODUCTOS' && !/^Sin productos/i.test(x)).map(x => String(x).replace(/\s+[—-]\s+/g,' | '));
          const total = Number(r[valKey] || 0);
          const text = `${title}\n${r.label || ''}\nTOTAL: ${fmtMoney(total)}\n\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
          const col = cols[j];
          if(col) setTip(col,text,color,'grouping');
          const stick = col?.querySelector?.('.vbar-stick');
          if(stick) setTip(stick,text,color,'grouping');
        });
      });
    });
  }

  function applyTicketTips(){
    const wrap = $('summaryTiendaTicket'); if(!wrap) return;
    const purchases = new Map(), donations = new Map();
    compras().forEach(c => {
      const tk = ticket(c); if(!tk) return;
      if(isDon(tk)){
        const key = `${donorName(c)} | ${tk}`;
        if(!donations.has(key)) donations.set(key,{total:0,lines:[]});
        const rec = donations.get(key); rec.total += value(c); rec.lines.push(donationLine(c));
      }else{
        const key = `${storeName(c)} | ${tk}`;
        if(!purchases.has(key)) purchases.set(key,{total:0,lines:[]});
        const rec = purchases.get(key); rec.total += value(c); rec.lines.push(expenseLine(c));
      }
    });
    purchases.forEach(r => r.lines.sort((a,b)=>cmp(a,b)));
    donations.forEach(r => r.lines.sort((a,b)=>cmp(a,b)));
    wrap.querySelectorAll('.summary-item').forEach(item => {
      const labelEl = item.querySelector('span'); const label = norm(labelEl?.textContent || '');
      if(!label || normUp(label) === 'TOTAL') return;
      for(const [key,rec] of donations.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          if(labelEl) labelEl.textContent = key;
          const text = titleText('DONACIÓN', rec.total, rec.lines, 'Sin productos donados');
          setTip(item,text,'#ffffff','donation'); if(labelEl) setTip(labelEl,text,'#ffffff','donation'); return;
        }
      }
      for(const [key,rec] of purchases.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          const text = `${key}\nTOTAL: ${fmtMoney(rec.total)}\n\n${rec.lines.length ? rec.lines.join('\n') : 'Sin productos comprados'}`;
          setTip(item,text,'#ffffff','ticketpurchase'); if(labelEl) setTip(labelEl,text,'#ffffff','ticketpurchase'); return;
        }
      }
    });
  }

  function hasDependency(action,id){
    const sid = String(id || ''); if(!sid) return false;
    const s = st(); const cols = s.colaboradores || [], buys = s.compras || [], persons = s.personas || [], stores = s.tiendas || [], products = s.productos || [];
    if(action === 'delete-persona') return cols.some(c => String(c.personaId || '') === sid) || buys.some(c => String(c.responsableId || '') === sid || String(c.personaId || '') === sid || String(c.donorRef || '') === `P:${sid}` || String(c.donanteId || '') === sid);
    if(action === 'delete-producto') return buys.some(c => String(c.productoId || '') === sid);
    if(action === 'delete-tienda') return products.some(p => String(p.tiendaId || '') === sid || String(p.defaultTiendaId || '') === sid) || buys.some(c => String(c.tiendaId || '') === sid || String(c.storeId || '') === sid || String(c.donorRef || '') === `T:${sid}`);
    if(action === 'delete-evento') return cols.some(c => String(c.eventId || '') === sid) || buys.some(c => String(c.eventId || '') === sid) || persons.some(p => String(p.eventId || '') === sid) || stores.some(t => String(t.eventId || '') === sid) || products.some(p => String(p.eventId || '') === sid) || Object.keys(s.ticketImages || {}).some(k => String(k).startsWith(`${sid}|`));
    return false;
  }
  function deleteCan(action,id){ return !/^delete-(persona|producto|tienda|evento)$/.test(action) || !hasDependency(action,id); }
  function ensureDeleteTip(){ let tip = $('ceDeleteTipV200'); if(!tip){ tip = document.createElement('div'); tip.id = 'ceDeleteTipV200'; document.body.appendChild(tip); } return tip; }
  function placeDeleteTip(tip,el){
    const r = el.getBoundingClientRect(); tip.style.display='block';
    const tr = tip.getBoundingClientRect();
    let left = r.left, top = r.top - tr.height - 8;
    if(top < 8) top = r.bottom + 8;
    if(left + tr.width > innerWidth - 8) left = Math.max(8, innerWidth - tr.width - 8);
    tip.style.left = Math.round(left) + 'px'; tip.style.top = Math.round(top) + 'px';
  }
  function showDeleteTip(btn){
    const action = btn.dataset.action || ''; const ok = deleteCan(action, btn.dataset.id);
    const tip = ensureDeleteTip(); tip.textContent = ok ? OK_MSG : BLOCK_MSG;
    tip.style.borderColor = ok ? 'rgba(22,163,74,.35)' : 'rgba(220,38,38,.35)';
    tip.style.background = ok ? '#ecfdf5' : '#fef2f2';
    placeDeleteTip(tip,btn);
  }
  function hideDeleteTip(){ const tip = $('ceDeleteTipV200'); if(tip) tip.style.display='none'; }
  function markDeleteButtons(){
    document.querySelectorAll('button[data-action^="delete-"]').forEach(btn => {
      const action = btn.dataset.action || ''; const ok = deleteCan(action, btn.dataset.id);
      btn.classList.toggle('ce-delete-ok-v200', ok);
      btn.classList.toggle('ce-delete-blocked-v200', !ok);
      btn.removeAttribute('data-ce-tip-v196'); btn.removeAttribute('data-ce-tip'); btn.removeAttribute('title');
    });
  }
  document.addEventListener('mouseover', ev => { const btn = ev.target.closest?.('button[data-action^="delete-"]'); if(btn) showDeleteTip(btn); }, true);
  document.addEventListener('mousemove', ev => { const btn = ev.target.closest?.('button[data-action^="delete-"]'); if(btn){ const tip = ensureDeleteTip(); if(tip.style.display !== 'none') placeDeleteTip(tip,btn); } }, true);
  document.addEventListener('mouseout', ev => { const btn = ev.target.closest?.('button[data-action^="delete-"]'); if(btn && (!ev.relatedTarget || !btn.contains(ev.relatedTarget))) hideDeleteTip(); }, true);
  document.addEventListener('click', ev => {
    const btn = ev.target.closest?.('button[data-action^="delete-"]'); if(!btn) return;
    const action = btn.dataset.action || '';
    if(!deleteCan(action, btn.dataset.id)){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); showDeleteTip(btn); return false;
    }
  }, true);

  function fixMaintenanceButton(){
    const btn = $('btnToggleMaintenance'); const wrap = $('maintenanceWrapper'); if(!btn || !wrap || btn.__v200MaintFixed) return;
    btn.__v200MaintFixed = true;
    btn.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      try{
        if(typeof isLocked === 'function' && isLocked()){
          if(typeof canUnlockFinalizedEvent === 'function' && !canUnlockFinalizedEvent()) return;
          try{ currentMaintTab = 'eventos'; }catch(_){ }
          wrap.classList.remove('hidden');
          if(typeof render === 'function') render();
        }else{
          wrap.classList.toggle('hidden');
          if(typeof renderLockState === 'function') renderLockState();
        }
      }catch(err){ console.error('Error abriendo mantenimiento', err); }
    }, true);
  }

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; });
  }
  function normalizeDownloadName(name){ return String(name || '').replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }
  if(!HTMLAnchorElement.prototype.click.__v200Wrapped){
    const prev = HTMLAnchorElement.prototype.click;
    const wrapped = function(){ try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ } return prev.apply(this, arguments); };
    wrapped.__v200Wrapped = true; HTMLAnchorElement.prototype.click = wrapped;
  }
  function wireExcel(){
    const btn = $('btnExportExcel'); if(!btn || btn.__v200ExcelFixed) return;
    btn.__v200ExcelFixed = true;
    btn.addEventListener('click', async ev => {
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      try{ const fn = (typeof exportExcel === 'function') ? exportExcel : window.exportExcel; if(!fn) throw new Error('No se encontró exportExcel'); await fn(); }
      catch(err){ console.error('Error exportando INFOEVENTO v20.0', err); alert('No se pudo descargar la INFOEVENTO. Revisa la consola.'); }
    }, true);
  }
  function applyAll(){
    refreshVersion(); watchTip(); wireExcel(); fixMaintenanceButton();
    applyGraphTooltips(); applyBudgetDonationTips(); applyGroupingTips(); applyTicketTips(); markDeleteButtons();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v200Wrapped){
    const wrapped = function(){ const ret = prevRender.apply(this, arguments); setTimeout(applyAll,0); setTimeout(applyAll,80); setTimeout(applyAll,350); return ret; };
    wrapped.__v200Wrapped = true; render = wrapped; window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(applyAll,60); setTimeout(applyAll,400); setTimeout(applyAll,1000); }));
  applyAll(); setTimeout(applyAll,250); setTimeout(applyAll,900); setTimeout(applyAll,1800);
})();
