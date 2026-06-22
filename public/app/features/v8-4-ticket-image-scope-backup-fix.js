/* ControlEvent v12.0_prod - Fotos TKxx/INGRESOS con claves vivas y exportación limpia.
   Sin intervalos: normaliza solo en carga, cambio de evento, refresco, foto cambiada o descarga. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v12.0_prod';
  const VERSION_FILE = 'ControlEvent_v12.0_prod';
  const INSTALLED = '__ceV82TicketScopeFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const norm = v => String(v ?? '').trim();
  const rows = name => Array.isArray(state()?.[name]) ? state()[name] : [];
  const ticketToken = v => (norm(v).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i) || [''])[0].replace(/\s+/g,'').toUpperCase();
  const isDonation = v => ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(norm(v).toUpperCase());
  const ticket = c => norm(c?.ticketDonacion ?? c?.ticket ?? c?.ticketOtrosGastos ?? '');
  function state(){ return window.ControlEventApp?.state || window.state || {}; }
  function byId(items){ const out = {}; (items || []).forEach(x => { if(x?.id) out[String(x.id)] = x; }); return out; }
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
  function eventFromKey(key){ return norm(key).split('|')[0] || ''; }
  function labelFromKey(key){ const p = norm(key).split('|'); return p.slice(1).join('|') || norm(key); }
  function ingresoInner(value){
    const m = norm(value).match(/INGRESO[:|]([^|\s]+)/i);
    return m ? `INGRESO:${m[1]}` : '';
  }
  function stripEvent(value, ev){ let s = norm(value); if(ev && s.startsWith(ev + '|')) s = norm(s.slice(ev.length + 1)); return s; }
  function tkInner(value){
    let s = norm(value);
    if(/^INGRESO[:|]/i.test(s) && s.includes('|') && ticketToken(s)) s = norm(s.split('|').slice(1).join('|'));
    const tk = ticketToken(s);
    if(!tk) return '';
    const left = norm(s.split('|')[0] || '');
    if(left && left !== tk && !/^INGRESO[:|]/i.test(left)) return `${left} | ${tk}`;
    return tk;
  }
  function buildLiveIndex(){
    const s = state();
    const index = new Map();
    const byEventToken = new Map();
    const stores = byId(rows('tiendas'));
    function add(ev, inner, kind){
      ev = norm(ev); inner = norm(inner);
      if(!ev || !inner) return;
      const key = `${ev}|${inner}`;
      if(!index.has(key)) index.set(key, {eventId:ev, inner, key, kind});
      const tk = ticketToken(inner);
      if(tk){
        const mapKey = `${ev}|${tk}`;
        if(!byEventToken.has(mapKey)) byEventToken.set(mapKey, new Set());
        byEventToken.get(mapKey).add(key);
      }
    }
    rows('colaboradores').forEach(c => { if(c?.id && c?.eventId) add(c.eventId, `INGRESO:${c.id}`, 'INGRESO'); });
    rows('compras').forEach(c => {
      const tk = ticketToken(ticket(c));
      if(!tk || isDonation(ticket(c))) return;
      const storeName = norm(stores[String(c.tiendaId || '')]?.nombre || '');
      add(c.eventId, storeName ? `${storeName} | ${tk}` : tk, 'TK');
    });
    return {index, byEventToken};
  }
  function candidateEvents(key, value){
    const decoded = decodedKeyFromValue(value);
    const out = [];
    [imageEventFromValue(value), eventFromKey(decoded), eventFromKey(key)].forEach(ev => {
      ev = norm(ev); if(ev && ev !== 'sin_evento' && !out.includes(ev)) out.push(ev);
    });
    return out;
  }
  function candidateInners(key, value, ev){
    const decoded = decodedKeyFromValue(value);
    const out = [];
    [labelFromKey(decoded), labelFromKey(key), decoded, key].forEach(v => {
      v = stripEvent(v, ev); if(v && !out.includes(v)) out.push(v);
    });
    return out;
  }
  function liveKeyFor(key, value, live){
    for(const ev of candidateEvents(key, value)){
      for(const inner of candidateInners(key, value, ev)){
        const ing = ingresoInner(inner);
        if(ing && live.index.has(`${ev}|${ing}`)) return `${ev}|${ing}`;
        const tki = tkInner(inner);
        if(tki){
          const exact = `${ev}|${tki}`;
          if(live.index.has(exact)) return exact;
          const tk = ticketToken(tki);
          const cands = live.byEventToken.get(`${ev}|${tk}`);
          if(cands && cands.size === 1) return [...cands][0];
        }
      }
    }
    return '';
  }
  function normalizeStore(){
    const s = state();
    if(!s || typeof s !== 'object') return false;
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    const live = buildLiveIndex();
    let changed = false;
    ['ticketImages','ticketImageRefs'].forEach(name => {
      const store = s[name] || {};
      Object.entries({...store}).forEach(([key,value]) => {
        const lk = liveKeyFor(key, value, live);
        // v8.3: normalización NO destructiva.
        // Si aún no están cargadas compras/ingresos o la relación viva no casa en ese instante,
        // no se borra la referencia de memoria: las fotos solo se eliminan al pulsar Eliminar.
        // El BACKUP seguirá filtrando lo válido, pero la pantalla no debe ocultar fotos guardadas
        // correctamente en ce_ticket_images.
        if(!lk) return;
        if(lk !== key){
          if(!store[lk]){ store[lk] = value; changed = true; }
        }
      });
    });
    if(changed) window.dispatchEvent(new CustomEvent('controlevent:ticket-images-normalized-v82'));
    return changed;
  }
  function applyVersion(){
    safe(() => { document.title = VERSION; }, null);
    safe(() => { window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; if(document.body) document.body.dataset.ceVersion = VERSION; }, null);
    safe(() => document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => { if(/ControlEvent\s+v/i.test(el.textContent || '') || el.matches('[data-ce-version-label]')) el.textContent = VERSION; }), null);
  }
  function install(){ applyVersion(); normalizeStore(); }
  const oldFetch = window.fetch;
  if(typeof oldFetch === 'function' && !oldFetch.__ceV82TicketScope){
    window.fetch = function(input, init){
      const url = String(typeof input === 'string' ? input : input?.url || '');
      const res = oldFetch.apply(this, arguments);
      if(/\/api\/(?:state|ticket-images|export\/backup)(?:$|\?)/.test(url)) Promise.resolve(res).then(() => setTimeout(install, 30)).catch(()=>{});
      return res;
    };
    window.fetch.__ceV82TicketScope = true;
  }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:event-loaded','controlevent:ticket-image-changed','controlevent:excel-before-run'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 25)));
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(install, 30); }, true);
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnRefrescar,#btnRefresh,#btnExportSeed,#btnExportExcel,#tabGraficasBtn,#tabResumenBtn')) setTimeout(install, 20); }, true);
  [0,180,800].forEach(ms => setTimeout(install, ms));
  window.ControlEventV82TicketScopeFix = {version:VERSION, versionFile:VERSION_FILE, normalizeStore, liveKeyFor};
})();
