/* ControlEvent v29.2 - LowResourceBoot
   Diagnostico visible + modo tactil/turbo para iPad/Android modestos.
   Carga antes del legacy: reduce tareas repetitivas, eventos hover y efectos visuales. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v29.2';
  const params = new URLSearchParams(location.search || '');
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
  const isAndroid = /Android/i.test(ua);
  const isIPad = /iPad/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/i.test(ua) && !isIPad;
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const memory = Number(navigator.deviceMemory || 0);
  const cores = Number(navigator.hardwareConcurrency || 0);
  const forcedOn = /^(1|true|on|si|sí)$/i.test(params.get('ceLite') || '');
  const forcedOff = /^(0|false|off|no)$/i.test(params.get('ceLite') || '');
  const diagForced = /^(1|true|on|si|sí)$/i.test(params.get('ceDiag') || '');
  const likelyLowResource = (memory && memory <= 4) || (cores && cores <= 4);
  const detected = isAndroid || isIPad || (coarse && likelyLowResource && !isIPhone);
  const enabled = forcedOn || (!forcedOff && detected);
  const showBadge = enabled || forcedOn || forcedOff || diagForced;
  const reason = forcedOn ? 'forzado-ceLite=1' : forcedOff ? 'desactivado-ceLite=0' : isAndroid ? 'Android' : isIPad ? 'iPad' : (coarse && likelyLowResource ? 'tactil-recursos-limitados' : 'equipo-normal');

  const nativeSetInterval = window.setInterval ? window.setInterval.bind(window) : null;
  const nativeSetTimeout = window.setTimeout ? window.setTimeout.bind(window) : null;
  const nativeRAF = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null;

  const stats = {
    version: VERSION,
    enabled,
    reason,
    ua,
    platform,
    maxTouchPoints,
    coarse,
    memory: memory || null,
    cores: cores || null,
    intervalsAdjusted: 0,
    timeoutsAdjusted: 0,
    rafAdjusted: 0,
    scrollIntoViewAdjusted: 0,
    suppressedListeners: {},
    createdAt: new Date().toISOString(),
    lastPanelOpen: null,
    legacyPatch: null
  };

  function interval(ms){
    const value = Number(ms || 0);
    if(!enabled || !value) return value;
    if(value >= 30000) return value;
    stats.intervalsAdjusted += 1;
    // En v29.1 se multiplicaban; en equipos antiguos seguia habiendo barridos cada pocos segundos.
    // En v29.2 los intervalos legacy repetitivos pasan a modo "vigilancia", no a modo "repintado".
    if(value <= 2500) return 45000;
    if(value <= 10000) return Math.max(45000, value * 4);
    return Math.max(30000, value);
  }

  function timeout(ms){
    const value = Number(ms || 0);
    if(!enabled || !value) return value;
    if(value >= 1000) return value;
    // Evita cascadas de retoques visuales inmediatos. No cancela tareas; solo las desapelmaza.
    const next = Math.max(value, 80);
    if(next !== value) stats.timeoutsAdjusted += 1;
    return next;
  }

  if(enabled && nativeSetInterval && !window.setInterval.__ceLowResourceWrapped){
    const wrappedSetInterval = function(handler, ms, ...args){
      return nativeSetInterval(handler, interval(ms), ...args);
    };
    wrappedSetInterval.__ceLowResourceWrapped = true;
    window.setInterval = wrappedSetInterval;
  }

  if(enabled && nativeSetTimeout && !window.setTimeout.__ceLowResourceWrapped){
    const wrappedSetTimeout = function(handler, ms, ...args){
      return nativeSetTimeout(handler, timeout(ms), ...args);
    };
    wrappedSetTimeout.__ceLowResourceWrapped = true;
    window.setTimeout = wrappedSetTimeout;
  }

  if(enabled && nativeRAF && !window.requestAnimationFrame.__ceLowResourceWrapped){
    const wrappedRAF = function(callback){
      stats.rafAdjusted += 1;
      return nativeSetTimeout(() => callback(Date.now()), 90);
    };
    wrappedRAF.__ceLowResourceWrapped = true;
    window.requestAnimationFrame = wrappedRAF;
  }

  const noisyEvents = new Set(['mousemove','mouseover','mouseenter','pointermove']);
  const nativeAdd = EventTarget.prototype.addEventListener;
  if(enabled && nativeAdd && !nativeAdd.__ceLowResourceWrapped){
    EventTarget.prototype.addEventListener = function(type, listener, options){
      try{
        const t = String(type || '');
        const targetIsGlobal = this === document || this === window || this === document.body || this === document.documentElement;
        if(targetIsGlobal && noisyEvents.has(t)){
          stats.suppressedListeners[t] = Number(stats.suppressedListeners[t] || 0) + 1;
          return;
        }
      }catch(_){ }
      return nativeAdd.call(this, type, listener, options);
    };
    EventTarget.prototype.addEventListener.__ceLowResourceWrapped = true;
  }

  try{
    const nativeScrollIntoView = Element.prototype.scrollIntoView;
    if(enabled && nativeScrollIntoView && !nativeScrollIntoView.__ceLowResourceWrapped){
      const wrappedScroll = function(options){
        try{
          if(options && typeof options === 'object' && options.behavior === 'smooth'){
            stats.scrollIntoViewAdjusted += 1;
            return nativeScrollIntoView.call(this, {...options, behavior:'auto'});
          }
        }catch(_){ }
        return nativeScrollIntoView.apply(this, arguments);
      };
      wrappedScroll.__ceLowResourceWrapped = true;
      Element.prototype.scrollIntoView = wrappedScroll;
    }
  }catch(_){ }

  function esc(value){
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function short(value, max=80){
    const text = String(value ?? '');
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }
  function getLite(){ try{return window.ControlEventMobileLite?.inspect?.() || null;}catch(_){return null;} }
  function getHotpath(){ try{return window.ControlEventHotpath?.inspect?.() || null;}catch(_){return null;} }
  function getScreenLazy(){ try{return window.ControlEventScreenLazy?.info?.() || null;}catch(_){return null;} }
  function getLegacyPatch(){ try{return window.ControlEventLowResourceLegacy?.inspect?.() || null;}catch(_){return null;} }
  function totals(object){ return Object.values(object || {}).reduce((sum, n) => sum + Number(n || 0), 0); }

  function installLowCss(){
    if(!enabled || document.getElementById('ceLowResourceCss')) return;
    try{ document.documentElement.classList.add('ce-lite-low-resource'); }catch(_){ }
    const style = document.createElement('style');
    style.id = 'ceLowResourceCss';
    style.textContent = `
      html.ce-lite-low-resource, html.ce-lite-low-resource *{scroll-behavior:auto!important;}
      html.ce-lite-low-resource *{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;}
      html.ce-lite-low-resource .card,
      html.ce-lite-low-resource .itemcard,
      html.ce-lite-low-resource .metric,
      html.ce-lite-low-resource .budget-panel,
      html.ce-lite-low-resource button,
      html.ce-lite-low-resource select,
      html.ce-lite-low-resource input{box-shadow:none!important;}
      html.ce-lite-low-resource .app-shell,
      html.ce-lite-low-resource .panel,
      html.ce-lite-low-resource .chart-row{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
      html.ce-lite-low-resource #ceLowResourceBadge{font-size:12px!important;}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function inspect(){
    const legacy = getLegacyPatch();
    stats.legacyPatch = legacy;
    return {
      ...stats,
      mobileLite: getLite(),
      hotpath: getHotpath(),
      screenLazy: getScreenLazy(),
      legacyPatch: legacy,
      commands: [
        'ControlEventLowResource.print()',
        'ControlEventLowResourceLegacy.print()',
        'ControlEventMobileLite.print()',
        'ControlEventRuntime.inspect()'
      ]
    };
  }

  function panelHtml(){
    const lite = getLite();
    const hot = getHotpath();
    const lazy = getScreenLazy();
    const legacy = getLegacyPatch();
    const wrapped = lite?.wrapped?.length || 0;
    const skipped = totals(lite?.skipped);
    const executed = totals(lite?.executed);
    const legacySkips = legacy?.skipped || {};
    const suppressed = Object.entries(stats.suppressedListeners || {}).map(([k,v]) => `${esc(k)}: ${esc(v)}`).join(' · ') || '0';
    const hotRows = Array.isArray(hot?.rows) ? hot.rows.slice(0, 6) : [];
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px">
        <strong>Diagnóstico móvil ${esc(VERSION)}</strong>
        <button type="button" data-ce-lite-close style="border:0;border-radius:10px;padding:6px 9px;background:#111827;color:white">Cerrar</button>
      </div>
      <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:12px;padding:8px;margin-bottom:10px;font-size:13px">
        <b>Lectura rápida:</b> el número verde no es velocidad; indica <b>renders ocultos evitados</b>. En v29.2 también se recorta el render general legacy.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
        <div><b>LowResource</b><br>${enabled ? 'ACTIVO' : 'NO activo'}<br><small>${esc(reason)}</small></div>
        <div><b>MobileLite</b><br>${lite?.installed ? 'INSTALADO' : 'No instalado'} / ${lite?.enabled ? 'ON' : 'OFF'}<br><small>envueltas: ${wrapped}</small></div>
        <div><b>Render visible-only</b><br>ejecutados: ${executed}<br>ocultos evitados: ${skipped}</div>
        <div><b>Legacy Turbo v29.2</b><br>${legacy?.installed ? 'ACTIVO' : 'no instalado'}<br><small>render ligero: ${esc(legacy?.liteRenderCalls || 0)}</small></div>
        <div><b>Saltos legacy</b><br>budget: ${esc(legacySkips.budget || 0)} · gráficas: ${esc(legacySkips.graficas || 0)} · mant.: ${esc(legacySkips.maintenance || 0)}</div>
        <div><b>Tab actual</b><br>${esc(lite?.currentTab || legacy?.currentTab || lazy?.current || 'sin dato')}<br><small>pantallas cargadas: ${esc((lazy?.loadedScreens || []).join(', ') || '—')}</small></div>
        <div><b>Intervalos rebajados</b><br>${esc(stats.intervalsAdjusted)}<br><small>los barridos cortos pasan a ~45 s</small></div>
        <div><b>Eventos hover anulados</b><br>${suppressed}</div>
        <div><b>Timeout/RAF suavizados</b><br>${esc(stats.timeoutsAdjusted)} / ${esc(stats.rafAdjusted)}</div>
        <div><b>Scroll suave evitado</b><br>${esc(stats.scrollIntoViewAdjusted)}</div>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(15,23,42,.18)">
        <b>Última acción MobileLite</b><br><small>${esc(short(JSON.stringify(lite?.last || null), 240))}</small>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(15,23,42,.18)">
        <b>Cache Hotpath</b><br><small>${hot ? `cache: ${esc(hot.cacheSize)} · funciones: ${esc((hot.cachedFunctions||[]).length)} · invalidaciones: ${esc((hot.invalidations||[]).length)}` : 'sin dato'}</small>
        ${hotRows.length ? `<table style="width:100%;font-size:12px;margin-top:6px;border-collapse:collapse"><tr><th style="text-align:left">Función</th><th>Hits</th><th>Ms</th></tr>${hotRows.map(row => `<tr><td style="border-top:1px solid #e5e7eb">${esc(row.name)}</td><td style="text-align:center;border-top:1px solid #e5e7eb">${esc(row.hits)}</td><td style="text-align:center;border-top:1px solid #e5e7eb">${esc(row.totalMs)}</td></tr>`).join('')}</table>` : ''}
      </div>
      <div style="margin-top:10px;font-size:12px;color:#4b5563">Pruebas: <b>?ceLite=1</b> fuerza el modo ligero. <b>?ceLite=0</b> lo desactiva. <b>?ceDiag=1</b> muestra el botón aunque no esté activo.</div>
    `;
  }

  function ensureUi(){
    installLowCss();
    if(!showBadge) return;
    if(document.getElementById('ceLowResourceBadge')) return;
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.id = 'ceLowResourceBadge';
    badge.textContent = enabled ? '⚡ LITE ON' : '⚡ LITE OFF';
    badge.title = 'Ver diagnóstico de rendimiento móvil';
    badge.style.cssText = 'position:fixed;right:10px;bottom:72px;z-index:3000;border:0;border-radius:999px;padding:8px 11px;font:700 12px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 22px rgba(15,23,42,.25);background:' + (enabled ? '#16a34a' : '#6b7280') + ';color:white;opacity:.92';
    badge.addEventListener('click', () => openPanel(), true);
    document.body.appendChild(badge);
  }

  function openPanel(){
    stats.lastPanelOpen = new Date().toISOString();
    let panel = document.getElementById('ceLowResourcePanel');
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'ceLowResourcePanel';
      panel.style.cssText = 'position:fixed;left:10px;right:10px;bottom:118px;z-index:3001;max-height:68vh;overflow:auto;background:white;color:#111827;border:1px solid rgba(15,23,42,.18);border-radius:18px;padding:14px;box-shadow:0 22px 60px rgba(15,23,42,.32);font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.35';
      panel.addEventListener('click', ev => { if(ev.target?.closest?.('[data-ce-lite-close]')) closePanel(); }, true);
      document.body.appendChild(panel);
    }
    panel.innerHTML = panelHtml();
    panel.style.display = 'block';
  }
  function closePanel(){ const panel = document.getElementById('ceLowResourcePanel'); if(panel) panel.style.display = 'none'; }
  function refreshUi(){
    const badge = document.getElementById('ceLowResourceBadge');
    if(badge){
      const lite = getLite();
      const skipped = totals(lite?.skipped);
      const legacy = getLegacyPatch();
      badge.textContent = enabled ? `⚡ LITE ON · ocultos ${skipped || 0}${legacy?.installed ? ' · turbo' : ''}` : '⚡ LITE OFF';
    }
    const panel = document.getElementById('ceLowResourcePanel');
    if(panel && panel.style.display !== 'none') panel.innerHTML = panelHtml();
  }
  function print(){
    const report = inspect();
    console.group(`[ControlEventLowResource/${VERSION}]`);
    console.info(report);
    console.groupEnd();
    return report;
  }
  window.ControlEventLowResource = {version:VERSION, enabled, isLite:enabled, reason, stats, interval, timeout, inspect, print, ensureUi, openPanel, closePanel, refreshUi};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { ensureUi(); if(nativeSetInterval) nativeSetInterval(refreshUi, 2500); }, {once:true});
  else { ensureUi(); if(nativeSetInterval) nativeSetInterval(refreshUi, 2500); }
})();
