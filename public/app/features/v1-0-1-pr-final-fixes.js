/* ControlEvent v1.0.1/pr - sincronizacion ligera de justificantes y Refres movil.
   - No toca la operativa que ya funciona.
   - Fuerza lectura real de /api/ticket-images al entrar, elegir evento, volver al foco y pulsar Refres.
   - Refres se pinta en verde Excel durante la actualizacion y vuelve a blanco al terminar. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v1.0.1/pr';
  const VERSION_FILE = 'ControlEvent_v1_0_1_pr';
  const INSTALLED = '__ceV101PrFinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV101PrFinalStyle';
  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || window.__CONTROL_EVENT_USER__ || null;
  const norm = v => String(v ?? '').trim();
  const selectedEventId = () => norm(st().selectedEventId || $('selectedEvent')?.value || '');
  const srcOf = v => {
    if(!v) return '';
    if(typeof v === 'string') return v;
    if(typeof v === 'object') return v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || '';
    return '';
  };
  const isIngresoKey = key => /(^|\|)INGRESO[:|]/i.test(String(key || ''));

  function replaceVersionText(text){
    return String(text || '')
      .replace(/ControlEvent\s+v\d+(?:\.\d+)*(?:\/pr)?/ig, VERSION)
      .replace(/ControlEvent_v\d+(?:_\d+)*(?:_pr)?/ig, VERSION_FILE);
  }
  function applyVersion(){
    safe(() => { document.title = VERSION; });
    safe(() => { document.documentElement.dataset.ceVersion = VERSION; });
    safe(() => { if(document.body) document.body.dataset.ceVersion = VERSION; });
    safe(() => { window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; });
    safe(() => { window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; });
    safe(() => {
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const next = replaceVersionText(el.textContent || '');
        if(next && next !== el.textContent) el.textContent = next;
      });
    });
    safe(() => {
      if(typeof window.emittedByTextV171 === 'function' && !window.emittedByTextV171.__ceV101PrWrapped){
        const old = window.emittedByTextV171;
        const wrapped = function(){ return replaceVersionText(old.apply(this, arguments)); };
        wrapped.__ceV101PrWrapped = true;
        window.emittedByTextV171 = wrapped;
        try{ emittedByTextV171 = wrapped; }catch(_){ }
      }
    });
  }

  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #btnSoftRefresh.ce-refreshing,#ceBtnRefresV518.ce-refreshing,
      #btnSoftRefresh[data-ce-refreshing="1"],#ceBtnRefresV518[data-ce-refreshing="1"]{
        background:#107C41!important;color:#fff!important;border-color:#0B5D2A!important;opacity:1!important;
        box-shadow:0 0 0 3px rgba(16,124,65,.24),0 8px 22px rgba(16,124,65,.22)!important;
      }
      #btnSoftRefresh:not(.ce-refreshing):not([data-ce-refreshing="1"]),#ceBtnRefresV518:not(.ce-refreshing):not([data-ce-refreshing="1"]){background:#fff!important;color:#111827!important;}
    `;
    document.head.appendChild(style);
  }

  function stores(){
    const s = st();
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    return {store:s.ticketImages, refs:s.ticketImageRefs};
  }
  function mergeImage(key, value){
    const rawKey = norm(key);
    const src = srcOf(value);
    if(!rawKey || !src) return false;
    const eventId = selectedEventId();
    const fullKey = rawKey.includes('|') ? rawKey : (eventId ? `${eventId}|${rawKey}` : rawKey);
    const {store, refs} = stores();
    const ref = typeof value === 'object'
      ? {...value, key:fullKey, url:src, pathname:value.pathname || src}
      : {key:fullKey, url:src, pathname:src};
    store[fullKey] = src;
    refs[fullKey] = ref;
    if(isIngresoKey(rawKey)){
      store[rawKey] = src;
      refs[rawKey] = {...ref, key:rawKey};
    }
    const id = fullKey.replace(/^.*?INGRESO[:|]/i, '');
    if(eventId && id){
      const canonical = `${eventId}|INGRESO:${id}`;
      store[canonical] = src;
      refs[canonical] = {...ref, key:canonical};
    }
    return true;
  }
  function afterImageMerge(){
    safe(() => window.ControlEventV509?.normalizeReceiptFields?.());
    safe(() => window.ControlEventV509?.hydrateReceipts?.(true));
    safe(() => window.ControlEventV469?.enrichOpenTooltips?.());
    safe(() => window.ControlEventV469?.compactIngresoReceipts?.());
    safe(() => window.ControlEventV467?.enrichOpenTooltips?.());
    safe(() => window.ControlEventBudgetLiteTips?.sanitize?.());
  }

  let syncInFlight = null;
  let lastSyncAt = 0;
  async function syncReceiptImages(reason, force){
    if(!auth()) return false;
    const eventId = selectedEventId();
    if(!eventId) return false;
    const now = Date.now();
    if(syncInFlight) return syncInFlight;
    if(!force && now - lastSyncAt < 2500) return false;
    lastSyncAt = now;
    syncInFlight = (async () => {
      try{
        const url = `/api/ticket-images?eventId=${encodeURIComponent(eventId)}&ce_sync=${Date.now()}`;
        const res = await fetch(url, {cache:'no-store'});
        const payload = await res.json().catch(() => ({}));
        if(!res.ok || !payload.ok || !payload.images) return false;
        let changed = false;
        Object.entries(payload.images || {}).forEach(([key, value]) => {
          if(!isIngresoKey(key)) return;
          if(mergeImage(key, value)) changed = true;
        });
        if(changed){
          afterImageMerge();
          [80,260].forEach(ms => setTimeout(afterImageMerge, ms));
        }
        return changed;
      }catch(error){
        console.warn('[v1.0.1/pr] sincronizacion justificantes', reason, error);
        return false;
      }finally{
        syncInFlight = null;
      }
    })();
    return syncInFlight;
  }

  function markRefresh(on){
    document.querySelectorAll('#btnSoftRefresh,#ceBtnRefresV518').forEach(btn => {
      safe(() => {
        btn.classList.toggle('ce-refreshing', !!on);
        if(on){
          btn.dataset.ceRefreshing = '1';
          btn.style.setProperty('background','#107C41','important');
          btn.style.setProperty('color','#fff','important');
          btn.style.setProperty('border-color','#0B5D2A','important');
          if(btn.id === 'ceBtnRefresV518') btn.textContent = 'Refres';
        }else{
          delete btn.dataset.ceRefreshing;
          btn.style.setProperty('background','#fff','important');
          btn.style.setProperty('color','#111827','important');
          btn.style.removeProperty('border-color');
        }
      });
    });
  }
  function refreshStart(ev){
    if(!ev.target?.closest?.('#btnSoftRefresh,#ceBtnRefresV518')) return;
    markRefresh(true);
    syncReceiptImages('refresh-start', true);
    setTimeout(() => syncReceiptImages('refresh-after', true).finally(() => markRefresh(false)), 900);
    setTimeout(() => markRefresh(false), 5200);
  }

  function patchFetch(){
    if(window.__ceV101PrFetchPatched || typeof window.fetch !== 'function') return;
    window.__ceV101PrFetchPatched = true;
    const oldFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      const url = String((input && input.url) || input || '');
      const method = String(init?.method || input?.method || 'GET').toUpperCase();
      const wasRefreshState = /\/api\/state(?:\?|$)/.test(url) && method === 'GET' && document.querySelector('[data-ce-refreshing="1"],.ce-refreshing');
      if(wasRefreshState) markRefresh(true);
      const promise = oldFetch(input, init);
      if(/\/api\/ticket-images(?:\?|$)/.test(url)){
        return promise.then(res => {
          try{
            res.clone().json().then(payload => {
              if(res.ok && payload && payload.ok){
                if(payload.image){ mergeImage(payload.image.key, payload.image); afterImageMerge(); }
                if(payload.images){ Object.entries(payload.images).forEach(([k,v]) => { if(isIngresoKey(k)) mergeImage(k,v); }); afterImageMerge(); }
              }
            }).catch(()=>{});
          }catch(_){ }
          return res;
        }).finally(() => { if(method === 'POST' || method === 'DELETE') setTimeout(() => syncReceiptImages('ticket-images-write', true), 250); });
      }
      if(wasRefreshState){
        return promise.finally(() => setTimeout(() => syncReceiptImages('state-refresh', true).finally(() => markRefresh(false)), 250));
      }
      return promise;
    };
  }

  function installHandlers(){
    if(window.__ceV101PrHandlers) return;
    window.__ceV101PrHandlers = true;
    ['pointerdown','touchstart','mousedown','click'].forEach(type => document.addEventListener(type, refreshStart, {capture:true, passive:true}));
    document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') [250,900,1800].forEach(ms => setTimeout(() => syncReceiptImages('event-change', true), ms)); }, true);
    ['controlevent:event-ready','controlevent:module-mounted','controlevent:modules-ready','controlevent:app-ready','controlevent:runtime-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(() => syncReceiptImages(evt, true), 260)));
    window.addEventListener('focus', () => setTimeout(() => syncReceiptImages('focus', true), 200));
    document.addEventListener('visibilitychange', () => { if(!document.hidden) setTimeout(() => syncReceiptImages('visible', true), 200); });
  }

  function install(){
    injectStyle();
    applyVersion();
    patchFetch();
    installHandlers();
    document.querySelectorAll('#ceBtnRefresV518').forEach(btn => { if(!/Refres/i.test(btn.textContent || '')) btn.textContent = 'Refres'; });
    if(auth() && selectedEventId()) [400,1300].forEach(ms => setTimeout(() => syncReceiptImages('install', true), ms));
  }

  window.ControlEventV101PR = {version:VERSION, versionFile:VERSION_FILE, install, syncReceiptImages, markRefresh, applyVersion};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 80)));
  setTimeout(install, 600);
})();
