/* ControlEvent v9.4_prod - Hidratación puntual de fotos TKxx al volver a un evento.
   Objetivo: si ce_ticket_images ya está limpia, que las miniaturas aparezcan al volver al evento
   sin tener que pulsar Adjuntar ni Refrescar. Sin setInterval ni barridos continuos. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v9.4_prod';
  const VERSION_FILE = 'ControlEvent_v9_4_prod';
  const INSTALLED = '__ceV821TicketImagesVisibleAfterEvent';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const srcOf = v => !v ? '' : (typeof v === 'string' ? norm(v) : norm(v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || v.src || ''));
  function st(){ try{ return (window.ControlEventApp && window.ControlEventApp.state) || window.state || state || {}; }catch(_){ return window.state || {}; } }
  function arr(k){ const a = st()[k]; return Array.isArray(a) ? a : []; }
  function currentEventId(){
    const s = st();
    let id = norm(s.selectedEventId || '');
    try{ const sel = document.getElementById('selectedEvent'); if(sel && norm(sel.value)) id = norm(sel.value); }catch(_){ }
    return id;
  }
  function ticketToken(label){ const m = norm(label).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i); return m ? m[0].replace(/\s+/g,'').toUpperCase() : ''; }
  function cleanLabel(label){ return norm(label).split('·')[0].replace(/\s*\|\s*/g,' | ').trim(); }
  function imageCandidates(label, ev=currentEventId()){
    const base = norm(label), clean = cleanLabel(base), tk = ticketToken(base);
    const out = [];
    const add = v => { v = norm(v); if(v && !out.includes(v)) out.push(v); };
    const scoped = v => { v = cleanLabel(v); if(!v || !ev) return; add(v.startsWith(ev + '|') ? v : `${ev}|${v}`); };
    [base, clean].forEach(scoped);
    const parts = clean.split('|').map(x => norm(x)).filter(Boolean);
    if(parts.length >= 2){
      const a = parts[0], b = parts[1];
      [`${a} | ${b}`, `${a}|${b}`].forEach(scoped);
    }
    if(tk && parts.length >= 1) scoped(`${parts[0]} | ${tk}`);
    return out;
  }
  function decodeBase64UrlText(value){
    const raw = norm(value).replace(/\.[a-z0-9]+(?:\?.*)?$/i,'');
    if(!raw) return '';
    try{
      const b64 = raw.replace(/-/g,'+').replace(/_/g,'/');
      const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
      return decodeURIComponent(Array.prototype.map.call(atob(padded), ch => '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2)).join(''));
    }catch(_){ return ''; }
  }
  function decodedKeyFromValue(value){
    const m = srcOf(value).match(/\/ticket-images\/[^\/?#]+\/([^\/?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
    return m ? decodeBase64UrlText(m[1]) : '';
  }
  function putImage(rawKey, value, ev=currentEventId()){
    const src = srcOf(value); if(!src || !ev) return false;
    const s = st();
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    const keys = [];
    const add = k => { k = norm(k); if(k && !keys.includes(k)) keys.push(k); };
    const decoded = decodedKeyFromValue(value);
    [rawKey, value && value.key, decoded].forEach(k => {
      k = norm(k);
      if(!k) return;
      add(k.startsWith(ev + '|') ? k : `${ev}|${cleanLabel(k)}`);
    });
    let changed = false;
    keys.forEach(k => {
      if(srcOf(s.ticketImages[k]) !== src){ s.ticketImages[k] = src; changed = true; }
      if(srcOf(s.ticketImageRefs[k]) !== src){
        s.ticketImageRefs[k] = value && typeof value === 'object' ? {...value, key:k, url:value.url || value.public_url || src, pathname:value.pathname || value.path || src} : {key:k,url:src,pathname:src};
        changed = true;
      }
    });
    return changed;
  }
  function findImage(label){
    const s = st();
    const bags = [s.ticketImages || {}, s.ticketImageRefs || {}];
    for(const k of imageCandidates(label)){
      for(const bag of bags){ const src = srcOf(bag[k]); if(src) return src; }
    }
    return '';
  }
  function ensureSummaryTicketThumbs(){
    const wrap = document.getElementById('summaryTiendaTicket');
    if(!wrap) return 0;
    let count = 0;
    wrap.querySelectorAll('.summary-item').forEach(row => {
      const first = row.querySelector(':scope > span:first-child');
      const label = cleanLabel(first && first.textContent || '');
      if(!label || /^TOTAL$/i.test(label) || /Pte\.\s*Compra/i.test(label) || /DONADO/i.test(label)) return;
      const src = findImage(label); if(!src) return;
      let actions = row.querySelector('.ticket-actions');
      const right = row.querySelector(':scope > span:last-child') || row;
      if(!actions){ actions = document.createElement('span'); actions.className = 'ticket-actions ce-v821-view-only'; right.appendChild(actions); }
      actions.querySelectorAll('.hint').forEach(x => { if(/Sin imagen/i.test(x.textContent || '')) x.remove(); });
      let img = actions.querySelector('img.ticket-thumb');
      if(!img){ img = document.createElement('img'); img.className = 'ticket-thumb'; img.alt = 'ticket'; actions.appendChild(img); }
      if(img.getAttribute('src') !== src){ img.setAttribute('src', src); count++; }
      img.style.setProperty('display','inline-block','important');
      img.style.setProperty('visibility','visible','important');
      img.style.setProperty('opacity','1','important');
      img.style.setProperty('pointer-events','auto','important');
      img.style.setProperty('cursor','zoom-in','important');
    });
    return count;
  }
  function refreshVisibleSummary(){
    try{ ensureSummaryTicketThumbs(); }catch(_){ }
    try{ if(document.getElementById('summaryTiendaTicket') && window.__ceV240 && typeof window.__ceV240.summaryByTiendaTicket === 'function' && typeof window.renderSummaryList === 'function'){
      window.renderSummaryList('summaryTiendaTicket', window.__ceV240.summaryByTiendaTicket());
      setTimeout(ensureSummaryTicketThumbs, 30);
    }}catch(_){ }
  }

  let inflight = null;
  let lastSig = '';
  async function hydrateCurrentEvent(force=false){
    const ev = currentEventId(); if(!ev) return false;
    const now = Date.now();
    if(!force && lastSig === ev && now - (hydrateCurrentEvent.lastAt || 0) < 1600){ refreshVisibleSummary(); return false; }
    hydrateCurrentEvent.lastAt = now; lastSig = ev;
    if(inflight) return inflight;
    inflight = (async () => {
      let changed = false;
      try{
        const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(ev)}&_=${Date.now()}`, {cache:'no-store'});
        const data = await res.json().catch(() => ({}));
        if(res.ok && data && data.images){
          Object.entries(data.images).forEach(([k,v]) => { if(putImage(k,v,ev)) changed = true; });
        }
      }catch(err){ console.warn('[ControlEvent v9.4_prod] No se pudieron traer fotos del evento.', err); }
      try{ if(window.ControlEventV82TicketScopeFix && typeof window.ControlEventV82TicketScopeFix.normalizeStore === 'function') window.ControlEventV82TicketScopeFix.normalizeStore(); }catch(_){ }
      refreshVisibleSummary();
      return changed;
    })().finally(() => { inflight = null; });
    return inflight;
  }
  function scheduleHydrate(reason, force=false){
    [80, 360, 950].forEach(ms => setTimeout(() => hydrateCurrentEvent(force).catch(()=>{}), ms));
  }
  function applyVersion(){
    try{ document.title = VERSION; window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => { if(/ControlEvent\s+v/i.test(el.textContent || '') || el.matches('[data-ce-version-label]')) el.textContent = VERSION; }); }catch(_){ }
  }

  const wrapFn = (name, afterForce) => {
    const fn = window[name] || (typeof globalThis[name] === 'function' ? globalThis[name] : null);
    if(typeof fn !== 'function' || fn.__ceV821Wrapped) return;
    const wrapped = function(){ const ret = fn.apply(this, arguments); setTimeout(() => { applyVersion(); hydrateCurrentEvent(!!afterForce); }, 50); return ret; };
    wrapped.__ceV821Wrapped = true;
    try{ window[name] = wrapped; globalThis[name] = wrapped; }catch(_){ window[name] = wrapped; }
  };
  function install(){
    applyVersion();
    wrapFn('renderBudget', false);
    wrapFn('renderSummaryList', false);
    wrapFn('render', false);
    hydrateCurrentEvent(false);
    setTimeout(refreshVisibleSummary, 120);
  }
  document.addEventListener('change', ev => { if(ev.target && ev.target.id === 'selectedEvent') scheduleHydrate('event-change', true); }, true);
  document.addEventListener('click', ev => { if(ev.target && ev.target.closest && ev.target.closest('#tabResumenBtn,#btnRefrescar,#btnRefresh,[data-ce-soft-refresh]')) scheduleHydrate('ui-click', true); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:event-loaded','controlevent:ticket-image-changed'].forEach(evt => window.addEventListener(evt, () => scheduleHydrate(evt, true)));
  [0,220,900,1800].forEach(ms => setTimeout(install, ms));
  window.ControlEventV821TicketImages = {version:VERSION, versionFile:VERSION_FILE, hydrate:hydrateCurrentEvent, refresh:refreshVisibleSummary, findImage};
})();
