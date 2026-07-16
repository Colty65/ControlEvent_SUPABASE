/* ControlEvent v22_prod - HOTFIX47: avance en logo, carga scoped estable, documentos/mantenimiento. */
(function(){
  'use strict';
  const INSTALLED = '__ceV15Hotfix22LogoAvanceEventosDocs';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const text = v => String(v ?? '').trim();
  const up = v => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const st = () => safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {});
  const arr = name => Array.isArray(st()[name]) ? st()[name] : [];
  const money = v => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0));
  const selId = () => text(st().selectedEventId || $('selectedEvent')?.value || '');
  const selEvent = () => {
    const id = selId();
    return arr('eventos').find(e => String(e?.id || '') === id) || safe(() => (typeof selectedEvent === 'function' ? selectedEvent() : null), null) || {};
  };
  const eventTitle = () => text(selEvent().titulo || $('selectedEvent')?.selectedOptions?.[0]?.textContent || 'Evento');
  const isFinalizado = () => up(selEvent().situacion || '') === 'FINALIZADO';
  const currentTab = () => {
    const mem = safe(() => window.__ceCurrentMainTab || window.ControlEventApp?.navigation?.currentMainTab || (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(mem) return String(mem);
    const visible = ['ingresos','donaciones','compras','mapa','documentos','planificacion','resumen','graficas'].find(tab => {
      const map = {ingresos:'tabIngresos',donaciones:'tabDonaciones',compras:'tabCompras',mapa:'tabMapaProductos',documentos:'tabDocumentos',planificacion:'tabPlanificacionInicial',resumen:'tabResumen',graficas:'tabGraficas'};
      const el = $(map[tab]); return el && !el.classList.contains('hidden');
    });
    return visible || 'graficas';
  };
  function setCurrentTab(tab){
    try{ currentMainTab = tab; }catch(_){ }
    try{ window.__ceCurrentMainTab = tab; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = tab; }catch(_){ }
  }
  function call(name, ...args){
    try{ const fn = window[name] || safe(() => (typeof globalThis !== 'undefined' ? globalThis[name] : null), null); if(typeof fn === 'function') return fn(...args); }catch(_){ }
    try{ const fn = Function('return (typeof '+name+'==="function") ? '+name+' : null')(); if(typeof fn === 'function') return fn(...args); }catch(_){ }
  }
  function payloadCount(data){
    if(!data || typeof data !== 'object') return 0;
    let n = 0;
    ['compras','colaboradores','eventDocuments'].forEach(k => { if(Array.isArray(data[k])) n += data[k].length; });
    ['ticketImages','ticketImageRefs'].forEach(k => { const b = data[k]; if(b && typeof b === 'object') n += Object.keys(b).length; });
    return n;
  }
  function applyScopedState(data, eventId){
    const target = st();
    let merged = data || {};
    try{ if(typeof mergeLoadedState === 'function' && typeof defaultState === 'function') merged = mergeLoadedState(data || {}, defaultState()); }catch(_){ }
    try{ Object.keys(target).forEach(k => delete target[k]); }catch(_){ }
    Object.assign(target, merged || {});
    target.selectedEventId = eventId;
    try{ window.state = target; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.state = target; }catch(_){ }
    const sel = $('selectedEvent'); if(sel) sel.value = eventId;
    return target;
  }
  let loadSeq = 0;
  async function loadScopedEventForSwitch(eventId, token){
    const id = text(eventId);
    if(!id) return false;
    const mySeq = ++loadSeq;
    const nativeFetch = window.__ceFix48NativeFetch || window.fetch;
    const selectedStill = () => mySeq === loadSeq && (!token || !window.ControlEventV447?.state || token === window.ControlEventV447.state.token) && text($('selectedEvent')?.value || st().selectedEventId) === id;
    try{ document.body.classList.add('ce-hf47-event-loading'); }catch(_){ }
    let lastData = null;
    for(let attempt = 1; attempt <= 3; attempt++){
      if(!selectedStill()) return false;
      try{
        const url = '/api/state?eventId=' + encodeURIComponent(id) + '&scope=event&fix48=1&v47=1&attempt=' + attempt + '&_=' + Date.now();
        const res = await nativeFetch(url, {cache:'no-store', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
        const data = await res.json().catch(() => ({}));
        if(!res.ok) throw new Error(data.error || data.message || ('HTTP '+res.status));
        lastData = data;
        if(payloadCount(data) === 0 && attempt < 3){
          await new Promise(r => setTimeout(r, 180 + attempt * 260));
          continue;
        }
        if(!selectedStill()) return false;
        applyScopedState(data, id);
        try{ window.dispatchEvent(new CustomEvent('controlevent:event-loaded', {detail:{eventId:id, reason:'hf47-scoped-switch'}})); }catch(_){ }
        return true;
      }catch(error){
        if(attempt >= 3) console.warn('[ControlEvent v22_prod HF47] carga scoped de evento fallida:', error?.message || error);
        else await new Promise(r => setTimeout(r, 160 + attempt * 220));
      }
    }
    if(lastData && selectedStill()){ applyScopedState(lastData, id); return true; }
    return false;
  }

  function imageKeyPresent(key){
    const s = st(); const raw = String(key || ''); const compact = raw.replace(/\s+/g,'');
    return !!(s.ticketImages?.[raw] || s.ticketImageRefs?.[raw] || s.ticketImages?.[compact] || s.ticketImageRefs?.[compact]);
  }
  function docCode(value){ const m = String(value || '').toUpperCase().match(/DOC\s*(\d+)/); return m ? 'DOC' + String(Number(m[1])).padStart(2,'0') : ''; }
  function computeAvance(){
    const ev = selEvent(); const evId = selId(); const precio = Number(ev.precio || 0);
    const col = arr('colaboradores').filter(c => String(c.eventId || c.event_id || '') === evId);
    const totalIngresos = col.reduce((sum,c) => sum + Number(c.importe ?? c.importeVoluntario ?? c.voluntario ?? 0) + (Number(c.obligatorio ?? 0) || (Number(c.numero || 0) * precio)), 0);
    const previstoIngresos = totalIngresos || col.reduce((sum,c) => sum + Number(c.numero || 0) * precio, 0);
    const ingresosPct = previstoIngresos > 0 ? Math.min(100, totalIngresos / previstoIngresos * 100) : 0;
    const fotosIng = col.filter(c => imageKeyPresent(`${evId}|INGRESO:${c.id}`) || imageKeyPresent(`${evId}|INGRESO|${c.id}`)).length;
    const compras = arr('compras').filter(c => String(c.eventId || c.event_id || '') === evId);
    const don = compras.filter(c => text(c.ticketDonacion || c.ticket_donacion || c.donorRef || c.donor_ref));
    const comp = compras.filter(c => !text(c.ticketDonacion || c.ticket_donacion || c.donorRef || c.donor_ref));
    const docs = (Array.isArray(st().eventDocuments) ? st().eventDocuments : []).filter(d => String(d.eventId || d.event_id || '') === evId);
    const docKeys = new Set(docs.map(d => `${evId}|${docCode(d.codigo || d.imageKey || d.id)}`).filter(k => !k.endsWith('|')));
    Object.keys(st().ticketImages || {}).forEach(k => { if(k.startsWith(evId + '|') && /DOC\s*\d+/i.test(k)) docKeys.add(k); });
    const tickets = [...new Set(comp.map(c => text(c.ticket || c.ticketDonacion || c.ticket_donacion || '').toUpperCase()).filter(v => /TK\d+/i.test(v)))];
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
  function removeMapAdvance(){
    document.querySelectorAll('#ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,#ceHf16AvanceBtn,#ceHf17AvanceBtn,#ceHf18AvanceBtn,#ceHf19AvanceBtn,#ceHf20AvanceBtn,#ceHf21AvanceBtn,#ceHf40AvanceBtn,#ceHf41AvanceBtn,#ceHf42AvanceBtn,#ceHf43AvanceBtn,#ceHf44AvanceBtn,#ceHf45AvanceBtn,#ceHf46AvanceBtn,[id^="ceHf13MapaAvancePanel"],[id^="ceHf14MapaAvancePanel"],[id^="ceHf15MapaAvancePanel"],[id^="ceHf16MapaAvancePanel"],[id^="ceHf17MapaAvancePanel"],[id^="ceHf18MapaAvancePanel"],[id^="ceHf19MapaAvancePanel"],[id^="ceHf20MapaAvancePanel"],[id^="ceHf21MapaAvancePanel"],[id^="ceHf40MapaAvancePanel"],[id^="ceHf41MapaAvancePanel"],[id^="ceHf42MapaAvancePanel"],[id^="ceHf43MapaAvancePanel"],[id^="ceHf44MapaAvancePanel"],[id^="ceHf45MapaAvancePanel"],[id^="ceHf46MapaAvancePanel"],.ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,.ce-hf17-mapa-actions,.ce-hf18-mapa-actions,.ce-hf19-mapa-actions,.ce-hf20-mapa-actions,.ce-hf21-mapa-actions,.ce-hf40-mapa-actions,.ce-hf41-mapa-actions,.ce-hf42-mapa-actions,.ce-hf43-mapa-actions,.ce-hf44-mapa-actions,.ce-hf45-mapa-actions,.ce-hf46-mapa-actions,#ceHf46MapaActions').forEach(el => { try{ el.remove(); }catch(_){ } });
  }
  let bubbleTimer = 0;
  function showLogoAvanceBubble(){
    removeMapAdvance();
    let layer = $('ceHf47AvanceBubbleLayer');
    if(!layer){
      layer = document.createElement('div');
      layer.id = 'ceHf47AvanceBubbleLayer';
      document.body.appendChild(layer);
    }
    const rows = computeAvance();
    const estadoCls = isFinalizado() ? 'finalizado' : 'curso';
    layer.innerHTML = `<div class="ce-hf47-avance-bubble ${estadoCls}" role="dialog" aria-live="polite">
      <button type="button" class="ce-hf47-bubble-close" aria-label="Cerrar">×</button>
      <div class="ce-hf47-bubble-title"><span>AVANCE DEL EVENTO</span><strong>${esc(eventTitle())}</strong></div>
      <div class="ce-hf47-bubble-rows">${rows.map(r => `<div class="ce-hf47-bubble-row"><div><b>${r.n} · ${esc(r.t)}</b><small>${esc(r.d)}</small></div><strong>${Number(r.p || 0).toLocaleString('es-ES',{maximumFractionDigits:2})}%</strong><span class="ce-hf47-bar"><i style="width:${Math.max(0,Math.min(100,Number(r.p || 0)))}%"></i></span></div>`).join('')}</div>
    </div>`;
    layer.classList.add('visible');
    const close = () => { try{ layer.classList.remove('visible'); }catch(_){ } };
    layer.querySelector('.ce-hf47-bubble-close')?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); close(); }, {once:true});
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(close, 8500);
  }
  function findLogo(){
    return document.querySelector('.brand img[alt*="Colty"], img.brand-logo-large, img[alt="ColtyLAB"], .brand-logo-large, .brand');
  }
  function bindLogo(){
    const logo = findLogo();
    if(!logo || logo.__ceHf47LogoBound) return;
    logo.__ceHf47LogoBound = true;
    try{ logo.style.cursor = 'pointer'; logo.title = 'Ver avance del evento'; }catch(_){ }
    logo.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); showLogoAvanceBubble(); return false; }, true);
  }
  function openMaintenanceFromDocuments(ev){
    const trigger = ev.target?.closest?.('#btnToggleMaintenance,.mobile-menu-action[data-target="btnToggleMaintenance"]');
    if(!trigger) return;
    if(!document.body?.classList.contains('ce-docs-active-v85')) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.();
    try{ window.__ceDocsForceActiveV85 = false; }catch(_){ }
    try{ window.ControlEventDocumentsV85?.releaseExclusive?.(); }catch(_){ }
    document.body.classList.remove('ce-docs-active-v85');
    document.body.classList.add('ce-hf47-maint-open');
    setCurrentTab('mantenimiento');
    const wrap = $('maintenanceWrapper');
    if(wrap){ wrap.classList.remove('hidden'); wrap.style.setProperty('display','block','important'); wrap.style.setProperty('visibility','visible','important'); wrap.style.setProperty('pointer-events','auto','important'); }
    try{ if(typeof window.renderMaintenance === 'function') window.renderMaintenance(); else call('renderMaintenance'); }catch(_){ }
    setTimeout(() => { try{ wrap?.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){ } }, 60);
    return false;
  }
  function injectStyle(){
    if($('ceHf47Style')) return;
    const style = document.createElement('style');
    style.id = 'ceHf47Style';
    style.textContent = `
      #ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,#ceHf16AvanceBtn,#ceHf17AvanceBtn,#ceHf18AvanceBtn,#ceHf19AvanceBtn,#ceHf20AvanceBtn,#ceHf21AvanceBtn,#ceHf40AvanceBtn,#ceHf41AvanceBtn,#ceHf42AvanceBtn,#ceHf43AvanceBtn,#ceHf44AvanceBtn,#ceHf45AvanceBtn,#ceHf46AvanceBtn,#ceHf46MapaActions,[id^="ceHf13MapaAvancePanel"],[id^="ceHf14MapaAvancePanel"],[id^="ceHf15MapaAvancePanel"],[id^="ceHf16MapaAvancePanel"],[id^="ceHf17MapaAvancePanel"],[id^="ceHf18MapaAvancePanel"],[id^="ceHf19MapaAvancePanel"],[id^="ceHf20MapaAvancePanel"],[id^="ceHf21MapaAvancePanel"],[id^="ceHf40MapaAvancePanel"],[id^="ceHf41MapaAvancePanel"],[id^="ceHf42MapaAvancePanel"],[id^="ceHf43MapaAvancePanel"],[id^="ceHf44MapaAvancePanel"],[id^="ceHf45MapaAvancePanel"],[id^="ceHf46MapaAvancePanel"],.ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,.ce-hf17-mapa-actions,.ce-hf18-mapa-actions,.ce-hf19-mapa-actions,.ce-hf20-mapa-actions,.ce-hf21-mapa-actions,.ce-hf40-mapa-actions,.ce-hf41-mapa-actions,.ce-hf42-mapa-actions,.ce-hf43-mapa-actions,.ce-hf44-mapa-actions,.ce-hf45-mapa-actions,.ce-hf46-mapa-actions{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      .brand img[alt*="Colty"],img.brand-logo-large{cursor:pointer!important;}
      #ceHf47AvanceBubbleLayer{position:fixed!important;inset:0!important;z-index:980000!important;display:none!important;align-items:center!important;justify-content:center!important;padding:14px!important;pointer-events:none!important;}
      #ceHf47AvanceBubbleLayer.visible{display:flex!important;}
      .ce-hf47-avance-bubble{position:relative!important;width:min(640px,94vw)!important;max-height:min(76vh,620px)!important;overflow:auto!important;background:rgba(255,255,255,.98)!important;border:2px solid #0f172a!important;border-radius:24px!important;box-shadow:0 28px 80px rgba(15,23,42,.28)!important;padding:14px!important;pointer-events:auto!important;animation:ceHf47Pop .18s ease-out!important;}
      .ce-hf47-avance-bubble.curso{border-color:#16a34a!important}.ce-hf47-avance-bubble.finalizado{border-color:#dc2626!important}
      .ce-hf47-bubble-title{text-align:center!important;margin:2px 36px 12px!important;line-height:1.15!important}.ce-hf47-bubble-title span{display:block!important;font-size:12px!important;font-weight:950!important;letter-spacing:.14em!important;color:#64748b!important}.ce-hf47-bubble-title strong{display:block!important;font-size:clamp(17px,3.8vw,24px)!important;font-weight:950!important;color:#0f172a!important}.ce-hf47-avance-bubble.curso .ce-hf47-bubble-title strong{color:#15803d!important}.ce-hf47-avance-bubble.finalizado .ce-hf47-bubble-title strong{color:#991b1b!important}
      .ce-hf47-bubble-close{position:absolute!important;right:10px!important;top:8px!important;width:34px!important;height:34px!important;border-radius:999px!important;border:1px solid #cbd5e1!important;background:#fff!important;font-size:24px!important;font-weight:950!important;line-height:28px!important;cursor:pointer!important}.ce-hf47-bubble-rows{display:grid!important;gap:6px!important}.ce-hf47-bubble-row{display:grid!important;grid-template-columns:1fr 62px minmax(95px,.8fr)!important;gap:8px!important;align-items:center!important;background:#f8fafc!important;border:1px solid #dbe4ee!important;border-radius:14px!important;padding:8px!important}.ce-hf47-bubble-row b{font-size:13px!important;font-weight:950!important}.ce-hf47-bubble-row small{display:block!important;color:#475569!important;font-size:11px!important;font-weight:750!important;margin-top:2px!important}.ce-hf47-bubble-row>strong{text-align:right!important;font-size:13px!important}.ce-hf47-bar{height:10px!important;background:#e5e7eb!important;border-radius:999px!important;overflow:hidden!important}.ce-hf47-bar i{display:block!important;height:100%!important;background:#2563eb!important;border-radius:999px!important}@media(max-width:560px){.ce-hf47-bubble-row{grid-template-columns:1fr 52px!important}.ce-hf47-bar{grid-column:1/-1!important}.ce-hf47-avance-bubble{padding:12px!important;border-radius:20px!important}}
      body.ce-hf47-event-loading #selectedEvent{cursor:progress!important;}
      body.ce-docs-active-v85.ce-hf47-maint-open #maintenanceWrapper,body.ce-hf47-maint-open #maintenanceWrapper{display:block!important;visibility:visible!important;pointer-events:auto!important;}
      body.ce-hf47-maint-open #tabDocumentos{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      @keyframes ceHf47Pop{from{transform:scale(.96);opacity:.25}to{transform:scale(1);opacity:1}}
    `;
    document.head.appendChild(style);
  }
  function install(){
    injectStyle();
    removeMapAdvance();
    bindLogo();
    window.ControlEventHf47 = Object.assign(window.ControlEventHf47 || {}, { loadScopedEventForSwitch, showAvance: showLogoAvanceBubble, cleanupMapAvance: removeMapAdvance });
  }
  document.addEventListener('click', openMaintenanceFromDocuments, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') $('ceHf47AvanceBubbleLayer')?.classList.remove('visible'); }, true);
  window.addEventListener('controlevent:event-loaded', () => setTimeout(removeMapAdvance, 40));
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(removeMapAdvance, 80); }, true);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  [250, 800, 1600, 3000].forEach(ms => setTimeout(install, ms));
})();
