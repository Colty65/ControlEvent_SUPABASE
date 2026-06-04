/* ControlEvent v8.1_prod - aislamiento de fotos TKxx por evento y refuerzo ligero de BACKUP.
   Sin intervalos: normaliza claves de fotos al cargar, cambiar evento, refrescar o guardar. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v8.1_prod';
  const VERSION_FILE = 'ControlEvent_v8_1_prod';
  const INSTALLED = '__ceV81TicketScopeFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const norm = v => String(v ?? '').trim();
  const ticketToken = v => (norm(v).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i) || [''])[0].replace(/\s+/g,'').toUpperCase();
  const isIngreso = k => /^INGRESO[:|]/i.test(norm(k));
  function state(){ return window.ControlEventApp?.state || window.state || {}; }
  function eventIds(){ return new Set((Array.isArray(state().eventos) ? state().eventos : []).map(e => norm(e.id)).filter(Boolean)); }
  function srcOf(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || value.src || '');
    return '';
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
  function imageEventFromValue(value){
    const m = srcOf(value).match(/\/ticket-images\/([^\/?#]+)\//i);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function decodedKeyFromValue(value){
    const m = srcOf(value).match(/\/ticket-images\/[^\/?#]+\/([^\/?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
    return m ? decodeBase64UrlText(m[1]) : '';
  }
  function canonicalFrom(key, value, ids = eventIds()){
    key = norm(key);
    const srcEvent = imageEventFromValue(value);
    const decoded = decodedKeyFromValue(value);
    let ev = '';
    let label = key;
    const dp = decoded.split('|');
    if(ids.has(dp[0])){ ev = dp[0]; label = dp.slice(1).join('|') || label; }
    if(!ev && ids.has(srcEvent)) ev = srcEvent;
    const kp = key.split('|');
    if(!ev && ids.has(kp[0])){ ev = kp[0]; label = kp.slice(1).join('|') || label; }
    if(!ev) return {eventId:'', label:key, key};
    label = norm(label || key);
    if(label.startsWith(ev + '|')) label = label.slice(ev.length + 1);
    return {eventId:ev, label, key:`${ev}|${label}`};
  }
  function normalizeStore(){
    const s = state();
    if(!s || typeof s !== 'object') return false;
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    const ids = eventIds();
    let changed = false;
    ['ticketImages','ticketImageRefs'].forEach(name => {
      const store = s[name] || {};
      Object.entries({...store}).forEach(([key,value]) => {
        const can = canonicalFrom(key, value, ids);
        const hasTicket = ticketToken(key) || ticketToken(can.label);
        if(can.eventId && can.key && can.key !== key){
          if(!store[can.key]){ store[can.key] = value; changed = true; }
          // Las claves genéricas TKxx son las peligrosas: se eliminan de memoria después de crear la clave con evento.
          if(hasTicket && !isIngreso(key)){ delete store[key]; changed = true; }
        }
        if(hasTicket && !can.eventId && !isIngreso(key) && !String(key).includes('|')){
          delete store[key]; changed = true;
        }
      });
    });
    if(changed) window.dispatchEvent(new CustomEvent('controlevent:ticket-images-normalized-v81'));
    return changed;
  }
  function applyVersion(){
    safe(() => { document.title = VERSION; }, null);
    safe(() => { window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; if(document.body) document.body.dataset.ceVersion = VERSION; }, null);
    safe(() => document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => { if(/ControlEvent\s+v/i.test(el.textContent || '') || el.matches('[data-ce-version-label]')) el.textContent = VERSION; }), null);
  }
  function install(){ applyVersion(); normalizeStore(); }
  const oldFetch = window.fetch;
  if(typeof oldFetch === 'function' && !oldFetch.__ceV81TicketScope){
    window.fetch = function(input, init){
      const url = String(typeof input === 'string' ? input : input?.url || '');
      const res = oldFetch.apply(this, arguments);
      if(/\/api\/(?:state|ticket-images|export\/backup)(?:$|\?)/.test(url)){
        Promise.resolve(res).then(() => setTimeout(install, 30)).catch(()=>{});
      }
      return res;
    };
    window.fetch.__ceV81TicketScope = true;
  }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:event-loaded','controlevent:ticket-image-changed','controlevent:excel-before-run'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 25)));
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(install, 30); }, true);
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnRefrescar,#btnRefresh,#btnExportSeed,#btnExportExcel,#tabGraficasBtn,#tabResumenBtn')) setTimeout(install, 20); }, true);
  [0,180,800].forEach(ms => setTimeout(install, ms));
  window.ControlEventV81TicketScopeFix = {version:VERSION, versionFile:VERSION_FILE, normalizeStore, canonicalFrom};
})();
