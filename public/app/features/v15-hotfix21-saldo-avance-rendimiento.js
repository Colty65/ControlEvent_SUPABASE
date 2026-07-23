/* ControlEvent v23_prod_r2 - HOTFIX46: avance único, rendimiento, títulos de modales y fuente Inter. */
(function(){
  'use strict';
  const INSTALLED = '__ceV15Hotfix21SaldoAvanceRendimiento';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const safe = (fn, fb) => { try{ const out = fn(); return out === undefined ? fb : out; }catch(_){ return fb; } };
  const raf = fn => (window.requestAnimationFrame || window.setTimeout)(fn, 16);

  function st(){ return safe(() => (typeof state !== 'undefined' && state) ? state : null, null) || window.state || window.ControlEventApp?.state || {}; }
  function arr(name){ const s = st(); return Array.isArray(s[name]) ? s[name] : []; }
  function selectedEventId(){
    const ev = safe(() => (typeof window.selectedEvent === 'function') ? window.selectedEvent() : null, null) || safe(() => (typeof selectedEvent === 'function') ? selectedEvent() : null, null);
    return norm(ev?.id || st().selectedEventId || $('selectedEvent')?.value || '');
  }
  function selectedEventObj(){
    const ev = safe(() => (typeof window.selectedEvent === 'function') ? window.selectedEvent() : null, null) || safe(() => (typeof selectedEvent === 'function') ? selectedEvent() : null, null);
    if(ev && ev.id) return ev;
    const id = selectedEventId();
    return arr('eventos').find(e => String(e?.id || '') === id) || {};
  }
  function isFinalizado(){ return up(selectedEventObj().situacion || '') === 'FINALIZADO'; }
  function eventTitle(){
    const ev = selectedEventObj();
    const select = $('selectedEvent');
    return norm(ev.titulo || select?.selectedOptions?.[0]?.textContent || 'Evento');
  }
  function money(v){ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }
  function docCode(value){ const m = String(value || '').toUpperCase().match(/DOC\s*(\d+)/); return m ? 'DOC' + String(Number(m[1])).padStart(2,'0') : ''; }
  function imageKeyPresent(key){
    const s = st();
    const raw = String(key || '');
    const compact = raw.replace(/\s+/g,'');
    return !!(s.ticketImages?.[raw] || s.ticketImageRefs?.[raw] || s.ticketImages?.[compact] || s.ticketImageRefs?.[compact]);
  }

  function injectStyle(){
    if($('ceHf46Style')) return;
    const style = document.createElement('style');
    style.id = 'ceHf46Style';
    style.textContent = `
      html,body,button,input,select,textarea,.app{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif!important;}
      #selectedEvent{pointer-events:auto!important;position:relative!important;z-index:4000!important;}
      #ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,#ceHf16AvanceBtn,#ceHf17AvanceBtn,#ceHf18AvanceBtn,#ceHf19AvanceBtn,#ceHf20AvanceBtn,#ceHf40AvanceBtn,#ceHf41AvanceBtn,#ceHf42AvanceBtn,#ceHf43AvanceBtn,#ceHf44AvanceBtn,#ceHf45AvanceBtn,
      .ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,.ce-hf17-mapa-actions,.ce-hf18-mapa-actions,.ce-hf19-mapa-actions,.ce-hf20-mapa-actions,.ce-hf40-mapa-actions,.ce-hf41-mapa-actions,.ce-hf42-mapa-actions,.ce-hf43-mapa-actions,.ce-hf44-mapa-actions,.ce-hf45-mapa-actions,
      #ceHf13MapaAvancePanel,#ceHf14MapaAvancePanel,#ceHf15MapaAvancePanel,#ceHf16MapaAvancePanel,#ceHf17MapaAvancePanel,#ceHf18MapaAvancePanel,#ceHf19MapaAvancePanel,#ceHf20MapaAvancePanel,#ceHf40MapaAvancePanel,#ceHf41MapaAvancePanel,#ceHf42MapaAvancePanel,#ceHf43MapaAvancePanel,#ceHf44MapaAvancePanel,#ceHf45MapaAvancePanel{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      .ce-hf46-mapa-actions{position:absolute!important;left:50%!important;top:20px!important;transform:translateX(-50%)!important;z-index:8!important;display:flex!important;justify-content:center!important;pointer-events:none!important;}
      #ceHf46AvanceBtn{appearance:none!important;border:1px solid #cbd5e1!important;background:#fff!important;border-radius:14px!important;box-shadow:0 10px 22px rgba(15,23,42,.20)!important;width:46px!important;height:46px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:26px!important;cursor:pointer!important;pointer-events:auto!important;}
      #ceHf46AvanceBtn[aria-expanded="true"]{outline:4px solid rgba(37,99,235,.18)!important;}
      #ceHf46MapaAvancePanel{width:min(760px,92vw)!important;margin:14px auto 18px!important;background:#f8fafc!important;border:3px solid #0f172a!important;border-radius:20px!important;padding:10px 12px!important;box-shadow:0 18px 38px rgba(15,23,42,.18)!important;}
      #ceHf46MapaAvancePanel.hidden{display:none!important;}
      #ceHf46MapaAvancePanel .ce-hf46-title{display:flex!important;justify-content:space-between!important;gap:8px!important;margin-bottom:8px!important;font-weight:950!important;letter-spacing:.08em!important;}
      #ceHf46MapaAvancePanel .ce-hf46-row{display:grid!important;grid-template-columns:1fr 68px minmax(160px,1fr)!important;gap:8px!important;align-items:center!important;border:1px solid #dbe4ee!important;background:#fff!important;border-radius:12px!important;padding:7px!important;margin:5px 0!important;}
      #ceHf46MapaAvancePanel .ce-hf46-row b{font-weight:950!important;}#ceHf46MapaAvancePanel small{display:block!important;font-weight:750!important;color:#334155!important;margin-top:2px!important;}#ceHf46MapaAvancePanel .bar{height:10px!important;border-radius:99px!important;background:#e5e7eb!important;overflow:hidden!important;}#ceHf46MapaAvancePanel .bar i{display:block!important;height:100%!important;background:#2563eb!important;border-radius:99px!important;}
      .ce-hf46-event-modal-title{font-weight:950!important;text-align:center!important;line-height:1.15!important;letter-spacing:.01em!important;}
      .ce-hf46-event-modal-title.is-finalizado{color:#991b1b!important}.ce-hf46-event-modal-title.is-curso{color:#15803d!important}
    `;
    document.head.appendChild(style);
  }

  function removeOldAvanceArtifacts(){
    document.querySelectorAll('#ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,#ceHf16AvanceBtn,#ceHf17AvanceBtn,#ceHf18AvanceBtn,#ceHf19AvanceBtn,#ceHf20AvanceBtn,#ceHf40AvanceBtn,#ceHf41AvanceBtn,#ceHf42AvanceBtn,#ceHf43AvanceBtn,#ceHf44AvanceBtn,#ceHf45AvanceBtn,[id^="ceHf13MapaAvancePanel"],[id^="ceHf14MapaAvancePanel"],[id^="ceHf15MapaAvancePanel"],[id^="ceHf16MapaAvancePanel"],[id^="ceHf17MapaAvancePanel"],[id^="ceHf18MapaAvancePanel"],[id^="ceHf19MapaAvancePanel"],[id^="ceHf20MapaAvancePanel"],[id^="ceHf40MapaAvancePanel"],[id^="ceHf41MapaAvancePanel"],[id^="ceHf42MapaAvancePanel"],[id^="ceHf43MapaAvancePanel"],[id^="ceHf44MapaAvancePanel"],[id^="ceHf45MapaAvancePanel"],.ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,.ce-hf17-mapa-actions,.ce-hf18-mapa-actions,.ce-hf19-mapa-actions,.ce-hf20-mapa-actions,.ce-hf40-mapa-actions,.ce-hf41-mapa-actions,.ce-hf42-mapa-actions,.ce-hf43-mapa-actions,.ce-hf44-mapa-actions,.ce-hf45-mapa-actions').forEach(node => { try{ node.remove(); }catch(_){ } });
  }

  function mapCard(){
    const tab = $('tabMapaProductos');
    if(!tab) return null;
    return tab.querySelector('.mapa-productos-card,.card,.panel,.view-card') || tab;
  }

  function ensureAvanceButton(){
    injectStyle();
    removeOldAvanceArtifacts();
    const card = mapCard();
    if(!card) return;
    try{ if(getComputedStyle(card).position === 'static') card.style.position = 'relative'; }catch(_){ }
    let actions = $('ceHf46MapaActions');
    if(!actions || !card.contains(actions)){
      actions = document.createElement('div');
      actions.id = 'ceHf46MapaActions';
      actions.className = 'ce-hf46-mapa-actions';
      const title = card.querySelector('.section-title,.mapa-title,.card-title') || card.firstElementChild || card;
      try{ title.insertAdjacentElement('afterend', actions); }catch(_){ card.prepend(actions); }
    }
    let btn = $('ceHf46AvanceBtn');
    if(!btn || !actions.contains(btn)){
      if(btn) btn.remove();
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'ceHf46AvanceBtn';
      btn.title = 'Avance del evento';
      btn.setAttribute('aria-expanded','false');
      btn.textContent = '⏱️';
      actions.appendChild(btn);
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        toggleAvancePanel();
      }, false);
    }
  }

  function computeAvance(){
    const ev = selectedEventObj();
    const evId = selectedEventId();
    const col = arr('colaboradores').filter(c => String(c.eventId || c.event_id || '') === evId);
    const precio = Number(ev.precio || 0);
    const totalIngresos = col.reduce((sum,c) => sum + Number(c.importe ?? c.importeVoluntario ?? c.voluntario ?? 0) + (Number(c.obligatorio ?? 0) || (Number(c.numero || 0) * precio)), 0);
    const previstoIngresos = totalIngresos || col.reduce((sum,c) => sum + Number(c.numero || 0) * precio, 0);
    const ingresosPct = previstoIngresos > 0 ? Math.min(100, totalIngresos / previstoIngresos * 100) : 0;
    const fotosIng = col.filter(c => imageKeyPresent(`${evId}|INGRESO:${c.id}`) || imageKeyPresent(`${evId}|INGRESO|${c.id}`)).length;
    const compras = arr('compras').filter(c => String(c.eventId || c.event_id || '') === evId);
    const don = compras.filter(c => norm(c.ticketDonacion || c.ticket_donacion || c.donorRef || c.donor_ref));
    const comp = compras.filter(c => !norm(c.ticketDonacion || c.ticket_donacion || c.donorRef || c.donor_ref));
    const docs = (Array.isArray(st().eventDocuments) ? st().eventDocuments : []).filter(d => String(d.eventId || '') === evId);
    const docKeys = new Set(docs.map(d => `${evId}|${docCode(d.codigo || d.imageKey || d.id)}`).filter(k => !k.endsWith('|')));
    Object.keys(st().ticketImages || {}).forEach(k => { if(k.startsWith(evId + '|') && /DOC\s*\d+/i.test(k)) docKeys.add(k); });
    const tickets = [...new Set(comp.map(c => norm(c.ticket || c.ticketDonacion || c.ticket_donacion || '').toUpperCase()).filter(v => /TK\d+/i.test(v)))];
    const ticketPhotos = tickets.filter(tk => Object.keys(st().ticketImages || {}).some(k => k.startsWith(evId + '|') && k.toUpperCase().includes(tk))).length;
    return [
      {n:1,t:'INGRESOS',p:ingresosPct,d:`${money(totalIngresos)} de ${money(previstoIngresos)} ingresados`},
      {n:2,t:'FOTOS INGRESOS',p:col.length ? fotosIng/col.length*100 : 0,d:`${fotosIng} de ${col.length} ingresos realizados con justificante`},
      {n:3,t:'DONACIONES',p:100,d:`Donaciones registradas: ${don.length}`},
      {n:4,t:'COMPRAS',p:comp.length ? 100 : 0,d:`${comp.length} líneas asignadas a TKxx o gastos corrientes`},
      {n:5,t:'DOCUMENTOS',p:docKeys.size ? 100 : 0,d:`${docKeys.size} documento(s) adjunto(s)`},
      {n:6,t:'FOTOS TICKETS',p:tickets.length ? ticketPhotos/tickets.length*100 : 0,d:`${ticketPhotos} de ${tickets.length} tickets contables con foto adjunta`}
    ];
  }

  function toggleAvancePanel(){
    const card = mapCard();
    if(!card) return;
    let panel = $('ceHf46MapaAvancePanel');
    if(!panel || !card.contains(panel)){
      if(panel) panel.remove();
      panel = document.createElement('div');
      panel.id = 'ceHf46MapaAvancePanel';
      const actions = $('ceHf46MapaActions');
      try{ (actions || card).insertAdjacentElement('afterend', panel); }catch(_){ card.appendChild(panel); }
      panel.classList.add('hidden');
    }
    const btn = $('ceHf46AvanceBtn');
    const willOpen = panel.classList.contains('hidden') || !panel.innerHTML.trim();
    if(willOpen){
      const rows = computeAvance();
      panel.innerHTML = `<div class="ce-hf46-title"><span>AVANCE</span><span>DEL EVENTO</span></div>` + rows.map(r => `<div class="ce-hf46-row"><div><b>${r.n} · ${esc(r.t)}</b><small>${esc(r.d)}</small></div><strong>${Number(r.p || 0).toLocaleString('es-ES',{maximumFractionDigits:2})}%</strong><span class="bar"><i style="width:${Math.max(0,Math.min(100,Number(r.p || 0)))}%"></i></span></div>`).join('');
      panel.classList.remove('hidden');
      btn?.setAttribute('aria-expanded','true');
    }else{
      panel.classList.add('hidden');
      btn?.setAttribute('aria-expanded','false');
    }
  }

  function leafText(el){ return norm(el?.textContent || ''); }
  function isLeafish(el){ return !el || !el.querySelector('table,img,input,select,textarea,button'); }
  function modalTitleMarkup(){ return `<span class="ce-hf46-event-modal-title ${isFinalizado() ? 'is-finalizado' : 'is-curso'}">${esc(eventTitle())}</span>`; }

  function replaceTicketHeading(modal){
    let done = false;
    const candidates = Array.from(modal.querySelectorAll('h1,h2,h3,h4,.modal-title,.ce-modal-title,.ce-v401-pc-modal-head,.ce-v40-modal-head,.head,.modal-head,div,span,strong,b'));
    for(const el of candidates){
      const tx = leafText(el);
      if(/^Foto de ticket$/i.test(tx) && isLeafish(el)){
        el.innerHTML = modalTitleMarkup();
        try{ el.style.textAlign = 'center'; el.style.justifyContent = 'center'; el.style.width = '100%'; }catch(_){ }
        done = true;
        break;
      }
    }
    if(!done){
      const head = modal.querySelector('.ce-v401-pc-modal-head,.ce-v40-modal-head,.head,.modal-head') || modal.firstElementChild;
      if(head && !head.querySelector('.ce-hf46-event-modal-title')){
        const wrap = document.createElement('div');
        wrap.style.cssText = 'text-align:center;width:100%;';
        wrap.innerHTML = modalTitleMarkup();
        head.prepend(wrap);
      }
    }
  }

  function addReceiptEventTitle(modal){
    if(modal.querySelector('.ce-hf46-event-modal-title')) return;
    const candidates = Array.from(modal.querySelectorAll('h1,h2,h3,h4,.modal-title,.ce-modal-title,.head,.modal-head,div,strong,b'));
    const target = candidates.find(el => /^Justificante de ingreso$/i.test(leafText(el)) && isLeafish(el));
    const title = document.createElement('div');
    title.className = `ce-hf46-event-modal-title ${isFinalizado() ? 'is-finalizado' : 'is-curso'}`;
    title.textContent = eventTitle();
    title.style.cssText = 'text-align:center;width:100%;font-size:20px;margin:0 auto 10px;';
    if(target){ target.insertAdjacentElement('afterend', title); }
    else{
      const head = modal.querySelector('.head,.modal-head,.ce-v401-pc-modal-head,.ce-v40-modal-head') || modal.firstElementChild;
      head?.appendChild(title);
    }
  }

  function removeCalcHeading(modal){
    Array.from(modal.querySelectorAll('h1,h2,h3,h4,div,span,strong,b')).forEach(el => {
      const tx = leafText(el);
      if(/^CALCULOS\s+POR\s+AGRUPACION\s*\/\s*POR\s+TIENDA\s+Y\s+TICKET$/i.test(tx) && isLeafish(el)){
        try{ el.remove(); }catch(_){ }
      }
    });
  }

  function sortProductTables(root){
    root.querySelectorAll('table').forEach(table => {
      const rows = Array.from(table.rows || []);
      if(rows.length < 3) return;
      const headerIndex = rows.findIndex(row => Array.from(row.cells || []).some(cell => /producto/i.test(cell.textContent || '')));
      if(headerIndex < 0) return;
      const header = rows[headerIndex];
      const productIdx = Array.from(header.cells || []).findIndex(cell => /producto/i.test(cell.textContent || ''));
      if(productIdx < 0) return;
      const before = rows.slice(0, headerIndex + 1);
      const dataRows = rows.slice(headerIndex + 1).filter(row => row.cells && row.cells.length > productIdx && norm(row.cells[productIdx].textContent));
      if(dataRows.length < 2) return;
      const sorted = dataRows.slice().sort((a,b) => norm(a.cells[productIdx].textContent).localeCompare(norm(b.cells[productIdx].textContent), 'es', {sensitivity:'base'}));
      const parent = header.parentElement;
      if(!parent) return;
      sorted.forEach(row => parent.appendChild(row));
      before.forEach(row => { if(row.parentElement !== parent) parent.insertBefore(row, parent.firstChild); });
    });
  }

  function patchPhotoModalTitles(){
    injectStyle();
    const modals = Array.from(document.querySelectorAll('#ceV401PcPhotoModal,#ceV40TicketPhotoModal,#ceV104TicketDetail,#ceV103TicketDetail,#ceV102TicketDetail,#ceV101TicketDetail,#ceV100TicketDetail,#ceV96TicketDetail,#ceV310PhotoViewer,#ceTicketModalV234,#ceTicketImageModalV225,.ce-v40-modal,.ce-v401-pc-modal,.modal,.dialog,[role="dialog"]'));
    modals.forEach(modal => {
      const text = modal.textContent || '';
      const isTicket = /Foto de ticket|CALCULOS\s+POR\s+AGRUPACION|Ticket\/Otros|TK\d/i.test(text);
      const isReceipt = /Justificante de ingreso/i.test(text);
      if(isTicket){
        replaceTicketHeading(modal);
        removeCalcHeading(modal);
        sortProductTables(modal);
      }
      if(isReceipt){
        addReceiptEventTitle(modal);
      }
    });
  }

  let scheduled = false;
  function scheduleInstall(){
    if(scheduled) return;
    scheduled = true;
    raf(() => {
      scheduled = false;
      ensureAvanceButton();
      patchPhotoModalTitles();
    });
  }

  function install(){
    injectStyle();
    ensureAvanceButton();
    patchPhotoModalTitles();
    window.ControlEventHf46 = Object.assign(window.ControlEventHf46 || {}, {
      repairAvance: ensureAvanceButton,
      patchModals: patchPhotoModalTitles
    });
  }

  document.addEventListener('DOMContentLoaded', install, {once:true});
  document.addEventListener('change', ev => { if(ev.target && ev.target.id === 'selectedEvent') scheduleInstall(); }, false);
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#tabMapaBtn,[data-tab="mapa"],[data-tab="mapa-productos"]')) scheduleInstall(); }, false);
  try{ new MutationObserver(scheduleInstall).observe(document.body || document.documentElement, {childList:true, subtree:true}); }catch(_){ }
  install();
})();
