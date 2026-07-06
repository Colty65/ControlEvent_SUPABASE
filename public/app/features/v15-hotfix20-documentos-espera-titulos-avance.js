/* ControlEvent v18_prod - HOTFIX45: documentos persistentes, espera visible, titulos y avance estable. */
(function(){
  'use strict';
  const INSTALLED = '__ceV15Hotfix20DocsWaitTitlesAdvance';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const safe = (fn, fb) => { try{ const out = fn(); return out === undefined ? fb : out; }catch(_){ return fb; } };
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
    return arr('eventos').find(e => String(e.id || '') === id) || {};
  }
  function isFinalizado(){ return up(selectedEventObj().situacion || '') === 'FINALIZADO'; }
  function eventTitle(){
    const ev = selectedEventObj();
    const select = $('selectedEvent');
    return norm(ev.titulo || select?.selectedOptions?.[0]?.textContent || 'Evento');
  }
  function money(v){ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
  function imageKeyPresent(key){
    const s = st();
    const imgs = s.ticketImages || {};
    const refs = s.ticketImageRefs || {};
    return !!(imgs[key] || refs[key] || imgs[String(key).replace(/\s+/g,'')] || refs[String(key).replace(/\s+/g,'')]);
  }
  function docCode(value){ const m = String(value||'').toUpperCase().match(/DOC\s*(\d+)/); return m ? 'DOC' + String(Number(m[1])).padStart(2,'0') : ''; }
  function computeAvance(){
    const ev = selectedEventObj();
    const evId = selectedEventId();
    const col = arr('colaboradores').filter(c => String(c.eventId || c.event_id || '') === evId);
    const precio = Number(ev.precio || 0);
    const totalIngresos = col.reduce((sum,c) => sum + Number(c.importe ?? c.importeVoluntario ?? c.voluntario ?? 0) + (Number(c.obligatorio ?? 0) || (Number(c.numero || 0) * precio)), 0);
    const previstoIngresos = col.reduce((sum,c) => sum + Number(c.importe ?? c.importeVoluntario ?? c.voluntario ?? 0) + (Number(c.obligatorio ?? 0) || (Number(c.numero || 0) * precio)), 0) || totalIngresos;
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
  function injectStyle(){
    if($('ceHf45Style')) return;
    const style = document.createElement('style');
    style.id = 'ceHf45Style';
    style.textContent = `
      #ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,#ceHf16AvanceBtn,#ceHf17AvanceBtn,#ceHf18AvanceBtn,#ceHf19AvanceBtn,#ceHf40AvanceBtn,#ceHf41AvanceBtn,#ceHf42AvanceBtn,#ceHf43AvanceBtn,#ceHf44AvanceBtn,.ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,.ce-hf17-mapa-actions,.ce-hf18-mapa-actions,.ce-hf19-mapa-actions,.ce-hf40-mapa-actions,.ce-hf41-mapa-actions,.ce-hf42-mapa-actions,.ce-hf43-mapa-actions,.ce-hf44-mapa-actions,#ceHf13MapaAvancePanel,#ceHf14MapaAvancePanel,#ceHf15MapaAvancePanel,#ceHf16MapaAvancePanel,#ceHf17MapaAvancePanel,#ceHf18MapaAvancePanel,#ceHf19MapaAvancePanel,#ceHf40MapaAvancePanel,#ceHf41MapaAvancePanel,#ceHf42MapaAvancePanel,#ceHf43MapaAvancePanel,#ceHf44MapaAvancePanel{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      .ce-hf45-mapa-actions{position:absolute!important;left:50%!important;top:22px!important;transform:translateX(-50%)!important;z-index:20!important;display:flex!important;justify-content:center!important;}
      #ceHf45AvanceBtn{appearance:none!important;border:1px solid #cbd5e1!important;background:#fff!important;border-radius:14px!important;box-shadow:0 10px 22px rgba(15,23,42,.20)!important;width:46px!important;height:46px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:26px!important;cursor:pointer!important;}
      #ceHf45AvanceBtn[aria-expanded="true"]{outline:4px solid rgba(37,99,235,.18)!important;}
      #ceHf45MapaAvancePanel{width:min(760px,92vw)!important;margin:14px auto 18px!important;background:#f8fafc!important;border:3px solid #0f172a!important;border-radius:20px!important;padding:10px 12px!important;box-shadow:0 18px 38px rgba(15,23,42,.18)!important;}
      #ceHf45MapaAvancePanel.hidden{display:none!important;}
      #ceHf45MapaAvancePanel .ce-hf45-title{display:flex!important;justify-content:space-between!important;gap:8px!important;margin-bottom:8px!important;font-weight:950!important;letter-spacing:.08em!important;}
      #ceHf45MapaAvancePanel .ce-hf45-row{display:grid!important;grid-template-columns:1fr 62px minmax(160px,1fr)!important;gap:8px!important;align-items:center!important;border:1px solid #dbe4ee!important;background:#fff!important;border-radius:12px!important;padding:7px!important;margin:5px 0!important;}
      #ceHf45MapaAvancePanel .ce-hf45-row b{font-weight:950!important;}#ceHf45MapaAvancePanel small{display:block!important;font-weight:750!important;color:#334155!important;margin-top:2px!important;}#ceHf45MapaAvancePanel .bar{height:10px!important;border-radius:99px!important;background:#e5e7eb!important;overflow:hidden!important;}#ceHf45MapaAvancePanel .bar i{display:block!important;height:100%!important;background:#2563eb!important;border-radius:99px!important;}
    `;
    document.head.appendChild(style);
  }
  function ensureAvanceButton(){
    injectStyle();
    const card = $('tabMapaProductos')?.querySelector('.mapa-productos-card,.card,.panel') || $('tabMapaProductos');
    if(!card) return;
    try{ card.style.position = card.style.position || 'relative'; }catch(_){ }
    let actions = $('ceHf45MapaActions');
    if(!actions){
      actions = document.createElement('div');
      actions.id = 'ceHf45MapaActions';
      actions.className = 'ce-hf45-mapa-actions';
      const title = card.querySelector('.section-title') || card.firstElementChild || card;
      title?.insertAdjacentElement('afterend', actions);
    }
    let btn = $('ceHf45AvanceBtn');
    if(!btn){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'ceHf45AvanceBtn';
      btn.title = 'Avance del evento';
      btn.setAttribute('aria-expanded','false');
      btn.textContent = '⏱️';
      actions.appendChild(btn);
      btn.addEventListener('click', function(ev){
        try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
        toggleAvancePanel();
        return false;
      }, true);
    }
  }
  function toggleAvancePanel(){
    const card = $('tabMapaProductos')?.querySelector('.mapa-productos-card,.card,.panel') || $('tabMapaProductos');
    if(!card) return;
    let panel = $('ceHf45MapaAvancePanel');
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'ceHf45MapaAvancePanel';
      const actions = $('ceHf45MapaActions');
      (actions || card).insertAdjacentElement('afterend', panel);
    }
    const btn = $('ceHf45AvanceBtn');
    const willOpen = panel.classList.contains('hidden') || !panel.textContent.trim();
    if(willOpen){
      const rows = computeAvance();
      panel.innerHTML = `<div class="ce-hf45-title"><span>AVANCE</span><span>DEL EVENTO</span></div>` + rows.map(r => `<div class="ce-hf45-row"><div><b>${r.n} · ${esc(r.t)}</b><small>${esc(r.d)}</small></div><strong>${Number(r.p||0).toLocaleString('es-ES',{maximumFractionDigits:2})}%</strong><span class="bar"><i style="width:${Math.max(0,Math.min(100,Number(r.p||0)))}%"></i></span></div>`).join('');
      panel.classList.remove('hidden');
      btn?.setAttribute('aria-expanded','true');
    }else{
      panel.classList.add('hidden');
      btn?.setAttribute('aria-expanded','false');
    }
  }

  function sortProductTables(root){
    root.querySelectorAll('table').forEach(table => {
      const headCells = Array.from(table.querySelectorAll('thead th, tbody tr:first-child td, tr:first-child th'));
      const idx = headCells.findIndex(cell => /producto/i.test(cell.textContent || ''));
      const tbody = table.tBodies && table.tBodies[0];
      if(!tbody || idx < 0) return;
      let rows = Array.from(tbody.rows);
      if(!rows.length) return;
      const firstIsHeader = /producto/i.test((rows[0].cells[idx] || {}).textContent || '');
      const fixed = firstIsHeader ? rows.shift() : null;
      rows.sort((a,b) => String((a.cells[idx] || {}).textContent || '').localeCompare(String((b.cells[idx] || {}).textContent || ''), 'es', {sensitivity:'base'}));
      if(fixed) tbody.appendChild(fixed);
      rows.forEach(row => tbody.appendChild(row));
    });
  }
  function patchPhotoModalTitles(){
    const titulo = eventTitle();
    if(!titulo) return;
    const cls = isFinalizado() ? 'is-finalizado' : 'is-curso';
    const color = isFinalizado() ? '#991b1b' : '#15803d';
    document.querySelectorAll('#ceV401PcPhotoModal,#ceV40TicketPhotoModal,#ceV104TicketDetail,#ceV103TicketDetail,#ceV102TicketDetail,#ceV101TicketDetail,#ceV100TicketDetail,#ceV96TicketDetail,#ceV310PhotoViewer,#ceTicketModalV234,#ceTicketImageModalV225,.ce-v40-modal,.ce-v401-pc-modal').forEach(modal => {
      const text = modal.textContent || '';
      const isTicket = /Foto de ticket|Total ticket|Ticket\/Otros|TK\d/i.test(text);
      const isReceipt = /Justificante de ingreso/i.test(text);
      if(isTicket){
        const head = modal.querySelector('.ce-v401-pc-modal-head,.ce-v40-modal-head,.head,.modal-head,h2,h3') || modal.firstElementChild;
        if(head && /Foto de ticket/i.test(head.textContent || '')){
          const btns = Array.from(head.querySelectorAll('button'));
          head.innerHTML = `<span class="ce-hf45-event-modal-title ${cls}" style="color:${color};font-weight:950;font-size:21px;display:block;text-align:center;width:100%">${esc(titulo)}</span>`;
          btns.forEach(b => head.appendChild(b));
          try{ head.style.justifyContent = 'center'; head.style.textAlign = 'center'; }catch(_){ }
        }
        Array.from(modal.querySelectorAll('div,span,strong,b,h1,h2,h3')).forEach(el => {
          const tx = String(el.textContent || '').trim();
          const isCalcTitle = /^CALCULOS\s+POR\s+AGRUPACION/i.test(tx) && tx.length < 120;
          const isLeafTitle = !el.querySelector('table,img,.ce-v401-pc-modal-img,.ce-v40-modal-info');
          if(isCalcTitle && isLeafTitle) el.remove();
        });
        sortProductTables(modal);
      }
      if(isReceipt){
        const head = modal.querySelector('.ce-v401-pc-modal-head,.ce-v40-modal-head,.head,.modal-head,h2,h3') || modal.firstElementChild;
        if(head && !head.querySelector('.ce-hf45-event-modal-title,.ce-v401-event-title,.ce-v40-event-title,.event-title')){
          const title = document.createElement('span');
          title.className = `ce-hf45-event-modal-title ${cls}`;
          title.textContent = titulo;
          title.style.cssText = `color:${color};font-weight:950;font-size:20px;display:block;text-align:center;flex:1`;
          head.appendChild(title);
        }
      }
    });
  }

  function install(){ ensureAvanceButton(); patchPhotoModalTitles(); }
  document.addEventListener('DOMContentLoaded', install);
  document.addEventListener('click', function(){ setTimeout(function(){ ensureAvanceButton(); patchPhotoModalTitles(); }, 80); }, true);
  ['change','input'].forEach(type => document.addEventListener(type, () => setTimeout(function(){ ensureAvanceButton(); patchPhotoModalTitles(); }, 80), true));
  // FIX24: eliminado barrido continuo; se mantiene por eventos/cambios reales.
  // setInterval(function(){ ensureAvanceButton(); patchPhotoModalTitles(); }, 1200);
  try{ new MutationObserver(() => setTimeout(patchPhotoModalTitles, 30)).observe(document.body || document.documentElement, {childList:true, subtree:true}); }catch(_){ }
})();
