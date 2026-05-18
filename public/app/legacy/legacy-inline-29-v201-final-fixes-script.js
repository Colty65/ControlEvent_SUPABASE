/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #29. */
/* ==== V20.1: formato fino de globos y botones mantenimiento/carga ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
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
  function selectedEv(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e=>String(e.id)===String(s.selectedEventId)) || {}; }
  function selectedId(){ const ev=selectedEv(); return String(ev.id || st().selectedEventId || ''); }
  function rowsForEvent(listName){ const eid=selectedId(); return (st()[listName] || []).filter(x => String(x.eventId || '') === eid); }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } return rowsForEvent('compras'); }
  function ingresos(){ return rowsForEvent('colaboradores'); }
  function byId(list, id){ return (st()[list] || []).find(x => String(x.id) === String(id)) || {}; }
  function personObj(id){ try{ if(typeof personaById === 'function'){ const p=personaById(id); if(p) return p; } }catch(_){ } return byId('personas', id); }
  function productObj(id){ try{ if(typeof productoById === 'function'){ const p=productoById(id); if(p) return p; } }catch(_){ } return byId('productos', id); }
  function storeObj(id){ try{ if(typeof tiendaById === 'function'){ const t=tiendaById(id); if(t) return t; } }catch(_){ } return byId('tiendas', id); }
  function personName(r){ return r?.persona?.nombre || personObj(r?.personaId).nombre || r?.nombre || 'Sin nombre'; }
  function personRange(r){ return r?.persona?.rango || personObj(r?.personaId).rango || ''; }
  function prodName(c){ return c?.producto?.nombre || productObj(c?.productoId).nombre || 'Producto'; }
  function storeName(c){ const p=productObj(c?.productoId); return c?.tienda?.nombre || storeObj(c?.tiendaId || p.tiendaId || p.defaultTiendaId).nombre || 'Sin tienda'; }
  function donorName(c){
    try{ if(typeof donorLabel === 'function' && c?.donorRef){ const d=donorLabel(c.donorRef); if(norm(d)) return d; } }catch(_){ }
    const raw = norm(c?.donorRef || c?.donante || c?.donanteNombre || '');
    if(raw.startsWith('P:')) return personObj(raw.slice(2)).nombre || 'Sin donante';
    if(raw.startsWith('T:')) return storeObj(raw.slice(2)).nombre || 'Sin donante';
    return raw || c?.donorLabel || c?.tienda?.nombre || 'Sin donante';
  }
  function ticket(c){ return norm(c?.ticketDonacion || ''); }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return normUp(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return normUp(v) === 'GASTOS CORRIENTES'; }
  function unitPrice(c){ const p=productObj(c?.productoId); return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0))); }
  function value(c){ return Number(c?.valor != null ? c.valor : (unitPrice(c) * Number(c?.unidades || 0))); }
  function cmp(a,b){ return normUp(a).localeCompare(normUp(b),'es'); }
  function qtyPriceTotal(c){ return `${fmtNum(c?.unidades || 0)} uds x ${fmtMoney(unitPrice(c))} = ${fmtMoney(value(c))}`; }
  function donationLine(c){ return `${donorName(c)} | ${prodName(c)} | ${qtyPriceTotal(c)}`; }
  function expenseLine(c){ return `${ticket(c) || 'PTE.COMPRA'} | ${storeName(c)} | ${prodName(c)} | ${qtyPriceTotal(c)}`; }
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
  function eventPrice(){ return Number(selectedEv()?.precio || 0); }
  function incomeTotal(r){ return Number(r.total || (Number(r.numero || 0) * eventPrice() + Number(r.importe || 0)) || 0); }
  function incomeLine(r){
    const n = Number(r.numero || 0);
    const socio = normUp(personRange(r)) === 'SOCIO' ? Number(r.base != null ? r.base : (n * eventPrice())) : 0;
    const voluntario = Number(r.donation != null ? r.donation : (r.importe || 0));
    return `${personName(r)} | Nº ${fmtNum(n)} | Socio ${fmtMoney(socio)} | Voluntario ${fmtMoney(voluntario)} | Total ${fmtMoney(incomeTotal(r))}`;
  }
  function incomeRowsFor(label){
    const l = normUp(label);
    const socio = l.includes('SOCIOS') && !l.includes('NO SOCIOS');
    const noSocio = l.includes('NO SOCIOS');
    const pending = l.includes('PENDIENTE');
    let method = '';
    if(l.includes('BANCO')) method='BANCO'; else if(l.includes('BIZUM')) method='BIZUM'; else if(l.includes('EFECTIVO')) method='EFECTIVO';
    return ingresos().filter(r => {
      const rango = normUp(personRange(r));
      const sit = normUp(r.situacion || '');
      if(pending) return sit === 'PENDIENTE';
      if(method && sit !== method) return false;
      if(socio) return rango === 'SOCIO';
      if(noSocio) return rango !== 'SOCIO';
      return true;
    }).slice().sort((a,b)=>cmp(personName(a),personName(b))).map(incomeLine);
  }
  function applyGraphTipsV201(){
    const wrap = $('eventChartWrap'); if(!wrap) return;
    let g = null; try{ if(typeof graphPartsV171 === 'function') g = graphPartsV171(); }catch(_){ }
    if(!g) return;
    const rows = wrap.querySelectorAll('.chart-row');
    const incomeSegs = rows[0]?.querySelectorAll?.('.chart-seg') || [];
    incomeSegs.forEach((seg,i)=>{
      const item = g.incomeItems?.[i]; if(!item) return;
      const lines = incomeRowsFor(item.label || '');
      setTip(seg, titleText(item.label || 'INGRESOS', item.value || 0, lines), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'incomev201');
    });
    const donationSegs = rows[1]?.querySelectorAll?.('.chart-seg') || [];
    const donationSpecs = [
      ['Donado por tiendas', 'DONADO TIENDA', g.donationItems?.[0]],
      ['Donado por socios', 'DONADO SOCIO', g.donationItems?.[1]],
      ['Donado por no socios', 'DONADO OTROS', g.donationItems?.[2]]
    ];
    donationSegs.forEach((seg,i)=>{
      const [title,code,item] = donationSpecs[i] || []; if(!item) return;
      const lines = donationRows(code);
      const total = compras().filter(c => ticket(c) === code).reduce((a,b)=>a+value(b),0);
      setTip(seg, titleText(title, item.value || total, lines), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'donationv201');
    });
    const expenseSegs = rows[2]?.querySelectorAll?.('.chart-seg') || [];
    const expenseSpecs = [
      ['Gastado por ticket', 'ticket', g.expenseItems?.[0]],
      ['Gastos corrientes', 'current', g.expenseItems?.[1]],
      ['Pendiente de compra', 'pending', g.expenseItems?.[2]]
    ];
    expenseSegs.forEach((seg,i)=>{
      const [title,kind,item] = expenseSpecs[i] || []; if(!item) return;
      setTip(seg, titleText(title, item.value || 0, expenseRows(kind)), item.color || getComputedStyle(seg).backgroundColor || '#fff', 'expensev201');
    });
  }
  function applyBudgetDonationTipsV201(){
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
      setTip(row,text,'#ffffff','budgetdonationv201');
      row.querySelectorAll('span').forEach(s => setTip(s,text,'#ffffff','budgetdonationv201'));
    });
  }
  function applyGroupingTipsV201(){
    const configs = [
      ['summarySegmento', 'Por segmento', (() => { try{ return typeof summaryBySegmento === 'function' ? summaryBySegmento() : []; }catch(_){ return []; } })()],
      ['summaryDestino', 'Por destino', (() => { try{ return typeof summaryByDestino === 'function' ? summaryByDestino() : []; }catch(_){ return []; } })()]
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
          const lines = (Array.isArray(r[listKey]) ? r[listKey] : []).filter(x => norm(x) && !/^Sin productos/i.test(x)).map(x => String(x).replace(/\s+[—-]\s+/g,' | '));
          const total = Number(r[valKey] || 0);
          const text = `${title}\n${r.label || ''}\n${label}\nTOTAL: ${fmtMoney(total)}\n\n${lines.length ? lines.join('\n') : 'Sin productos'}`;
          const col = cols[j];
          if(col) setTip(col,text,color,'groupingv201');
          const stick = col?.querySelector?.('.vbar-stick');
          if(stick) setTip(stick,text,color,'groupingv201');
        });
      });
    });
  }
  function applyTicketTipsV201(){
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
          setTip(item,text,'#ffffff','donationv201'); if(labelEl) setTip(labelEl,text,'#ffffff','donationv201'); return;
        }
      }
      for(const [key,rec] of purchases.entries()){
        if(label === key || label.startsWith(key + ' ·') || label.startsWith(key + ' -')){
          const text = `${key}\nTOTAL: ${fmtMoney(rec.total)}\n\n${rec.lines.length ? rec.lines.join('\n') : 'Sin productos comprados'}`;
          setTip(item,text,'#ffffff','ticketpurchasev201'); if(labelEl) setTip(labelEl,text,'#ffffff','ticketpurchasev201'); return;
        }
      }
    });
  }
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; });
  }
  function normalizeDownloadNames(){
    const prev = HTMLAnchorElement.prototype.click;
    if(prev.__v201Wrapped) return;
    const wrapped = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ } return prev.apply(this, arguments); };
    wrapped.__v201Wrapped = true;
    HTMLAnchorElement.prototype.click = wrapped;
  }
  function openMaintenanceGeneral(){
    const wrap = $('maintenanceWrapper');
    if(!wrap) return;
    const isVisible = !wrap.classList.contains('hidden');
    const isGeneral = String(typeof currentMaintTab !== 'undefined' ? currentMaintTab : '') !== 'importar';
    if(isVisible && isGeneral){
      wrap.classList.add('hidden');
      const btn = $('btnToggleMaintenance');
      if(btn){ btn.classList.remove('maint-btn-open'); btn.classList.add('maint-btn-closed'); }
      try{ renderLockState(); }catch(_){ }
      return;
    }
    try{ currentMaintTab = 'personas'; }catch(_){ }
    wrap.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ }
    try{ renderMaintenanceTabs(); }catch(_){ }
    try{ renderLockState(); }catch(_){ }
    const btn = $('btnToggleMaintenance');
    if(btn){ btn.classList.add('maint-btn-open'); btn.classList.remove('maint-btn-closed'); }
  }
  function openImportAndChooseFile(){
    try{ currentMaintTab = 'importar'; }catch(_){ }
    const wrap = $('maintenanceWrapper'); if(wrap) wrap.classList.remove('hidden');
    try{ renderMaintenance(); }catch(_){ }
    try{ renderMaintenanceTabs(); }catch(_){ }
    try{ renderLockState(); }catch(_){ }
    const btn = $('btnToggleMaintenance');
    if(btn){ btn.classList.add('maint-btn-open'); btn.classList.remove('maint-btn-closed'); }
    // v21.0: NO abrir automáticamente el selector de archivo.
    // El usuario debe pulsar manualmente en el input Archivo Excel tras elegir REPLACE/RESUME.
  }
  window.addEventListener('click', ev => {
    const btn = ev.target && ev.target.closest ? ev.target.closest('button') : null;
    if(!btn) return;
    if(btn.id === 'btnToggleMaintenance'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      openMaintenanceGeneral(); return false;
    }
    if(btn.id === 'btnOpenImport'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      openImportAndChooseFile(); return false;
    }
  }, true);
  function applyAllV201(){
    refreshVersion(); normalizeDownloadNames();
    applyGraphTipsV201(); applyBudgetDonationTipsV201(); applyGroupingTipsV201(); applyTicketTipsV201();
  }
  const prevRender = typeof render === 'function' ? render : null;
  if(prevRender && !prevRender.__v201Wrapped){
    const wrapped = function(){ const ret = prevRender.apply(this, arguments); setTimeout(applyAllV201,120); setTimeout(applyAllV201,520); return ret; };
    wrapped.__v201Wrapped = true; render = wrapped; window.render = render;
  }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(applyAllV201,180); setTimeout(applyAllV201,700); setTimeout(applyAllV201,1400); }));
  applyAllV201(); setTimeout(applyAllV201,300); setTimeout(applyAllV201,900); setTimeout(applyAllV201,1800);
})();
