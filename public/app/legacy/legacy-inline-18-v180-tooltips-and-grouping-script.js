/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #18. */
/* ==== V18.0 FIXES: GLOBOS AMPLIADOS, ORDENACIÓN Y AGRUPACIÓN DE DONACIONES ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const norm = v => String(v ?? '').trim();
  const fmt = v => {
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
    catch(_){ return `${Number(v || 0).toFixed(2)} €`; }
  };
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch));
  const byId = (list, id) => (list || []).find(x => String(x.id) === String(id)) || null;
  const event = () => (typeof selectedEvent === 'function' ? selectedEvent() : byId(state?.eventos || [], state?.selectedEventId)) || {};
  const persona = id => (typeof personaById === 'function' ? personaById(id) : byId(state?.personas || [], id)) || {};
  const producto = id => (typeof productoById === 'function' ? productoById(id) : byId(state?.productos || [], id)) || {};
  const tienda = id => (typeof tiendaById === 'function' ? tiendaById(id) : byId(state?.tiendas || [], id)) || {};
  const isDon = v => (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(norm(v));
  const isCurrent = v => (typeof isCurrentExpenseTicket === 'function') ? isCurrentExpenseTicket(v) : norm(v) === 'GASTOS CORRIENTES';
  const compras = () => (typeof comprasForEvent === 'function' ? comprasForEvent() : (state?.compras || []).filter(c => String(c.eventId) === String(state?.selectedEventId)));
  const collabs = () => (typeof collabsForEvent === 'function' ? collabsForEvent() : (state?.colaboradores || []).filter(c => String(c.eventId) === String(state?.selectedEventId)));

  function productName(c){ return c?.producto?.nombre || producto(c?.productoId).nombre || 'Producto'; }
  function productSegment(c){ return norm(c?.segmento || c?.producto?.segmento || producto(c?.productoId).segmento || ''); }
  function productDestino(c){ return norm(c?.destino || c?.producto?.destino || producto(c?.productoId).destino || ''); }
  function storeName(c){ return c?.tienda?.nombre || tienda(c?.tiendaId).nombre || ''; }
  function personNameFromRow(r){ return r?.persona?.nombre || persona(r?.personaId).nombre || 'Sin nombre'; }
  function unitPrice(c){ const p=producto(c?.productoId); return Number(c?.precio != null ? c.precio : (c?.precioCalc != null ? c.precioCalc : (p.defaultPrecio ?? p.precio ?? 0))); }
  function value(c){ return Number(c?.valor != null ? c.valor : unitPrice(c) * Number(c?.unidades || 0)); }
  function donorName(c){
    try{
      if(typeof resolveDonorNameV171 === 'function'){
        const v = resolveDonorNameV171(c);
        if(norm(v) && norm(v) !== 'Sin tienda') return norm(v);
      }
      if(typeof resolveDonorNameV164 === 'function'){
        const v = resolveDonorNameV164(c);
        if(norm(v) && norm(v) !== 'Sin tienda') return norm(v);
      }
      if(c?.donorLabel && norm(c.donorLabel)) return norm(c.donorLabel);
      if(c?.donorRef && norm(c.donorRef)){
        const raw = norm(c.donorRef);
        if(typeof donorLabel === 'function'){
          const d = donorLabel(raw);
          if(norm(d)) return norm(d);
        }
        if(raw.startsWith('P:')) return persona(raw.slice(2)).nombre || raw;
        if(raw.startsWith('T:')) return tienda(raw.slice(2)).nombre || raw;
        return raw;
      }
      if(c?.donante && norm(c.donante)) return norm(c.donante);
      return storeName(c) || 'Sin donante';
    }catch(_){ return 'Sin donante'; }
  }
  function ticketLabel(c){ return norm(c?.ticketDonacion) || 'Pte.Compra u otros gastos'; }
  function normalizeSort(v){ return norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); }
  function cmpText(a,b){ return normalizeSort(a).localeCompare(normalizeSort(b),'es'); }
  function cmpTicketProduct(a,b){ return cmpText(ticketLabel(a), ticketLabel(b)) || cmpText(productName(a), productName(b)) || cmpText(storeName(a), storeName(b)); }
  function cmpDonorProduct(a,b){ return cmpText(donorName(a), donorName(b)) || cmpText(productName(a), productName(b)); }
  function lineExpense(c){
    const u = Number(c?.unidades || 0), pr = unitPrice(c), val = value(c);
    const resp = persona(c?.responsableId).nombre || c?.responsable?.nombre || '';
    return `${ticketLabel(c)} — ${productName(c)} — ${storeName(c) || 'Sin tienda'} — ${u} uds x ${fmt(pr)} = ${fmt(val)}${resp ? ' — Resp.: ' + resp : ''}`;
  }
  function lineDonation(c){
    const u = Number(c?.unidades || 0), pr = unitPrice(c), val = value(c);
    const resp = persona(c?.responsableId).nombre || c?.responsable?.nombre || '';
    return `${donorName(c)} — ${productName(c)} — ${ticketLabel(c)} — ${u} uds x ${fmt(pr)} = ${fmt(val)}${resp ? ' — Resp.: ' + resp : ''}`;
  }
  function listOrEmpty(arr, empty='Sin elementos'){ return arr && arr.length ? arr : [empty]; }
  function incomeLine(r){
    const n = Number(r?.numero || 0);
    const base = Number(r?.base != null ? r.base : (n * Number(event().precio || 0)));
    const vol = Number(r?.donation != null ? r.donation : (r?.importe || 0));
    const total = Number(r?.total != null ? r.total : (base + vol));
    return `${personNameFromRow(r)} — Nº ${n} — Importe socio: ${fmt(base)} — Voluntario: ${fmt(vol)} — Total: ${fmt(total)} — ${r?.situacion || ''}`;
  }

  function donationRows(ticketCode){ return compras().filter(c => norm(c.ticketDonacion) === ticketCode); }
  function groupedNoSociosLines(){
    const map = new Map();
    donationRows('DONADO OTROS').forEach(c => {
      const d = donorName(c);
      if(!map.has(d)) map.set(d, {donor:d, total:0, rows:[]});
      const g = map.get(d);
      g.total += value(c); g.rows.push(c);
    });
    return Array.from(map.values()).sort((a,b)=>cmpText(a.donor,b.donor)).flatMap(g => {
      const details = g.rows.slice().sort(cmpDonorProduct).map(c => `· ${productName(c)} — ${Number(c.unidades || 0)} uds x ${fmt(unitPrice(c))} = ${fmt(value(c))}`);
      return [`${g.donor} — TOTAL ${fmt(g.total)}`, ...details];
    });
  }

  window.budgetSummary = budgetSummary = function(){
    const rows = collabs();
    const cRows = compras();
    const sociosRows = rows.filter(r => r.persona?.rango === 'SOCIO');
    const noSociosRows = rows.filter(r => r.persona?.rango !== 'SOCIO');
    const sumNum = arr => arr.reduce((a,b)=>a+Number(b.numero||0),0);
    const totalRow = r => Number(r.total != null ? r.total : (Number(r.base || 0) + Number(r.donation != null ? r.donation : r.importe || 0)));
    const sumTotal = arr => arr.reduce((a,b)=>a+totalRow(b),0);
    const paidTotal = arr => arr.filter(r => r.situacion !== 'Pendiente').reduce((a,b)=>a+totalRow(b),0);
    const pendingTotal = arr => arr.filter(r => r.situacion === 'Pendiente').reduce((a,b)=>a+totalRow(b),0);
    const collabItems = fn => rows.filter(fn).slice().sort((a,b)=>cmpText(personNameFromRow(a), personNameFromRow(b))).map(incomeLine);
    const socios = {
      count: sumNum(sociosRows), importe: sumTotal(sociosRows), ingresado: paidTotal(sociosRows), pendiente: pendingTotal(sociosRows),
      listImporte: listOrEmpty(collabItems(r => r.persona?.rango === 'SOCIO')),
      listIngresado: listOrEmpty(collabItems(r => r.persona?.rango === 'SOCIO' && r.situacion !== 'Pendiente')),
      listPendiente: listOrEmpty(collabItems(r => r.persona?.rango === 'SOCIO' && r.situacion === 'Pendiente'))
    };
    const noSocios = {
      count: sumNum(noSociosRows), importe: sumTotal(noSociosRows), ingresado: paidTotal(noSociosRows), pendiente: pendingTotal(noSociosRows),
      listImporte: listOrEmpty(collabItems(r => r.persona?.rango !== 'SOCIO')),
      listIngresado: listOrEmpty(collabItems(r => r.persona?.rango !== 'SOCIO' && r.situacion !== 'Pendiente')),
      listPendiente: listOrEmpty(collabItems(r => r.persona?.rango !== 'SOCIO' && r.situacion === 'Pendiente'))
    };
    const gastoCompras = cRows.filter(c => !isDon(c.ticketDonacion) && !isCurrent(c.ticketDonacion) && norm(c.ticketDonacion) !== '').reduce((a,b)=>a+value(b),0);
    const gastosOrganizacion = cRows.filter(c => isCurrent(c.ticketDonacion)).reduce((a,b)=>a+value(b),0);
    const pendiente = cRows.filter(c => !isDon(c.ticketDonacion) && norm(c.ticketDonacion) === '').reduce((a,b)=>a+value(b),0);
    const donacionProducto = {
      donadoTienda: donationRows('DONADO TIENDA').reduce((a,b)=>a+value(b),0),
      donadoSocio: donationRows('DONADO SOCIO').reduce((a,b)=>a+value(b),0),
      donadoOtros: donationRows('DONADO OTROS').reduce((a,b)=>a+value(b),0),
      listTiendas: listOrEmpty(donationRows('DONADO TIENDA').slice().sort(cmpDonorProduct).map(lineDonation)),
      listSocios: listOrEmpty(donationRows('DONADO SOCIO').slice().sort(cmpDonorProduct).map(lineDonation)),
      listNoSocios: listOrEmpty(groupedNoSociosLines())
    };
    donacionProducto.valorDonado = donacionProducto.donadoTienda + donacionProducto.donadoSocio + donacionProducto.donadoOtros;
    const ingresosTotal = socios.importe + noSocios.importe;
    const ingresosRealizados = socios.ingresado + noSocios.ingresado;
    const gastosTotal = gastoCompras + gastosOrganizacion + pendiente;
    const gastosRealizados = gastoCompras + gastosOrganizacion;
    return {
      ingresosDinero:{socios, noSocios, donantes:noSocios, totalIngresado:ingresosRealizados, totalComprometido:ingresosTotal, pendiente:socios.pendiente + noSocios.pendiente},
      donacionProducto,
      operativa:{ingresos:ingresosTotal, ingresoDinero:ingresosRealizados, gastoCompras, gastosOrganizacion, pendiente, saldoActual:ingresosRealizados - gastosRealizados, saldoOperativo:ingresosTotal - gastosTotal}
    };
  };

  function groupingRows(kind){
    const rows = compras();
    const baseKeys = kind === 'segmento'
      ? (typeof SEGMENT_OPTIONS !== 'undefined' ? SEGMENT_OPTIONS.slice() : [])
      : (typeof DESTINO_OPTIONS !== 'undefined' ? DESTINO_OPTIONS.slice() : []);
    const seen = new Set(baseKeys.map(String));
    rows.forEach(c => {
      const k = kind === 'segmento' ? productSegment(c) : productDestino(c);
      if(k && !seen.has(String(k))){ seen.add(String(k)); baseKeys.push(k); }
    });
    return baseKeys.map(k => {
      const match = c => String(kind === 'segmento' ? productSegment(c) : productDestino(c)) === String(k);
      const comprados = rows.filter(c => match(c) && !isDon(c.ticketDonacion) && !isCurrent(c.ticketDonacion) && norm(c.ticketDonacion) !== '').sort(cmpTicketProduct);
      const donados = rows.filter(c => match(c) && isDon(c.ticketDonacion)).sort(cmpDonorProduct);
      const pendientes = rows.filter(c => match(c) && !isDon(c.ticketDonacion) && norm(c.ticketDonacion) === '').sort(cmpTicketProduct);
      const comprado = comprados.reduce((a,b)=>a+value(b),0);
      const donado = donados.reduce((a,b)=>a+value(b),0);
      const pendiente = pendientes.reduce((a,b)=>a+value(b),0);
      return {
        label:k,
        comprado, donado, pendiente,
        total: comprado + donado + pendiente,
        listComprado: listOrEmpty(comprados.map(lineExpense), 'Sin productos comprados'),
        listDonado: listOrEmpty(donados.map(lineDonation), 'Sin productos donados'),
        listPendiente: listOrEmpty(pendientes.map(lineExpense), 'Sin productos pendientes')
      };
    });
  }
  window.summaryBySegmento = summaryBySegmento = function(){ return groupingRows('segmento'); };
  window.summaryByDestino = summaryByDestino = function(){ return groupingRows('destino'); };

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }
  refreshVersion();
  window.addEventListener('load', () => { refreshVersion(); try{ if(typeof render === 'function') render(); }catch(_){} });
})();
