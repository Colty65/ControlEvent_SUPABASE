/* ControlEvent v3.6_prod - emergencia contra bloqueo de login por v50.23.
   - No usa MutationObserver global ni bucles permanentes.
   - Mantiene login escribible.
   - Refres/Refrescar se marca en verde Excel durante la actualización.
   - Versión unificada solo con aplicaciones puntuales, sin observador infinito. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v3.6_prod';
  const VERSION_FILE = 'ControlEvent_v3_6_prod';
  const INSTALLED = '__ceV5024FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV5024FinalStyle';
  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || null;
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const eventById = id => arr('eventos').find(e => String(e?.id || '') === String(id || '')) || null;
  const hasValidEvent = id => !!eventById(id == null ? st().selectedEventId : id);

  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #btnSoftRefresh.ce-refreshing,#ceBtnRefresV518.ce-refreshing,
      #btnSoftRefresh[data-ce-refreshing="1"],#ceBtnRefresV518[data-ce-refreshing="1"]{
        background:#107C41!important;color:#fff!important;border-color:#0B5D2A!important;opacity:1!important;
        box-shadow:0 0 0 3px rgba(16,124,65,.22),0 8px 22px rgba(16,124,65,.22)!important;
      }
      #btnSoftRefresh:not(.ce-refreshing):not([data-ce-refreshing="1"]),#ceBtnRefresV518:not(.ce-refreshing):not([data-ce-refreshing="1"]){
        background:#fff!important;color:#111827!important;
      }
      #authOverlay{pointer-events:auto;}
      #authOverlay input,#authOverlay button,#authOverlay select{pointer-events:auto!important;user-select:text!important;}
    `;
    document.head.appendChild(style);
  }

  function stampV300(date = new Date()){
    const p = n => String(n).padStart(2, '0');
    return {ymd: `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`, hms: `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`};
  }

  function normalizeYmdV300(value){
    const s = String(value || '');
    if(/^20\d{6}$/.test(s)) return s;
    if(/^\d{8}$/.test(s)) return `${s.slice(4)}${s.slice(2,4)}${s.slice(0,2)}`;
    return stampV300().ymd;
  }

  function normalizeDownloadNameV300(text){
    let out = String(text || '');
    if(!/\.xlsx(?:$|\?)/i.test(out)) return out;
    out = out.replace(new RegExp(`(${VERSION_FILE}_INFOEVENTO-.+?)_(\\d{8})(?:[-_](\\d{2})[:_]*(\\d{2})[:_]*(\\d{2}))?\\.xlsx$`, 'i'), (_m, prefix, date, hh, mi, ss) => {
      const fallback = stampV300();
      return `${prefix}_${normalizeYmdV300(date)}_${hh && mi && ss ? `${hh}${mi}${ss}` : fallback.hms}.xlsx`;
    });
    out = out.replace(new RegExp(`(${VERSION_FILE}_BACKUP_.+?)_(\\d{8})(?:[-_](\\d{2})[:_]*(\\d{2})[:_]*(\\d{2}))?\\.xlsx$`, 'i'), (_m, prefix, date, hh, mi, ss) => {
      const fallback = stampV300();
      return `${prefix}_${normalizeYmdV300(date)}_${hh && mi && ss ? `${hh}${mi}${ss}` : fallback.hms}.xlsx`;
    });
    return out;
  }

  function escapeRegExpV300(text){
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function replaceVersionFilePrefixV300(text){
    const out = String(text || '')
      .replace(/ControlEvent_v\d+(?:_\d+){1,3}(?:_prod)+(?=_(?:INFOEVENTO|BACKUP|descarga_datos)(?=[_.-])|\.xlsx(?:$|\?|\b)|$)/ig, VERSION_FILE)
      .replace(/ControlEvent_v\d+(?:_\d+){1,3}(?=_(?:INFOEVENTO|BACKUP|descarga_datos)(?=[_.-])|\.xlsx(?:$|\?|\b)|$)/ig, VERSION_FILE);
    return out.replace(new RegExp(`${escapeRegExpV300(VERSION_FILE)}(?:_prod)+(?=_(?:INFOEVENTO|BACKUP|descarga_datos)(?=[_.-])|\\.xlsx(?:$|\\?|\\b)|$)`, 'ig'), VERSION_FILE);
  }

  function replaceVersionText(text){
    return normalizeDownloadNameV300(replaceVersionFilePrefixV300(String(text || '')
      .replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION)));
  }

  function applyVersionOnce(){
    try{
      document.title = VERSION;
      document.documentElement.dataset.ceVersion = VERSION;
      if(document.body) document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const next = replaceVersionText(el.textContent || '');
        if(next && next !== el.textContent) el.textContent = next;
      });
    }catch(_){ }
  }

  function keepLoginWritable(){
    const ov = $('authOverlay');
    if(!ov) return;
    if(ov.classList.contains('hidden') || ov.getAttribute('aria-hidden') === 'true') return;
    ov.style.setProperty('pointer-events','auto','important');
    ov.style.setProperty('z-index','300000','important');
    ov.querySelectorAll('input,button,select,textarea').forEach(el => {
      try{
        el.disabled = false;
        el.style.setProperty('pointer-events','auto','important');
        el.style.setProperty('user-select','text','important');
      }catch(_){ }
    });
  }

  function markRefresh(on){
    document.querySelectorAll('#btnSoftRefresh,#ceBtnRefresV518').forEach(btn => {
      try{
        btn.classList.toggle('ce-refreshing', !!on);
        if(on) btn.dataset.ceRefreshing = '1'; else delete btn.dataset.ceRefreshing;
      }catch(_){ }
    });
  }

  function patchRefreshVisual(){
    if(window.__ceV5024RefreshVisual) return;
    window.__ceV5024RefreshVisual = true;
    const begin = ev => {
      if(!ev.target?.closest?.('#btnSoftRefresh,#ceBtnRefresV518')) return;
      markRefresh(true);
      setTimeout(() => markRefresh(false), 6500);
    };
    window.addEventListener('click', begin, true);
    window.addEventListener('touchend', begin, {capture:true, passive:true});
    const patchApi = () => {
      const api = window.ControlEventV5020;
      if(api && typeof api.refreshInPlace === 'function' && !api.refreshInPlace.__ceV5024Visual){
        const old = api.refreshInPlace.bind(api);
        api.refreshInPlace = function(){
          markRefresh(true);
          const done = () => setTimeout(() => markRefresh(false), 160);
          try{
            const ret = old.apply(this, arguments);
            Promise.resolve(ret).finally(done);
            return ret;
          }catch(error){ done(); throw error; }
        };
        api.refreshInPlace.__ceV5024Visual = true;
      }
    };
    patchApi();
    [300,1200,2600].forEach(ms => setTimeout(patchApi, ms));
  }

  function patchDownloads(){
    if(window.__ceV5024Downloads) return;
    window.__ceV5024Downloads = true;
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV5024VersionFile){
        const old = proto.click;
        proto.click = function(){
          try{ if(this.download) this.download = replaceVersionText(this.download); }catch(_){ }
          return old.apply(this, arguments);
        };
        proto.click.__ceV5024VersionFile = true;
      }
    }catch(_){ }
    document.addEventListener('click', ev => {
      const a = ev.target?.closest?.('a[download]');
      if(a && a.download) a.download = replaceVersionText(a.download);
    }, true);
  }

  function lightHydrateAfterEvent(){
    if(!auth() || !hasValidEvent()) return;
    try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
    try{ window.ControlEventV469?.hydrateEventReceipts?.(false); }catch(_){ }
    try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
  }

  function installHandlers(){
    if(window.__ceV5024Handlers) return;
    window.__ceV5024Handlers = true;
    document.addEventListener('change', ev => {
      if(ev.target?.id === 'selectedEvent'){
        [300,900,1800].forEach(ms => setTimeout(lightHydrateAfterEvent, ms));
      }
    }, false);
    window.addEventListener('controlevent:module-mounted', () => setTimeout(lightHydrateAfterEvent, 220));
  }

  function install(){
    injectStyle();
    applyVersionOnce();
    keepLoginWritable();
    patchRefreshVisual();
    patchDownloads();
    installHandlers();
    if(auth() && hasValidEvent()) [400,1200].forEach(ms => setTimeout(lightHydrateAfterEvent, ms));
  }

  window.ControlEventV5024 = {version:VERSION, versionFile:VERSION_FILE, install, applyVersion:applyVersionOnce, keepLoginWritable, markRefresh};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 60)));
  [250,900,2200].forEach(ms => setTimeout(install, ms));
})();
