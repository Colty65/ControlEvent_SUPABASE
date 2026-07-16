(function(){
  'use strict';
  if(window.__ceV15Hotfix19AjusteFinal) return;
  window.__ceV15Hotfix19AjusteFinal = true;

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const st = () => safe(() => window.ControlEventApp?.state || window.state || Function('return (typeof state!=="undefined")?state:{}')(), {}) || {};
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const evId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  function selectedEvent(){
    const id = evId();
    const ev = arr('eventos').find(e => String(e?.id || '') === id) || {};
    const opt = $('selectedEvent')?.selectedOptions?.[0];
    const titulo = norm(ev.titulo || ev.nombre || ev.title || opt?.textContent || 'Evento');
    const situacion = norm(ev.situacion || ev.estado || ev.status || document.querySelector('.status-badge,.event-status,.badge-status')?.textContent || '');
    const finalizado = up(situacion).includes('FINALIZ');
    return {id, titulo, situacion, finalizado, cls: finalizado ? 'ce-hf44-finalizado' : 'ce-hf44-encurso'};
  }
  function byId(key,id){ return arr(key).find(x => String(x?.id || '') === String(id || '')) || {}; }
  function money(v){ try{ if(typeof window.money === 'function') return window.money(Number(v||0)); }catch(_){} return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
  function num(v){ return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v||0)); }
  function imageValue(v){ if(!v) return ''; if(typeof v === 'string') return v; if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || ''; return ''; }
  function imageExists(keys){
    const s = st();
    const stores = [s.ticketImages || {}, s.ticketImageRefs || {}, s.images || {}, s.eventDocumentImages || {}];
    const wanted = (keys || []).map(up).filter(Boolean);
    if(!wanted.length) return false;
    for(const k of keys){ for(const store of stores){ if(imageValue(store?.[k])) return true; } }
    for(const store of stores){
      for(const k of Object.keys(store || {})){
        if(!imageValue(store[k])) continue;
        const uk = up(k);
        if(wanted.some(w => uk === w || uk.includes(w) || w.includes(uk) || (w.includes('|') && uk.includes(w.split('|').pop())))) return true;
      }
    }
    return false;
  }
  function ticketImageExists(eventId, ticket){
    const t = norm(ticket); if(!t) return false;
    const id = String(eventId || '');
    return imageExists([`${id}|${t}`, `${id}|TICKET:${t}`, `${id}|TICKET|${t}`, `${id}|TK:${t}`, t]);
  }
  function isDonationTicket(v){ return /^DONADO/i.test(norm(v)); }
  function isAssignedPurchase(v){ const t = up(v); return /^TK\d+/.test(t) || t.includes('GASTOS CORRIENTES'); }
  function ingresoTotal(r){
    const ev = arr('eventos').find(e => String(e.id || '') === evId()) || {};
    const per = byId('personas', r?.personaId || r?.persona_id);
    const socio = up(per.rango || r?.rango) === 'SOCIO';
    const numero = Number(r?.numero || 0);
    const oblig = socio ? numero * Number(ev?.precio || 0) : 0;
    const vol = Number(r?.importeVoluntario ?? r?.voluntario ?? r?.importe ?? 0);
    return Number(r?.total ?? (oblig + vol));
  }
  function computeAvance(){
    const id = evId();
    const ingresos = arr('colaboradores').filter(r => String(r?.eventId || r?.event_id || '') === id);
    const compras = arr('compras').filter(r => String(r?.eventId || r?.event_id || '') === id);
    const docs = arr('eventDocuments').filter(r => String(r?.eventId || r?.event_id || '') === id);
    const totalIng = ingresos.reduce((a,r)=>a + ingresoTotal(r), 0);
    const doneIngRows = ingresos.filter(r => up(r?.situacion || r?.ingreso || 'Pendiente') !== 'PENDIENTE');
    const doneIng = doneIngRows.reduce((a,r)=>a + ingresoTotal(r), 0);
    const ingPhotos = doneIngRows.filter(r => imageExists([`${id}|INGRESO:${r.id}`, `${id}|INGRESO|${r.id}`, `INGRESO:${id}|${r.id}`, `INGRESO:${r.id}`, `${id}|ING:${r.id}`])).length;
    const don = compras.filter(r => isDonationTicket(r?.ticketDonacion || r?.ticket_donacion));
    const buy = compras.filter(r => !isDonationTicket(r?.ticketDonacion || r?.ticket_donacion));
    const assigned = buy.filter(r => isAssignedPurchase(r?.ticketDonacion || r?.ticket_donacion));
    const tickets = [...new Set(compras.map(r => norm(r?.ticketDonacion || r?.ticket_donacion)).filter(t => /^TK\d+/i.test(t)))];
    const ticketPhotos = tickets.filter(t => ticketImageExists(id, t)).length;
    return {totalIng, doneIng, doneIngRows, ingPhotos, don, buy, assigned, docs, tickets, ticketPhotos};
  }
  function avRow(n,label,pct,color,detail,warn){
    const p = Math.max(0, Math.min(100, Number(pct || 0)));
    return `<div class="ce-hf44-av-row"><div class="ce-hf44-av-head"><span><b>${n}</b>${esc(label)}</span><strong>${esc(num(p))}%</strong></div><div class="ce-hf44-av-track"><i style="width:${p}%;background:${esc(color)}"></i></div><small>${esc(detail || '')}</small>${warn ? `<em>${esc(warn)}</em>` : ''}</div>`;
  }
  function avanceHtml(){
    const p = computeAvance();
    return `<div class="ce-hf44-av-box">
      <div class="ce-hf44-av-title"><span>AVANCE</span><strong>DEL EVENTO</strong></div>
      ${avRow(1,'INGRESOS',p.totalIng>0 ? p.doneIng*100/p.totalIng : 0,'#2563eb',`${money(p.doneIng)} de ${money(p.totalIng)} ingresados`)}
      ${avRow(2,'FOTOS INGRESOS',p.doneIngRows.length ? p.ingPhotos*100/p.doneIngRows.length : 0,'#16a34a',`${num(p.ingPhotos)} de ${num(p.doneIngRows.length)} ingresos realizados con justificante`)}
      ${avRow(3,'DONACIONES',p.don.length ? 100 : 0,'#f59e0b',p.don.length ? `Donaciones registradas: ${num(p.don.length)}` : 'Aún no hay donaciones registradas')}
      ${avRow(4,'COMPRAS',p.buy.length ? p.assigned.length*100/p.buy.length : 0,'#ef4444',`${num(p.assigned.length)} de ${num(p.buy.length)} líneas asignadas a TKxx o gastos corrientes`)}
      ${avRow(5,'DOCUMENTOS',p.docs.length ? 100 : 0,p.docs.length ? '#16a34a' : '#f97316',p.docs.length ? `${num(p.docs.length)} documento(s) adjunto(s)` : '0 documentos adjuntos',p.docs.length ? '' : 'Este evento no tiene documentos adjuntos. ¿Es correcto?')}
      ${avRow(6,'FOTOS TICKETS',p.tickets.length ? p.ticketPhotos*100/p.tickets.length : 0,'#8b5cf6',`${num(p.ticketPhotos)} de ${num(p.tickets.length)} tickets contables con foto adjunta`,p.tickets.length ? '' : 'Todavía no hay TKxx registrados')}
    </div>`;
  }
  function mapaTitle(){
    const card = document.querySelector('#tabMapaProductos .mapa-productos-card') || document.querySelector('#tabMapaProductos .card');
    const title = card?.querySelector?.(':scope > .section-title') || card?.querySelector?.('.section-title');
    return {card,title};
  }
  function ensureAvanceButton(){
    const {title} = mapaTitle();
    if(!title) return;
    if($('ceHf44AvanceBtn')) return;
    const actions = document.createElement('div');
    actions.className = 'ce-hf44-mapa-actions';
    actions.innerHTML = '<button type="button" id="ceHf44AvanceBtn" class="ce-hf44-av-btn" title="Avance del evento" aria-label="Avance del evento"><img src="./hitos-evento.jpg" alt=""></button>';
    title.appendChild(actions);
  }
  function toggleAvance(ev){
    try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ }
    document.querySelectorAll('#ceHf43MapaAvancePanel,#ceHf16MapaAvancePanel,#ceHf15MapaAvancePanel,#ceHf14MapaAvancePanel,#ceHf13MapaAvancePanel').forEach(el => safe(()=>el.remove(), null));
    const old = $('ceHf44MapaAvancePanel');
    if(old){ old.remove(); return false; }
    const {title} = mapaTitle();
    if(!title) return false;
    const panel = document.createElement('div');
    panel.id = 'ceHf44MapaAvancePanel';
    panel.innerHTML = avanceHtml();
    title.insertAdjacentElement('afterend', panel);
    try{ panel.scrollIntoView({block:'nearest', behavior:'smooth'}); }catch(_){ }
    return false;
  }
  function refreshAvance(){ const p = $('ceHf44MapaAvancePanel'); if(p){ const html = avanceHtml(); if(p.innerHTML !== html) p.innerHTML = html; } }

  function removeCalculosBlocks(root){
    if(!root) return;
    const bad = /CALCULOS\s+POR\s+AGRUPACION|CÁLCULOS\s+POR\s+AGRUPACION|CALCULOS\s+POR\s+TIENDA|CÁLCULOS\s+POR\s+TIENDA/i;
    root.querySelectorAll('.ce-v401-pc-info-title,.ce-v40-title,h3,strong,span,div').forEach(el => {
      const txt = norm(el.textContent || '');
      if(txt && bad.test(txt) && txt.length < 120){ safe(() => el.remove(), null); }
    });
  }
  function sortTablesByProduct(root){
    if(!root) return;
    root.querySelectorAll('table').forEach(table => {
      const rows = Array.from(table.querySelectorAll('tr'));
      if(rows.length < 3) return;
      let headerIndex = -1, productCol = -1;
      rows.forEach((tr, i) => {
        if(headerIndex >= 0) return;
        const cells = Array.from(tr.children).map(td => up(td.textContent));
        const idx = cells.findIndex(t => t === 'PRODUCTO' || t.includes('PRODUCTO'));
        if(idx >= 0){ headerIndex = i; productCol = idx; }
      });
      if(headerIndex < 0 || productCol < 0) return;
      const tbody = table.tBodies[0] || table;
      const detail = rows.slice(headerIndex + 1).filter(tr => tr.children.length > productCol);
      detail.sort((a,b) => norm(a.children[productCol]?.textContent).localeCompare(norm(b.children[productCol]?.textContent),'es',{sensitivity:'base'}));
      detail.forEach(tr => tbody.appendChild(tr));
    });
  }
  function patchTipText(text){
    const lines = String(text || '').split('\n').map(x => x.trim());
    if(!lines.some(l => /CALCULOS|CÁLCULOS|Ticket\/Otros|Producto/i.test(l))) return text;
    const cleaned = lines.filter(l => !/CALCULOS\s+POR\s+AGRUPACION|CÁLCULOS\s+POR\s+AGRUPACION|CALCULOS\s+POR\s+TIENDA|CÁLCULOS\s+POR\s+TIENDA/i.test(l));
    const headerIdx = cleaned.findIndex(l => /Producto/i.test(l) && /\|/.test(l));
    if(headerIdx >= 0){
      const heads = cleaned[headerIdx].split('|').map(x => x.trim());
      const pc = heads.findIndex(h => /Producto/i.test(h));
      const before = cleaned.slice(0, headerIdx + 1);
      const rows = cleaned.slice(headerIdx + 1).filter(Boolean);
      rows.sort((a,b) => norm((a.split('|')[pc] || a)).localeCompare(norm((b.split('|')[pc] || b)),'es',{sensitivity:'base'}));
      return before.concat(rows).join('\n');
    }
    return cleaned.join('\n');
  }
  function patchTipAttributes(){
    document.querySelectorAll('[data-ce-tip-v21],[data-ce-tip],[data-tip],img.ticket-thumb').forEach(el => {
      ['data-ce-tip-v21','data-ce-tip','data-tip'].forEach(attr => {
        const val = el.getAttribute?.(attr);
        if(!val) return;
        const fixed = patchTipText(val);
        if(fixed !== val) el.setAttribute(attr, fixed);
      });
    });
  }
  function headerSpan(head){
    if(!head) return null;
    let span = head.querySelector(':scope > span:not(.ce-hf44-event-title)') || head.querySelector('span:not(.ce-hf44-event-title)');
    if(!span){ span = document.createElement('span'); head.insertBefore(span, head.firstChild); }
    return span;
  }
  function setTicketHeader(modal){
    const ev = selectedEvent();
    const head = modal.querySelector('.ce-v401-pc-modal-head,.ce-v40-modal-head,.ce-v465-modal-head,.ce-v468-modal-head,.ce-v509-modal-head,.ce-v5017-budget-modal-head,.ce-v464-receipt-head,.ce-receipt-modal-head-v463');
    if(!head) return;
    head.classList.add('ce-hf44-modal-head','ce-hf44-ticket-head');
    const span = headerSpan(head);
    if(span){ if(span.textContent !== ev.titulo) span.textContent = ev.titulo; span.className = `ce-hf44-event-title ${ev.cls}`; }
    modal.setAttribute('data-ce-hf44-modal','ticket');
  }
  function setReceiptHeader(modal){
    const ev = selectedEvent();
    const head = modal.querySelector('.ce-v401-pc-modal-head,.ce-v40-modal-head,.ce-v465-modal-head,.ce-v468-modal-head,.ce-v509-modal-head,.ce-v5017-budget-modal-head,.ce-v464-receipt-head,.ce-receipt-modal-head-v463');
    if(!head) return;
    head.classList.add('ce-hf44-modal-head','ce-hf44-receipt-head');
    const label = headerSpan(head);
    if(label){ if(label.textContent !== 'Justificante de ingreso') label.textContent = 'Justificante de ingreso'; label.className = 'ce-hf44-receipt-label'; }
    let title = head.querySelector(':scope > .ce-hf44-event-title');
    if(!title){ title = document.createElement('span'); head.insertBefore(title, label?.nextSibling || head.firstChild); }
    if(title.textContent !== ev.titulo) title.textContent = ev.titulo;
    title.className = `ce-hf44-event-title ${ev.cls}`;
    modal.setAttribute('data-ce-hf44-modal','receipt');
  }
  function patchModals(){
    const ticketModals = Array.from(document.querySelectorAll('#ceV401PcPhotoModal[data-ce-v401-kind="ticket"],#ceV40TicketPhotoModal'))
      .concat(Array.from(document.querySelectorAll('.ce-v40-modal,.ce-v401-pc-modal')).filter(m => /Foto de ticket/i.test(m.textContent || '')));
    ticketModals.forEach(modal => { setTicketHeader(modal); const info = modal.querySelector('.ce-v401-pc-modal-info,.ce-v40-modal-info'); removeCalculosBlocks(info); sortTablesByProduct(info); });

    const receiptModals = Array.from(document.querySelectorAll('#ceV401PcPhotoModal[data-ce-v401-kind="receipt"],.ce-v5017-budget-modal,.ce-v465-modal,.ce-v468-modal,.ce-v509-modal,.ce-v504-modal,.ce-v464-receipt-card,.ce-receipt-modal-v463'))
      .concat(Array.from(document.querySelectorAll('#ceV401PcPhotoModal,#ceV40TicketPhotoModal')).filter(m => /Justificante de ingreso/i.test(m.textContent || '') && !/Foto de ticket/i.test(m.textContent || '')));
    receiptModals.forEach(modal => setReceiptHeader(modal));
  }

  const manualNeedByKey = new Map();
  function donationTotal(tr){
    return Array.from(tr.querySelectorAll('[data-plan-resource-field="donationUnits"]')).reduce((sum,input)=>sum + Math.max(0, Number(String(input.value || '0').replace(',','.')) || 0), 0);
  }
  function rememberNeed(input){
    const tr = input?.closest?.('.plan-resource-edit-row');
    const key = tr?.dataset?.planResourceKey || '';
    if(!key) return;
    const val = Math.max(0, Number(String(input.value || '0').replace(',','.')) || 0);
    manualNeedByKey.set(key, val);
  }
  function enforceManualNeeds(){
    document.querySelectorAll('#planResourceEditor .plan-resource-edit-row').forEach(tr => {
      const key = tr.dataset?.planResourceKey || '';
      if(!key || !manualNeedByKey.has(key)) return;
      const needInput = tr.querySelector('[data-plan-resource-field="necesidad"]');
      if(!needInput) return;
      const donated = donationTotal(tr);
      const chosen = Math.max(donated, Number(manualNeedByKey.get(key) || 0));
      if(Math.abs((Number(needInput.value || 0) || 0) - chosen) > 0.0001) needInput.value = String(chosen);
      if(donated > 0 && chosen <= donated + 0.0001){
        tr.querySelectorAll('.plan-resource-purchase-subrow').forEach(row => {
          row.querySelectorAll('[data-plan-resource-field="compra"]').forEach(inp => { inp.value = '0'; });
          safe(() => row.remove(), null);
        });
      }
    });
  }

  function injectStyle(){
    if($('ceHf44Style')) return;
    const css = `
      #ceHf43AvanceBtn,.ce-hf43-mapa-actions,#ceHf43MapaAvancePanel{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;}
      .mapa-productos-card>.section-title{display:flex!important;align-items:flex-start!important;gap:12px!important;}
      .ce-hf44-mapa-actions{margin-left:auto!important;margin-right:28%!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;padding-top:2px!important;z-index:15!important;position:relative!important;}
      @media(max-width:900px){.ce-hf44-mapa-actions{margin-right:0!important;}}
      .ce-hf44-av-btn{width:42px!important;height:42px!important;border:1px solid #cbd5e1!important;background:#fff!important;border-radius:12px!important;padding:3px!important;cursor:pointer!important;box-shadow:0 7px 18px rgba(15,23,42,.16)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;pointer-events:auto!important;touch-action:manipulation!important;}
      .ce-hf44-av-btn:hover{border-color:#217346!important;box-shadow:0 0 0 3px rgba(33,115,70,.13)!important}.ce-hf44-av-btn img{width:34px!important;height:34px!important;object-fit:cover!important;border-radius:9px!important;display:block!important;pointer-events:none!important;}
      #ceHf44MapaAvancePanel{margin:10px 0 12px!important;display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:12!important;}
      .ce-hf44-av-box{padding:10px!important;border:3px solid #0f172a!important;border-radius:18px!important;background:linear-gradient(180deg,#fff,#f8fafc)!important;box-shadow:0 8px 22px rgba(15,23,42,.12)!important;font-size:11px!important;line-height:1.12!important;max-width:650px!important;margin:0 auto!important;}
      .ce-hf44-av-title{display:flex!important;justify-content:space-between!important;align-items:center!important;margin-bottom:5px!important;padding-bottom:5px!important;border-bottom:2px solid #e2e8f0!important}.ce-hf44-av-title span{font-size:12px!important;font-weight:950!important;letter-spacing:.08em!important}.ce-hf44-av-title strong{font-size:10px!important;text-transform:uppercase!important;color:#475569!important;}
      .ce-hf44-av-row{display:grid!important;grid-template-columns:minmax(150px,1.25fr) 52px minmax(120px,1fr)!important;gap:5px!important;align-items:center!important;margin:4px 0!important;padding:5px 6px!important;border:1px solid #dbe4ee!important;border-radius:12px!important;background:#fff!important}.ce-hf44-av-head{display:contents!important}.ce-hf44-av-head span{font-size:9.5px!important;font-weight:900!important;text-transform:uppercase!important}.ce-hf44-av-head b{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:16px!important;height:16px!important;margin-right:4px!important;border-radius:999px!important;background:#0f172a!important;color:#fff!important;font-size:9px!important}.ce-hf44-av-head strong{font-size:12px!important;text-align:right!important}.ce-hf44-av-track{height:8px!important;background:#e5e7eb!important;border-radius:999px!important;overflow:hidden!important}.ce-hf44-av-track i{display:block!important;height:100%!important;border-radius:999px!important}.ce-hf44-av-row small{grid-column:1/4!important;font-size:9.5px!important;font-weight:750!important;color:#334155!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.ce-hf44-av-row em{grid-column:1/4!important;font-size:9.5px!important;padding:3px 5px!important;border:1px solid #fdba74!important;border-radius:9px!important;background:#fff7ed!important;color:#9a3412!important;font-style:normal!important;font-weight:850!important;}
      .ce-hf44-modal-head{position:relative!important;display:flex!important;align-items:center!important;min-height:34px!important;padding-right:120px!important;}
      .ce-hf44-ticket-head{justify-content:center!important;padding-right:0!important;}
      .ce-hf44-receipt-head{justify-content:flex-start!important;}
      .ce-hf44-event-title{font-weight:950!important;font-size:18px!important;letter-spacing:-.02em!important;text-align:center!important;line-height:1.15!important;}
      .ce-hf44-ticket-head>.ce-hf44-event-title{display:block!important;width:100%!important;}
      .ce-hf44-receipt-head>.ce-hf44-event-title{position:absolute!important;left:50%!important;transform:translateX(-50%)!important;max-width:62%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
      .ce-hf44-receipt-label{font-weight:950!important;font-size:18px!important;color:#0f172a!important;}
      .ce-hf44-finalizado{color:#b91c1c!important}.ce-hf44-encurso{color:#15803d!important}
      [data-ce-hf44-modal="ticket"] .ce-v401-pc-modal-info .ce-v401-pc-info-title:first-child:empty,[data-ce-hf44-modal="ticket"] .ce-v40-modal-info .ce-v40-title:first-child:empty{display:none!important;}
    `;
    const style = document.createElement('style');
    style.id = 'ceHf44Style';
    style.textContent = css;
    document.head.appendChild(style);
  }
  function apply(){ injectStyle(); ensureAvanceButton(); patchTipAttributes(); patchModals(); enforceManualNeeds(); refreshAvance(); }
  let timer = 0;
  function schedule(ms){ clearTimeout(timer); timer = setTimeout(apply, ms || 50); }

  document.addEventListener('click', ev => {
    const btn = ev.target?.closest?.('#ceHf44AvanceBtn,.ce-hf44-av-btn');
    if(btn) return toggleAvance(ev);
  }, true);
  ['pointerup','touchend'].forEach(type => document.addEventListener(type, ev => {
    const btn = ev.target?.closest?.('#ceHf44AvanceBtn,.ce-hf44-av-btn');
    if(btn) return toggleAvance(ev);
  }, {capture:true, passive:false}));

  document.addEventListener('input', ev => { if(ev.target?.matches?.('[data-plan-resource-field="necesidad"]')) rememberNeed(ev.target); }, true);
  document.addEventListener('change', ev => { if(ev.target?.matches?.('[data-plan-resource-field="necesidad"]')){ rememberNeed(ev.target); setTimeout(enforceManualNeeds, 40); setTimeout(enforceManualNeeds, 180); } }, true);
  document.addEventListener('blur', ev => { if(ev.target?.matches?.('[data-plan-resource-field="necesidad"]')){ rememberNeed(ev.target); setTimeout(enforceManualNeeds, 40); setTimeout(enforceManualNeeds, 180); setTimeout(enforceManualNeeds, 500); } }, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Enter' && ev.target?.matches?.('[data-plan-resource-field="necesidad"]')){ rememberNeed(ev.target); setTimeout(enforceManualNeeds, 40); setTimeout(enforceManualNeeds, 180); } }, true);
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnPlanApplyReplica')) enforceManualNeeds(); }, true);

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-changed','controlevent:images-updated','controlevent:state-saved'].forEach(name => window.addEventListener(name, () => schedule(name === 'controlevent:event-changed' ? 120 : 50), true));
  try{
    const relevant = '#tabMapaProductos,.mapa-productos-card,.section-title,#ceV401PcPhotoModal,#ceV40TicketPhotoModal,.ce-v5017-budget-modal,.ce-v465-modal,.ce-v468-modal,.ce-v509-modal,#summaryTiendaTicket,#planResourceEditor,.plan-resource-edit-row';
    new MutationObserver(muts => {
      for(const m of muts){
        for(const n of Array.from(m.addedNodes || [])){
          if(n?.nodeType !== 1) continue;
          if(n.matches?.(relevant) || n.querySelector?.(relevant)){ schedule(40); return; }
        }
      }
    }).observe(document.documentElement,{childList:true,subtree:true});
  }catch(_){ }
  [0,100,350,800,1500,3000,5000].forEach(ms => setTimeout(apply, ms));
  window.__ceHf44FinalPatch = 'HOTFIX44_AVANCE_TITULOS_TICKET_INGRESO_NECESIDAD';
})();
