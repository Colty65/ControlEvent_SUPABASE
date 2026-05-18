/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #38. */
/* ==== V21.5: solo corrige fotos INFOEVENTO y duplicidad Donaciones Producto+Donante ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function st(){ try{ if(typeof state !== 'undefined') return state; }catch(_){ } return window.state || {}; }
  function ev(){ try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ } const s=st(); return (s.eventos||[]).find(e => String(e.id) === String(s.selectedEventId)) || {}; }
  function evId(){ const e=ev(); return String(e.id || st().selectedEventId || ''); }
  function compras(){ try{ if(typeof comprasForEvent === 'function') return comprasForEvent() || []; }catch(_){ } const id=evId(); return (st().compras||[]).filter(c => String(c.eventId||'') === id); }
  function product(id){ try{ if(typeof productoById === 'function') return productoById(id) || {}; }catch(_){ } return (st().productos||[]).find(p => String(p.id) === String(id)) || {}; }
  function isDon(v){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(v); }catch(_){ } return up(v).startsWith('DONADO'); }
  function parseEuro(v){ try{ if(typeof parseEuroInput === 'function') return parseEuroInput(v); }catch(_){ } const n=String(v??'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',', '.'); return Number(n||0); }
  function uidSafe(){ try{ if(typeof uid === 'function') return uid(); }catch(_){ } return Date.now() + '_' + Math.random().toString(36).slice(2); }
  function findDonationSameProductDonor(productId, donorRef){
    const p=String(productId||'');
    const d=String(donorRef||'');
    if(!p) return null;
    return compras().find(c => isDon(c.ticketDonacion) && String(c.productoId||'') === p && String(c.donorRef||'') === d) || null;
  }
  function locateDonationRow(id){
    let el = $('donacionRow_' + id);
    if(el) return el;
    const safe = (window.CSS && CSS.escape) ? CSS.escape(String(id)) : String(id).replace(/"/g,'\\"');
    return document.querySelector(`#donacionesList select[data-action="edit-donacion-producto"][data-id="${safe}"]`)?.closest?.('.itemcard') || null;
  }
  function setFound(el){
    if(!el) return;
    document.querySelectorAll('.found-target').forEach(x => x.classList.remove('found-target'));
    el.classList.add('found-target');
    try{ el.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ el.scrollIntoView(); }catch(__){} }
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

  // BLOQUEO DEFINITIVO DEL SALTO AL ELEGIR PRODUCTO EN DONACIONES.
  // Se captura en window, antes de los listeners antiguos de document que buscaban por producto.
  window.addEventListener('change', function(e){
    const t = e.target;
    if(!t || t.id !== 'donProducto') return;
    try{ if(typeof updateDonationPreview === 'function') updateDonationPreview(true); }catch(_){ }
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }, true);

  // AÑADIR DONACIÓN: solo aquí se comprueba duplicidad, y por Producto + Donante.
  window.addDonation = addDonation = function(){
    try{ if(typeof selectedEvent === 'function' && !selectedEvent()) return; }catch(_){ if(!evId()) return; }
    const productId = $('donProducto')?.value || '';
    if(!productId) return;
    const donorRef = $('donDonante')?.value || '';
    const found = findDonationSameProductDonor(productId, donorRef);
    if(found){ jumpToDonation(found); return; }
    const p = product(productId);
    const precio = parseEuro($('donPrecio')?.value || p.defaultPrecio || p.precio || 0);
    const rec = {
      id: uidSafe(),
      eventId: evId(),
      productoId: productId,
      unidades: Number($('donUnidades')?.value || 0),
      precio: precio,
      ticketDonacion: $('donTicket')?.value || 'DONADO TIENDA',
      donorRef: donorRef,
      responsableId: $('donResponsable')?.value || ''
    };
    if(!Array.isArray(st().compras)) st().compras = [];
    st().compras.push(rec);
    try{ if(typeof save === 'function') save(); }catch(_){ }
    resetDonationInputs();
    try{ currentMainTab = 'donaciones'; }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
    setTimeout(() => setFound(locateDonationRow(rec.id)), 150);
  };

  // FOTOS EN INFOEVENTO: se enriquecen las filas de Por tienda y Ticket con imagen aunque la clave
  // se hubiera guardado con una variante antigua o visible del texto.
  function ticketImageKeyFor(candidate){
    const id=evId();
    try{ if(typeof ticketImageStateKey === 'function') return ticketImageStateKey(candidate, id); }catch(_){ }
    return `${id}|${candidate}`;
  }
  function imageByCandidate(candidate){
    const s=st(); const imgs=s.ticketImages || {}; const c=norm(candidate); if(!c) return '';
    const directKeys = [c, ticketImageKeyFor(c), `${evId()}|${c}`];
    for(const k of directKeys){ if(imgs[k]) return imgs[k]; }
    return '';
  }
  function splitKeyLike(value){
    const v=norm(value).split('·')[0].trim();
    const parts=v.split('|').map(x=>norm(x)).filter(Boolean);
    return parts;
  }
  function resolveTicketImage(row){
    if(!row || row.pending || row.donated === true || row.attachable === false) return row?.image || '';
    const candidates=[];
    [row.k,row.label,row.key,row.clave,row.concepto].forEach(v=>{ if(norm(v)) candidates.push(norm(v)); });
    // Variantes tienda|ticket y ticket|tienda.
    [row.k,row.label].forEach(v=>{
      const p=splitKeyLike(v);
      if(p.length>=2){
        candidates.push(`${p[0]} | ${p[1]}`);
        candidates.push(`${p[1]} | ${p[0]}`);
        candidates.push(`${p[0]}|${p[1]}`);
        candidates.push(`${p[1]}|${p[0]}`);
      }
    });
    // Si hay rawTicket, buscar combinaciones con la tienda del k.
    if(norm(row.rawTicket)){
      const p=splitKeyLike(row.k || row.label);
      if(p[0]){
        candidates.push(`${p[0]} | ${row.rawTicket}`);
        candidates.push(`${row.rawTicket} | ${p[0]}`);
      }
      candidates.push(norm(row.rawTicket));
    }
    for(const c of Array.from(new Set(candidates))){ const img=imageByCandidate(c); if(img) return img; }

    // Búsqueda flexible dentro de las imágenes del evento activo: coinciden ticket y tienda.
    const imgs=st().ticketImages || {}; const prefix=`${evId()}|`;
    const parts=splitKeyLike(row.k || row.label);
    const a=up(parts[0]||''), b=up(parts[1]||row.rawTicket||'');
    for(const [k,v] of Object.entries(imgs)){
      const kk=String(k);
      if(prefix && !kk.startsWith(prefix)) continue;
      const rest=up(kk.slice(prefix.length));
      if((!a || rest.includes(a)) && (!b || rest.includes(b))) return v;
    }
    return row.image || '';
  }
  const prevSummary = typeof summaryByTiendaTicket === 'function' ? summaryByTiendaTicket : null;
  if(prevSummary && !prevSummary.__v215ImageWrapped){
    const wrapped = function(){
      const rows = (prevSummary.apply(this, arguments) || []).map(r => {
        const nr = Object.assign({}, r);
        const img = resolveTicketImage(nr);
        if(img) nr.image = img;
        return nr;
      });
      return rows;
    };
    wrapped.__v215ImageWrapped = true;
    summaryByTiendaTicket = wrapped;
    window.summaryByTiendaTicket = wrapped;
  }

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el=>{ if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent||'')) el.textContent = VERSION; }); }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__v215Wrapped){
        const prev = proto.click;
        const w = function(){ try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ } return prev.apply(this, arguments); };
        w.__v215Wrapped = true; proto.click = w;
      }
    }catch(_){ }
  }
  function apply(){ refreshVersion(); try{ if(typeof renderBudget === 'function') renderBudget(); }catch(_){ } }
  ['DOMContentLoaded','load'].forEach(evt => window.addEventListener(evt, () => { setTimeout(apply,220); setTimeout(apply,900); }));
  refreshVersion(); setTimeout(apply,400); setTimeout(apply,1300);
})();
