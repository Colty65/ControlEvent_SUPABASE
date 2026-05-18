/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #36. */
/* ==== V21.4: donaciones duplicadas por Producto+Donante y corrección gráfico ingresos socio ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function selectedEv(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e => String(e.id) === String(s.selectedEventId)) || {}; }
  function selectedId(){ const ev=selectedEv(); return String(ev.id || st().selectedEventId || ''); }
  function rowsCompras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=selectedId(); return (st().compras||[]).filter(c => String(c.eventId||'') === id); }
  function rowsIngresos(){ try{ if(typeof collabsForEvent === 'function') return collabsForEvent() || []; }catch(_){ } const id=selectedId(); return (st().colaboradores||[]).filter(c => String(c.eventId||'') === id); }
  function persona(id){ try{ if(typeof personaById === 'function') return personaById(id) || {}; }catch(_){ } return (st().personas||[]).find(p => String(p.id) === String(id)) || {}; }
  function product(id){ try{ if(typeof productoById === 'function') return productoById(id) || {}; }catch(_){ } return (st().productos||[]).find(p => String(p.id) === String(id)) || {}; }
  function tienda(id){ try{ if(typeof tiendaById === 'function') return tiendaById(id) || {}; }catch(_){ } return (st().tiendas||[]).find(t => String(t.id) === String(id)) || {}; }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return up(v).startsWith('DONADO'); }
  function isCurrent(v){ try{ if(typeof isCurrentExpenseTicket === 'function') return isCurrentExpenseTicket(v); }catch(_){ } return up(v) === 'GASTOS CORRIENTES'; }
  function money(v){ try{ if(typeof formatEuro === 'function') return formatEuro(Number(v||0)); }catch(_){} try{ if(typeof window.money === 'function') return window.money(Number(v||0)); }catch(_){} return Number(v||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €'; }
  function donorLabelFromRef(ref){
    const raw = norm(ref);
    if(!raw) return '';
    if(raw.startsWith('P:')) return persona(raw.slice(2)).nombre || raw;
    if(raw.startsWith('T:')) return tienda(raw.slice(2)).nombre || raw;
    try{ if(typeof donorLabel === 'function'){ const d=donorLabel(raw); if(norm(d)) return d; } }catch(_){ }
    return raw;
  }
  function findDonationSameProductDonor(productId, donorRef){
    const p = String(productId || '');
    const d = String(donorRef || '');
    if(!p) return null;
    return rowsCompras().find(c => isDon(c.ticketDonacion) && String(c.productoId || '') === p && String(c.donorRef || '') === d) || null;
  }
  function locateDonationRow(id){
    let el = $('donacionRow_' + id);
    if(el) return el;
    const safe = (window.CSS && CSS.escape) ? CSS.escape(String(id)) : String(id).replace(/"/g,'\\"');
    const sel = document.querySelector(`#donacionesList select[data-action="edit-donacion-producto"][data-id="${safe}"]`);
    return sel?.closest?.('.itemcard') || null;
  }
  function setFound(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth',block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
    setTimeout(() => el.classList.remove('found-target'), 2800);
  }
  function jumpToDonation(row){
    if(!row) return false;
    try{ currentMainTab = 'donaciones'; }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
    setTimeout(() => setFound(locateDonationRow(row.id)), 120);
    return true;
  }
  function resetDonationInputs(){
    ['donProducto','donDonante','donResponsable'].forEach(id => { const el=$(id); if(el) el.value=''; });
    if($('donUnidades')) $('donUnidades').value = '1.00';
    if($('donPrecio')) $('donPrecio').value = '0,00 €';
    if($('donImporte')) $('donImporte').value = '';
    try{ if($('donTicket') && typeof DONATION_TICKET_OPTIONS !== 'undefined') $('donTicket').value = DONATION_TICKET_OPTIONS[0]; }catch(_){ }
  }
  // Refuerzo extra: seleccionar producto en Donaciones solo actualiza la previsualización; nunca salta al registro.
  document.addEventListener('change', function(ev){
    const t = ev.target;
    if(!t || t.id !== 'donProducto') return;
    try{ if(typeof updateDonationPreview === 'function') updateDonationPreview(); }catch(_){ }
  }, true);
  // Añadir donación: duplicidad únicamente por Producto + Donante.
  window.addDonation = addDonation = function(){
    try{ if(typeof selectedEvent === 'function' && !selectedEvent()) return; }catch(_){ if(!selectedId()) return; }
    const productId = $('donProducto')?.value || '';
    if(!productId) return;
    const donorRef = $('donDonante')?.value || '';
    const found = findDonationSameProductDonor(productId, donorRef);
    if(found){ jumpToDonation(found); return; }
    const p = product(productId);
    const rawPrecio = $('donPrecio')?.value || p.precio || p.defaultPrecio || 0;
    const precio = (typeof parseEuroInput === 'function') ? parseEuroInput(rawPrecio) : Number(rawPrecio || 0);
    const rec = {
      id: (typeof uid === 'function' ? uid() : (Date.now() + '_' + Math.random().toString(36).slice(2))),
      eventId: selectedId(),
      productoId: productId,
      unidades: Number($('donUnidades')?.value || 0),
      precio: precio,
      ticketDonacion: $('donTicket')?.value || 'DONADO TIENDA',
      donorRef: donorRef,
      responsableId: $('donResponsable')?.value || ''
    };
    if(!Array.isArray(st().compras)) st().compras = [];
    st().compras.push(rec);
    resetDonationInputs();
    try{ currentMainTab = 'donaciones'; }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
    setTimeout(() => setFound(locateDonationRow(rec.id)), 150);
  };
  function personName(r){ return r?.persona?.nombre || persona(r?.personaId).nombre || r?.nombre || 'Sin nombre'; }
  function rango(r){ return up(r?.persona?.rango || persona(r?.personaId).rango || ''); }
  function forma(r){ return up(r?.situacion || ''); }
  function eventPrice(){ return Number(selectedEv().precio || 0); }
  function socioAmount(r){
    // En la gráfica de INGRESOS, la parte de SOCIOS debe coincidir con Resumen presupuestario:
    // Importe socio = Número x Precio evento. No usar r.total, r.base ni r.importeSocio porque
    // en algunos eventos antiguos pueden contener aportación voluntaria u otro importe acumulado.
    const n = Number(r?.numero || 0);
    return n * eventPrice();
  }
  function rowTotal(r){
    if(rango(r) === 'SOCIO') return socioAmount(r);
    if(r?.total != null && Number.isFinite(Number(r.total))) return Number(r.total || 0);
    if(r?.donation != null && Number.isFinite(Number(r.donation))) return Number(r.donation || 0);
    if(r?.importe != null && Number.isFinite(Number(r.importe))) return Number(r.importe || 0);
    return 0;
  }
  function incomeLine(r){
    const n = Number(r?.numero || 0);
    const socio = rango(r) === 'SOCIO' ? socioAmount(r) : 0;
    const vol = rango(r) === 'SOCIO' ? 0 : rowTotal(r);
    const total = rowTotal(r);
    return `${personName(r)} — Nº ${n} — Importe socio: ${money(socio)} — Importe voluntario: ${money(vol)} — Total: ${money(total)} — ${r?.situacion || ''}`;
  }
  // Corregimos el origen de la barra INGRESOS para que SOCIOS compute como el resumen: número x precio evento, no total con voluntario.
  const oldGraphParts = typeof window.graphPartsV171 === 'function' ? window.graphPartsV171 : null;
  function graphPartsFixed(){
    const g = oldGraphParts ? oldGraphParts() : {incomeItems:[],donationItems:[],expenseItems:[],saldoItems:[],totalDon:0,totalExp:0,saldoOperativo:0};
    const rows = rowsIngresos();
    const sum = arr => arr.reduce((a,b) => a + Number(b || 0), 0);
    const mk = (label, filter, color) => {
      const list = rows.filter(filter);
      return { label, value: sum(list.map(rowTotal)), color, lines: list.slice().sort((a,b)=>personName(a).localeCompare(personName(b),'es')).map(incomeLine) };
    };
    const fixedIncome = [
      mk('Socios Banco', r => rango(r)==='SOCIO' && forma(r)==='BANCO', '#2563eb'),
      mk('Socios Bizum', r => rango(r)==='SOCIO' && forma(r)==='BIZUM', '#16a34a'),
      mk('Socios Efectivo', r => rango(r)==='SOCIO' && forma(r)==='EFECTIVO', '#84cc16'),
      mk('No socios Banco', r => rango(r)!=='SOCIO' && forma(r)==='BANCO', '#60a5fa'),
      mk('No socios Bizum', r => rango(r)!=='SOCIO' && forma(r)==='BIZUM', '#34d399'),
      mk('No socios Efectivo', r => rango(r)!=='SOCIO' && forma(r)==='EFECTIVO', '#bef264'),
      mk('Pendiente de ingresar', r => forma(r)==='PENDIENTE', '#f59e0b')
    ];
    g.incomeItems = fixedIncome;
    g.totalIncomeRaw = fixedIncome.reduce((a,b)=>a+Number(b.value||0),0);
    try{
      const b = typeof budgetSummary === 'function' ? budgetSummary() : null;
      const budgetTotal = Number(b?.ingresosDinero?.totalIngresado);
      g.totalIncome = Number.isFinite(budgetTotal) ? budgetTotal : g.totalIncomeRaw;
    }catch(_){ g.totalIncome = g.totalIncomeRaw; }
    // Si por datos antiguos el resumen no coincidiera, priorizamos que la leyenda y la barra sumen igual.
    if(Math.abs(Number(g.totalIncome || 0) - Number(g.totalIncomeRaw || 0)) > 0.005) g.totalIncome = g.totalIncomeRaw;
    return g;
  }
  window.graphPartsV171 = graphPartsV171 = graphPartsFixed;
  window.graphPartsV164 = graphPartsFixed;
  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; });
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v214Wrapped){
        const prev = proto.click;
        const wrapped = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){} return prev.apply(this, arguments); };
        wrapped.__v214Wrapped = true; proto.click = wrapped;
      }
    }catch(_){ }
  }
  function apply(){ refreshVersion(); try{ if(typeof renderGraficas === 'function') renderGraficas(); }catch(_){ } }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(apply,250); setTimeout(apply,1000); }));
  refreshVersion(); setTimeout(apply,400); setTimeout(apply,1400);
})();
