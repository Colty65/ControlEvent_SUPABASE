(function(){
  'use strict';
  if(window.__ceV15Hotfix18AvanceDocsEventoNeedFont) return;
  window.__ceV15Hotfix18AvanceDocsEventoNeedFont = true;

  const $ = id => document.getElementById(id);
  const safe = (fn, fallback) => { try{ const v = fn(); return v === undefined ? fallback : v; }catch(_){ return fallback; } };
  const st = () => safe(() => window.ControlEventApp?.state || window.state || Function('return (typeof state!=="undefined")?state:{}')(), {}) || {};
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const evId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const rows = key => Array.isArray(st()[key]) ? st()[key] : [];
  function byId(key,id){ return rows(key).find(x => String(x?.id || '') === String(id || '')) || {}; }
  function money(v){ try{ if(typeof window.money === 'function') return window.money(Number(v||0)); }catch(_){} return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }
  function num(v){ return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v||0)); }
  function imageValue(v){ if(!v) return ''; if(typeof v === 'string') return v; if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || ''; return ''; }
  function imageExists(keys){
    const s = st();
    const stores = [s.ticketImages || {}, s.ticketImageRefs || {}, s.images || {}];
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
    const t = norm(ticket);
    if(!t) return false;
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
    return `<div class="ce-hf43-av-row"><div class="ce-hf43-av-head"><span><b>${n}</b>${esc(label)}</span><strong>${esc(num(p))}%</strong></div><div class="ce-hf43-av-track"><i style="width:${p}%;background:${esc(color)}"></i></div><small>${esc(detail || '')}</small>${warn ? `<em>${esc(warn)}</em>` : ''}</div>`;
  }
  function avanceHtml(){
    const p = computeAvance();
    return `<div class="ce-hf43-av-box">
      <div class="ce-hf43-av-title"><span>AVANCE</span><strong>DEL EVENTO</strong></div>
      ${avRow(1,'INGRESOS',p.totalIng>0 ? p.doneIng*100/p.totalIng : 0,'#2563eb',`${money(p.doneIng)} de ${money(p.totalIng)} ingresados`)}
      ${avRow(2,'FOTOS INGRESOS',p.doneIngRows.length ? p.ingPhotos*100/p.doneIngRows.length : 0,'#16a34a',`${num(p.ingPhotos)} de ${num(p.doneIngRows.length)} ingresos realizados con justificante`)}
      ${avRow(3,'DONACIONES',p.don.length ? 100 : 0,'#f59e0b',p.don.length ? `Donaciones registradas: ${num(p.don.length)}` : 'Aún no hay donaciones registradas')}
      ${avRow(4,'COMPRAS',p.buy.length ? p.assigned.length*100/p.buy.length : 0,'#ef4444',`${num(p.assigned.length)} de ${num(p.buy.length)} líneas asignadas a TKxx o gastos corrientes`)}
      ${avRow(5,'DOCUMENTOS',p.docs.length ? 100 : 0,p.docs.length ? '#16a34a' : '#f97316',p.docs.length ? `${num(p.docs.length)} documento(s) adjunto(s)` : '0 documentos adjuntos',p.docs.length ? '' : 'Este evento no tiene documentos adjuntos. ¿Es correcto?')}
      ${avRow(6,'FOTOS TICKETS',p.tickets.length ? p.ticketPhotos*100/p.tickets.length : 0,'#8b5cf6',`${num(p.ticketPhotos)} de ${num(p.tickets.length)} tickets contables con foto adjunta`,p.tickets.length ? '' : 'Todavía no hay TKxx registrados')}
    </div>`;
  }
  function mapaTitle(){
    const tab = $('tabMapaProductos');
    const card = tab?.querySelector?.('.mapa-productos-card');
    const title = card?.querySelector?.(':scope > .section-title') || card?.querySelector?.('.section-title');
    return {tab, card, title};
  }
  function removeOldAvance(){
    document.querySelectorAll('#ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,#ceHf16AvanceBtn,#ceHf13MapaAvancePanel,#ceHf14MapaAvancePanel,#ceHf15MapaAvancePanel,#ceHf16MapaAvancePanel,.ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions').forEach(el => { try{ el.remove(); }catch(_){} });
  }
  function ensureAvanceButton(){
    const {title} = mapaTitle();
    if(!title) return;
    removeOldAvance();
    if($('ceHf43AvanceBtn')) return;
    const actions = document.createElement('div');
    actions.className = 'ce-hf43-mapa-actions';
    actions.innerHTML = '<button type="button" id="ceHf43AvanceBtn" class="ce-hf43-av-btn" title="Avance del evento" aria-label="Avance del evento"><img src="./hitos-evento.jpg" alt=""></button>';
    title.appendChild(actions);
  }
  function toggleAvance(ev){
    try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){}
    const old = $('ceHf43MapaAvancePanel');
    if(old){ old.remove(); return false; }
    const {title} = mapaTitle();
    if(!title) return false;
    const panel = document.createElement('div');
    panel.id = 'ceHf43MapaAvancePanel';
    panel.innerHTML = avanceHtml();
    title.insertAdjacentElement('afterend', panel);
    try{ panel.scrollIntoView({block:'nearest', behavior:'smooth'}); }catch(_){}
    return false;
  }
  function refreshAvancePanel(){ const p = $('ceHf43MapaAvancePanel'); if(p) p.innerHTML = avanceHtml(); }

  function syncDocsMetaLocal(){
    const s = st();
    if(!s || typeof s !== 'object') return;
    if(!s.eventDocumentMeta || typeof s.eventDocumentMeta !== 'object') s.eventDocumentMeta = {};
    if(!Array.isArray(s.eventDocuments)) return;
    s.eventDocuments.forEach(doc => {
      const ev = String(doc?.eventId || doc?.event_id || '').trim();
      const code = String(doc?.codigo || doc?.imageKey || '').toUpperCase().match(/DOC\s*(\d+)/);
      const c = code ? 'DOC' + String(Number(code[1])).padStart(2,'0') : String(doc?.codigo || doc?.imageKey || '').toUpperCase();
      if(!ev || !c) return;
      const k = `${ev}|${c}`;
      const meta = s.eventDocumentMeta[k] || {};
      const fecha = doc.fecha || meta.fecha || '';
      const descripcion = doc.descripcion || meta.descripcion || '';
      if(fecha || descripcion) s.eventDocumentMeta[k] = {fecha, descripcion};
    });
  }

  function injectStyle(){
    if($('ceHf43Style')) return;
    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      :root{--ce-app-font:'Inter',ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
      html,body,.app,button,input,select,textarea,.card,.modal,.itemcard,.header,.tabs,.footer{font-family:var(--ce-app-font)!important;}
      body{font-size:15px!important;-webkit-font-smoothing:antialiased!important;text-rendering:optimizeLegibility!important;}
      button,input,select,textarea{font-size:15px!important;letter-spacing:-.01em!important;}
      h1,h2,h3,.section-title h2,.section-title h3{letter-spacing:-.035em!important;font-weight:850!important;}
      .ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,#ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,#ceHf16AvanceBtn,#ceHf13MapaAvancePanel,#ceHf14MapaAvancePanel,#ceHf15MapaAvancePanel,#ceHf16MapaAvancePanel{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;}
      .mapa-productos-card>.section-title{display:flex!important;align-items:flex-start!important;gap:12px!important;}
      .ce-hf43-mapa-actions{margin-left:auto!important;margin-right:24%!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;padding-top:2px!important;}
      @media(max-width:900px){.ce-hf43-mapa-actions{margin-right:0!important;}}
      .ce-hf43-av-btn{width:42px!important;height:42px!important;border:1px solid #cbd5e1!important;background:#fff!important;border-radius:12px!important;padding:3px!important;cursor:pointer!important;box-shadow:0 7px 18px rgba(15,23,42,.16)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;pointer-events:auto!important;touch-action:manipulation!important;}
      .ce-hf43-av-btn:hover{border-color:#217346!important;box-shadow:0 0 0 3px rgba(33,115,70,.13)!important}.ce-hf43-av-btn img{width:34px!important;height:34px!important;object-fit:cover!important;border-radius:9px!important;display:block!important;pointer-events:none!important;}
      #ceHf43MapaAvancePanel{margin:10px 0 12px!important;display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:8!important;}
      .ce-hf43-av-box{padding:10px!important;border:3px solid #0f172a!important;border-radius:18px!important;background:linear-gradient(180deg,#fff,#f8fafc)!important;box-shadow:0 8px 22px rgba(15,23,42,.12)!important;font-size:11px!important;line-height:1.12!important;max-width:650px!important;margin:0 auto!important;}
      .ce-hf43-av-title{display:flex!important;justify-content:space-between!important;align-items:center!important;margin-bottom:5px!important;padding-bottom:5px!important;border-bottom:2px solid #e2e8f0!important}.ce-hf43-av-title span{font-size:12px!important;font-weight:950!important;letter-spacing:.08em!important}.ce-hf43-av-title strong{font-size:10px!important;text-transform:uppercase!important;color:#475569!important;}
      .ce-hf43-av-row{display:grid!important;grid-template-columns:minmax(150px,1.25fr) 52px minmax(120px,1fr)!important;gap:5px!important;align-items:center!important;margin:4px 0!important;padding:5px 6px!important;border:1px solid #dbe4ee!important;border-radius:12px!important;background:#fff!important}.ce-hf43-av-head{display:contents!important}.ce-hf43-av-head span{font-size:9.5px!important;font-weight:900!important;text-transform:uppercase!important}.ce-hf43-av-head b{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:16px!important;height:16px!important;margin-right:4px!important;border-radius:999px!important;background:#0f172a!important;color:#fff!important;font-size:9px!important}.ce-hf43-av-head strong{font-size:12px!important;text-align:right!important}.ce-hf43-av-track{height:8px!important;background:#e5e7eb!important;border-radius:999px!important;overflow:hidden!important}.ce-hf43-av-track i{display:block!important;height:100%!important;border-radius:999px!important}.ce-hf43-av-row small{grid-column:1/4!important;font-size:9.5px!important;font-weight:750!important;color:#334155!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.ce-hf43-av-row em{grid-column:1/4!important;font-size:9.5px!important;padding:3px 5px!important;border:1px solid #fdba74!important;border-radius:9px!important;background:#fff7ed!important;color:#9a3412!important;font-style:normal!important;font-weight:850!important;}
      @media(max-width:900px){.ce-hf43-av-box{max-width:none!important;margin-left:0!important}.ce-hf43-av-row{grid-template-columns:1fr 48px!important}.ce-hf43-av-track{grid-column:1/3!important}.ce-hf43-av-row small,.ce-hf43-av-row em{grid-column:1/3!important;white-space:normal!important;}}
    `;
    const style = document.createElement('style');
    style.id = 'ceHf43Style';
    style.textContent = css;
    document.head.appendChild(style);
  }
  function apply(){ injectStyle(); syncDocsMetaLocal(); ensureAvanceButton(); refreshAvancePanel(); }
  let timer = 0;
  function schedule(ms){ clearTimeout(timer); timer = setTimeout(apply, ms || 60); }
  document.addEventListener('click', ev => {
    const btn = ev.target?.closest?.('#ceHf43AvanceBtn');
    if(btn) return toggleAvance(ev);
  }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-changed','controlevent:images-updated','controlevent:state-saved'].forEach(name => window.addEventListener(name, () => schedule(name === 'controlevent:event-changed' ? 120 : 60), true));
  try{
    new MutationObserver(muts => {
      for(const m of muts){
        for(const n of Array.from(m.addedNodes || [])){
          if(n?.nodeType !== 1) continue;
          if(n.matches?.('.ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,#ceHf16AvanceBtn') || n.querySelector?.('.ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,#ceHf16AvanceBtn')){ schedule(40); return; }
        }
      }
    }).observe(document.documentElement,{childList:true,subtree:true});
  }catch(_){}
  [0,120,400,900,1800,3200,5200].forEach(ms => setTimeout(apply, ms));
  window.__ceHf43FinalPatch = 'HOTFIX43_AVANCE_DOCUMENTOS_ESTADO_NECESIDAD_INTER';
})();
